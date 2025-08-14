import React, { useEffect, useState, Suspense } from "react";
import { HubNavigation } from "@/components/HubNavigation";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedUserId } from "@/lib/authHelper";
import { EnhancedPivotAdvisor } from "@/components/EnhancedPivotAdvisor";
import { EnhancedErrorBoundary } from "@/components/enhanced/EnhancedErrorBoundary";

const CareerTransitionSimulatorLazy = React.lazy(() =>
  import("@/components/CareerTransitionSimulator").then(m => ({ default: m.CareerTransitionSimulator }))
);
const CRIROIPanelLazy = React.lazy(() =>
  import("@/components/CRIROIPanel").then(m => ({ default: m.CRIROIPanel }))
);
const SkillGapTrackerLazy = React.lazy(() =>
  import("@/components/SkillGapTracker").then(m => ({ default: m.SkillGapTracker }))
);
const MayaNextStepsLazy = React.lazy(() =>
  import("@/components/MayaNextSteps").then(m => ({ default: m.MayaNextSteps }))
);
const LinkedInImportDemoLazy = React.lazy(() =>
  import("@/components/LinkedInImportDemo").then(m => ({ default: m.LinkedInImportDemo }))
);
export default function CareerCopilot() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const applyFallback = async () => {
      try {
        const devId = await getAuthenticatedUserId();
        if (devId) setUserId(devId);
      } catch {
        // ignore
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      if (!id) applyFallback();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      if (!id) applyFallback();
    });

    // Initial fallback in case there's no Supabase session (dev mode)
    applyFallback();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Career Co-Pilot | Smart Career Hub</title>
        <meta name="description" content="Transition simulator, pivot advisor, CRI/ROI, skill gaps, and Maya next steps in one hub." />
        <link rel="canonical" href="/career-copilot" />
      </Helmet>

      <HubNavigation />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-semibold">Career Co-Pilot</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <section className="space-y-6">
            <EnhancedErrorBoundary>
              {userId ? (
                <Suspense fallback={<div>Loading simulator...</div>}>
                  <CareerTransitionSimulatorLazy userId={userId} />
                </Suspense>
              ) : (
                <div>Please sign in to simulate transitions.</div>
              )}
            </EnhancedErrorBoundary>

            <EnhancedErrorBoundary>
              <h2 className="text-lg font-medium">Smart Pivot Advisor</h2>
              {userId ? (
                <EnhancedPivotAdvisor userId={userId} />
              ) : (
                <div>Sign in to see personalized pivot suggestions.</div>
              )}
            </EnhancedErrorBoundary>
          </section>

          {/* Right column */}
          <section className="space-y-6">
            <EnhancedErrorBoundary>
              <Suspense fallback={<div>Loading CRI & ROI...</div>}>
                <CRIROIPanelLazy userId={userId ?? undefined} />
              </Suspense>
            </EnhancedErrorBoundary>

            <EnhancedErrorBoundary>
              <Suspense fallback={<div>Loading skill gaps...</div>}>
                <SkillGapTrackerLazy userId={userId ?? undefined} />
              </Suspense>
            </EnhancedErrorBoundary>
          </section>
        </div>

        {/* Footer full-width */}
        <EnhancedErrorBoundary>
          <Suspense fallback={<div>Loading next steps...</div>}>
            <MayaNextStepsLazy userId={userId ?? undefined} />
          </Suspense>
        </EnhancedErrorBoundary>

        <EnhancedErrorBoundary>
          <Suspense fallback={<div>Loading LinkedIn Import...</div>}>
            <LinkedInImportDemoLazy />
          </Suspense>
        </EnhancedErrorBoundary>
      </main>
    </>
  );
}
