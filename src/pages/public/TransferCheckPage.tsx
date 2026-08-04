/**
 * TransferCheckPage — public "will my credits transfer?" lookup.
 *
 * The reverse-direction entry point for two personas:
 *  - "I have unused credits and want to find a degree I can actually finish."
 *  - "I'm switching majors/schools — what carries over?"
 *
 * Looks up verified rows in credit_transfer_rules by source (provider or
 * institution) and shows what counts at each verified anchor school, with
 * evidence links and last-verified dates. Ends in the Get Started funnel.
 * Public + indexable: this is also our GradFaster-style lookup surface, aimed
 * at the alt-credit queries they don't serve.
 */
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Search, ShieldCheck, ExternalLink, Loader2, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logEvent } from '@/lib/analytics';
import { VERIFIED_SCHOOL_CODES } from '@/lib/planScoring/config';

interface RuleRow {
  id: string;
  source_institution: string | null;
  source_course_code: string | null;
  target_institution: string | null;
  target_course_code: string | null;
  acceptance_status: string | null;
  confidence: number | null;
  evidence_url: string | null;
  last_verified_at?: string | null;
}

const SCHOOL_NAMES: Record<string, string> = {
  TESU: 'Thomas Edison State University',
  COSC: 'Charter Oak State College',
  WGU: 'Western Governors University',
};

export default function TransferCheckPage() {
  const [source, setSource] = useState('');
  const [course, setCourse] = useState('');
  const [rows, setRows] = useState<RuleRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const src = source.trim();
    if (!src) return;
    setLoading(true);
    setError(null);
    logEvent('transfer_check_search', { source: src, course: course.trim() || null });
    try {
      let q = (supabase as any)
        .from('credit_transfer_rules')
        .select('id, source_institution, source_course_code, target_institution, target_course_code, acceptance_status, confidence, evidence_url, last_verified_at')
        .eq('is_active', true)
        .ilike('source_institution', `%${src}%`)
        .in('target_institution', [...VERIFIED_SCHOOL_CODES])
        .limit(120);
      const courseFilter = course.trim();
      if (courseFilter) {
        q = q.ilike('source_course_code', `%${courseFilter}%`);
      }
      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      setRows((data ?? []) as RuleRow[]);
    } catch (err) {
      console.error('[TransferCheck] lookup failed', err);
      setError('Could not run the lookup. Please try again in a moment.');
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  const bySchool = new Map<string, RuleRow[]>();
  for (const r of rows ?? []) {
    const key = (r.target_institution ?? 'OTHER').toUpperCase();
    if (!bySchool.has(key)) bySchool.set(key, []);
    bySchool.get(key)!.push(r);
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Will My Credits Transfer? Free Checker | Pivot</title>
        <meta
          name="description"
          content="Check where your existing credits — Sophia, Study.com, CLEP, or college courses — actually transfer. Verified rules with source links for TESU, Charter Oak, and WGU."
        />
        <link rel="canonical" href="https://pivot.app/transfer-check" />
      </Helmet>

      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            Free transfer checker
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Will your credits actually transfer?
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Sitting on credits from a provider or a school you left? Switching majors?
            Look up verified transfer rules — with the source document for every rule —
            before you spend another dollar.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={runSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tc-source">Where are your credits from?</Label>
                <Input
                  id="tc-source"
                  placeholder="e.g. Sophia, Study.com, CLEP…"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tc-course">Course code (optional)</Label>
                <Input
                  id="tc-course"
                  placeholder="e.g. ENG1001, BUS-101"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading || !source.trim()} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Check transfer rules
            </Button>
          </form>
        </Card>

        {error && (
          <Card className="p-4 border-destructive/40 text-sm text-destructive">{error}</Card>
        )}

        {rows !== null && !error && (
          <div className="space-y-4">
            {rows.length === 0 ? (
              <Card className="p-6 text-center space-y-3">
                <p className="font-medium">No verified rules matched that search.</p>
                <p className="text-sm text-muted-foreground">
                  We only show rules we've verified against source documents — a miss here
                  doesn't mean your credits won't transfer. Run the full check to see how
                  your credits fit at each school.
                </p>
                <Button asChild variant="outline">
                  <Link to="/get-started">
                    Run the full credit check
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            ) : (
              <>
                {[...bySchool.entries()].map(([school, schoolRows]) => (
                  <Card key={school} className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold">
                        {SCHOOL_NAMES[school] ?? school}
                      </h2>
                      <Badge variant="secondary">{schoolRows.length} verified rule{schoolRows.length === 1 ? '' : 's'}</Badge>
                    </div>
                    <div className="divide-y divide-border/60">
                      {schoolRows.slice(0, 15).map((r) => (
                        <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <span className="font-medium">{r.source_course_code ?? '—'}</span>
                            <span className="text-muted-foreground"> → {r.target_course_code ?? 'accepted'}</span>
                            {r.acceptance_status && (
                              <span className="ml-2 text-xs text-muted-foreground">({r.acceptance_status})</span>
                            )}
                          </div>
                          {r.evidence_url && (
                            <a
                              href={r.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              source
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                      {schoolRows.length > 15 && (
                        <p className="pt-2 text-xs text-muted-foreground">
                          + {schoolRows.length - 15} more rules
                        </p>
                      )}
                    </div>
                  </Card>
                ))}

                <Card className="p-6 bg-primary/5 border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">Now see the full picture.</p>
                    <p className="text-sm text-muted-foreground">
                      Tell us everything you have and we'll show the cheapest way to finish
                      a degree with it — across all {VERIFIED_SCHOOL_CODES.length} verified schools.
                    </p>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link to="/get-started">
                      Find my fastest finish
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </Card>
              </>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Rules reflect published policies at the time we verified them. Final transfer
          decisions are always made by the receiving institution — confirm with an
          admissions advisor before enrolling or purchasing courses.
        </p>
      </div>
    </div>
  );
}
