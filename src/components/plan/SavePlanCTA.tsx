/**
 * SavePlanCTA — closer on /plan/preview/:templateId
 *
 * Day-2 "demolition-in-place" funnel closer.
 *  - Captures the visitor's email into `lead_captures` (RLS: anon insert OK).
 *  - Fires a magic-link back to the EXACT preview URL so the user lands
 *    on the same plan when they return.
 *  - Surfaces a trust line built from the institution policy pack's
 *    `last_verified_at` + `evidence_url` so the email ask is grounded.
 *  - Logs `email_captured` analytics.
 *
 * No new routes, no new auth pages, no new AI.
 */
import { useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Mail, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logEvent } from '@/lib/analytics';
import { toast } from 'sonner';

const emailSchema = z.string().trim().email().max(254);

interface SavePlanCTAProps {
  templateId: string;
  careerId?: string | null;
}

interface TrustInfo {
  lastVerifiedAt: string | null;
  evidenceUrl: string | null;
  institutionCode: string | null;
}

async function fetchTrustInfo(templateId: string): Promise<TrustInfo> {
  // templateId comes from degree_templates (program_templates is an unrelated
  // AI-generation table — the old lookup always returned null, so the trust
  // line never rendered).
  const { data: tpl } = await supabase
    .from('degree_templates')
    .select('institution_code')
    .eq('id', templateId)
    .maybeSingle();

  const institutionCode = tpl?.institution_code ?? null;
  if (!institutionCode) {
    return { lastVerifiedAt: null, evidenceUrl: null, institutionCode: null };
  }

  // Most-recent verified policy pack for this institution.
  const packRes: any = await (supabase as any)
    .from('institution_policy_packs_live')
    .select('last_verified_at')
    .eq('institution_code', institutionCode)
    .order('last_verified_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  // Best evidence URL: most-recent transfer rule for this institution.
  const ruleRes: any = await (supabase as any)
    .from('active_transfer_rules')
    .select('evidence_url, last_verified_at')
    .eq('target_institution_code', institutionCode)
    .not('evidence_url', 'is', null)
    .order('last_verified_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return {
    lastVerifiedAt: packRes?.data?.last_verified_at ?? ruleRes?.data?.last_verified_at ?? null,
    evidenceUrl: ruleRes?.data?.evidence_url ?? null,
    institutionCode,
  };
}

function formatVerified(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function SavePlanCTA({ templateId, careerId }: SavePlanCTAProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: trust } = useQuery({
    queryKey: ['plan-preview-trust', templateId],
    queryFn: () => fetchTrustInfo(templateId),
    staleTime: 5 * 60 * 1000,
  });

  const verifiedLabel = formatVerified(trust?.lastVerifiedAt ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    const cleanEmail = parsed.data.toLowerCase();
    const redirectUrl = window.location.href;

    try {
      // 1. Lead capture — anon insert allowed by RLS.
      const { error: leadError } = await supabase.from('lead_captures').insert({
        email: cleanEmail,
        template_id: templateId,
        career_id: careerId ?? null,
        source: 'plan_preview',
        referrer: document.referrer || null,
        user_agent: navigator.userAgent.slice(0, 500),
        metadata: { preview_url: redirectUrl },
      });

      if (leadError) {
        // Non-fatal — still try magic link.
        console.warn('[SavePlanCTA] lead_captures insert failed', leadError);
      }

      // 2. Magic link back to the same preview URL.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        },
      });

      if (otpError) throw otpError;

      logEvent('email_captured', {
        template_id: templateId,
        career_id: careerId ?? null,
        source: 'plan_preview',
      });

      setSubmitted(true);
      toast.success('Check your inbox — we just sent you a link to save this plan.');
    } catch (err) {
      console.error('[SavePlanCTA] submit failed', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 md:p-8 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight">Plan saved.</h3>
            <p className="text-sm text-muted-foreground">
              We sent a link to <span className="font-medium text-foreground">{email}</span>.
              Click it and you'll come right back to this plan — ready to lock in.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card id="save-plan-cta" className="p-6 md:p-8 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-primary/20">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <Badge variant="secondary" className="self-start gap-1.5">
            <Mail className="h-3 w-3" />
            Save this plan
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Don't lose this path.
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Enter your email — we'll send a one-click link back to this exact plan
            so you can come back, share it, and lock it in when you're ready.
            No password, no spam.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="save-plan-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="save-plan-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || !email}
            className="gap-2 sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>Send me my plan</>
            )}
          </Button>
        </form>

        {(verifiedLabel || trust?.evidenceUrl) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {verifiedLabel && (
              <span>
                Transfer rules verified <span className="font-medium text-foreground">{verifiedLabel}</span>
                {trust?.institutionCode ? ` · ${trust.institutionCode}` : ''}
              </span>
            )}
            {trust?.evidenceUrl && (
              <a
                href={trust.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline hover:text-foreground"
              >
                View source
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
