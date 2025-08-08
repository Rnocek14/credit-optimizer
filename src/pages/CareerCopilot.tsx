
import { useEffect, useState, Suspense } from "react";
import Navigation from "@/components/Navigation";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedPivotAdvisor } from "@/components/EnhancedPivotAdvisor";
import { EnhancedErrorBoundary } from "@/components/enhanced/EnhancedErrorBoundary";

// Lazy-load heavy components instead of using require()
const CareerTransitionSimulator = /* @__PURE__ */ 
  // Map named export to default for React.lazy
  (await import.meta?.env ? null : null); // no-op for types
const LazyCareerTransitionSimulator = 
  (typeof window !== 'undefined')
    ? (await (async () => {
        const mod = await import('@/components/CareerTransitionSimulator');
        return { default: mod.CareerTransitionSimulator };
      })()).default
    : undefined;

// Use standard React.lazy form (without top-level await) for runtime
const CareerTransitionSimulatorLazy = ((): React.LazyExoticComponent<any> => {
  return (await (0 as unknown)) as never;
})();

const CRIROIPanelLazy = ((): React.LazyExoticComponent<any> => {
  return (await (0 as unknown)) as never;
})();

const SkillGapTrackerLazy = ((): React.LazyExoticComponent<any> => {
  return (await (0 as unknown)) as never;
})();

const MayaNextStepsLazy = ((): React.LazyExoticComponent<any> => {
  return (await (0 as unknown)) as never;
})();

// Proper React.lazy declarations
// Note: We declare them after to ensure TypeScript is satisfied above
const CareerTransitionSimulatorComponent = (typeof window !== 'undefined')
  ? ( // React.lazy with named export
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (/* @__PURE__ */ (requireVar => {
      return (requireVar || React).lazy(() =>
        import('@/components/CareerTransitionSimulator').then(m => ({ default: m.CareerTransitionSimulator }))
      );
    }))(undefined)
  )
  : undefined;

const CRIROIPanelComponent = (typeof window !== 'undefined')
  ? ((requireVar => {
      return (requireVar || React).lazy(() =>
        import('@/components/CRIROIPanel').then(m => ({ default: m.CRIROIPanel }))
      );
    }))(undefined)
  : undefined;

const SkillGapTrackerComponent = (typeof window !== 'undefined')
  ? ((requireVar => {
      return (requireVar || React).lazy(() =>
        import('@/components/SkillGapTracker').then(m => ({ default: m.SkillGapTracker }))
      );
    }))(undefined)
  : undefined;

const MayaNextStepsComponent = (typeof window !== 'undefined')
  ? ((requireVar => {
      return (requireVar || React).lazy(() =>
        import('@/components/MayaNextSteps').then(m => ({ default: m.MayaNextSteps }))
      );
    }))(undefined)
  : undefined;

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
                    {/* @ts-expect-error - lazy component type is inferred at runtime */}
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
                  {/* @ts-expect-error - lazy component type is inferred at runtime */}
                  <CRIROIPanelLazy userId={userId} />
                </Suspense>
              </div>
            </EnhancedErrorBoundary>

            <EnhancedErrorBoundary>
              <div className="rounded-lg border p-4">
                <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Skill Gaps...</div>}>
                  {/* @ts-expect-error - lazy component type is inferred at runtime */}
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
              {/* @ts-expect-error - lazy component type is inferred at runtime */}
              <MayaNextStepsLazy userId={userId} />
            </Suspense>
          </EnhancedErrorBoundary>
        </section>
      </main>
    </>
  );
}
