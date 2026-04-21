/**
 * GetStartedPage v2 — single-step "Credit Rescue" entry point.
 *
 * The job here is no longer "pick a career and a goal". It's:
 *   "Tell me what credits you already have → route into a personalized /compare."
 *
 * SEO attribution and funnel events are preserved (get_started_started /
 * get_started_completed) and tagged with the source slug so we can still
 * measure which public guides convert into real sessions.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CreditsStep, type CreditsStepResult } from './steps/CreditsStep';
import { useActivePlan } from '@/hooks/useActivePlan';
import {
  useCaptureGuideAttribution,
  readGuideAttribution,
} from '@/hooks/useGuideAttribution';
import { logEvent } from '@/lib/analytics';
import { CREDIT_SOURCE_META, type CreditSource } from '@/pages/Compare/types';
import { GraduationCap } from 'lucide-react';

export default function GetStartedPage() {
  const navigate = useNavigate();
  const { data: activePlan, isLoading: planLoading } = useActivePlan();

  // Persist ?ref / ?slug from URL into sessionStorage on mount.
  useCaptureGuideAttribution();

  // Fire funnel-start event exactly once per session.
  const startedFiredRef = useRef(false);
  useEffect(() => {
    if (startedFiredRef.current) return;
    startedFiredRef.current = true;
    const attr = readGuideAttribution();
    logEvent('get_started_started', {
      ref: attr.ref,
      slug: attr.slug,
    });
  }, []);

  const handleContinue = useCallback(
    (result: CreditsStepResult) => {
      const attr = readGuideAttribution();
      logEvent('get_started_completed', {
        priorCredits: result.priorCredits,
        providerCount: result.providers.length,
        ref: attr.ref,
        slug: attr.slug,
      });

      // Build /compare URL with the seeded picker state.
      const sp = new URLSearchParams();
      for (const src of Object.keys(result.picker) as CreditSource[]) {
        const v = result.picker[src];
        if (v > 0) sp.set(CREDIT_SOURCE_META[src].urlKey, String(v));
      }
      // Pass the headline-relevant total even when no alt-credit chips were picked.
      if (result.priorCredits > 0) sp.set('prior', String(result.priorCredits));

      const qs = sp.toString();
      navigate(`/compare${qs ? `?${qs}` : ''}`);
    },
    [navigate]
  );

  // All hooks above — conditional returns below
  if (!planLoading && activePlan) {
    return <Navigate to="/today" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Get Started – Find Your Best Degree Path | Pivot</title>
        <meta
          name="description"
          content="Tell us what credits you have. We'll show the schools where they go furthest."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Pivot</span>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 sm:py-16 max-w-4xl">
          <CreditsStep onContinue={handleContinue} />
        </main>
      </div>
    </>
  );
}
