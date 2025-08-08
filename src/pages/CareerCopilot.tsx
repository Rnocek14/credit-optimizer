
import React, { useEffect, useState, Suspense } from "react";
import Navigation from "@/components/Navigation";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedPivotAdvisor } from "@/components/EnhancedPivotAdvisor";
import { EnhancedErrorBoundary } from "@/components/enhanced/EnhancedErrorBoundary";

// Proper React.lazy declarations for lazy-loaded components
const CareerTransitionSimulatorLazy = React.lazy(() =>
  import('@/components/CareerTransitionSimulator').then(m => ({ default: m.CareerTransitionSimulator }))
);

const CRIROIPanelLazy = React.lazy(() =>
  import('@/components/CRIROIPanel').then(m => ({ default: m.CRIROIPanel }))
);

const SkillGapTrackerLazy = React.lazy(() =>
  import('@/components/SkillGapTracker').then(m => ({ default: m.SkillGapTracker }))
);

const MayaNextStepsLazy = React.lazy(() =>
  import('@/components/MayaNextSteps').then(m => ({ default: m.MayaNextSteps }))
);

export default function CareerCopilot() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    loadUser();
  }, []);

  return (
    <>
      <Helmet>
        <title>Career Co-Pilot | Smart Career Hub</title>
        <meta name="description" content="Career Co-Pilot hub with Maya AI chat, pivot advisor, and personalized guidance." />
        <link rel="canonical" href="/career-copilot" />
      </Helmet>
      <Navigation />
      <main className="min-h-screen bg-background">
        <header className="container mx-auto px-4 pt-8">
          <h1 className="text-2xl font-bold">Career Co-Pilot</h1>
        </header>
        <section className="container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
          <article className="lg:col-span-2 space-y-6">
            {/* Transition Simulator */}
            <div className="rounded-lg border p-0">
              <EnhancedErrorBoundary>
                {userId ? (
                  <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading simulator...</div>}>
                    <CareerTransitionSimulatorLazy userId={userId} />
                  </Suspense>
                ) : (
                  <div className="p-6 text-sm text-muted-foreground">Please sign in to simulate transitions.</div>
                )}
              </EnhancedErrorBoundary>
            </div>

            {/* Smart Pivot Advisor */}
            <div className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-3">Smart Pivot Advisor</h2>
              <EnhancedErrorBoundary>
                {userId ? (
                  <EnhancedPivotAdvisor userId={userId} onViewComparison={() => {}} />
                ) : (
                  <div className="text-sm text-muted-foreground">Sign in to see personalized pivot suggestions.</div>
                )}
              </EnhancedErrorBoundary>
            </div>
          </article>

          <aside className="lg:col-span-1 space-y-6">
            <EnhancedErrorBoundary>
              <div className="rounded-lg border p-4">
                <Suspense fallback={<div className="text-sm text-muted-foreground">Loading CRI ROI...</div>}>
                  <CRIROIPanelLazy userId={userId} />
                </Suspense>
              </div>
            </EnhancedErrorBoundary>

            <EnhancedErrorBoundary>
              <div className="rounded-lg border p-4">
                <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Skill Gaps...</div>}>
                  <SkillGapTrackerLazy userId={userId} />
                </Suspense>
              </div>
            </EnhancedErrorBoundary>
          </aside>
        </section>

        {/* Footer full-width */}
        <section className="container mx-auto px-4 pb-10">
          <EnhancedErrorBoundary>
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading next steps...</div>}>
              <MayaNextStepsLazy userId={userId} />
            </Suspense>
          </EnhancedErrorBoundary>
        </section>
      </main>
    </>
  );
}
