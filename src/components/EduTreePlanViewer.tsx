import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { transformOptimizedPlanToPlanBasket } from '@/lib/eduTree/transformOptimizedPlan';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import { TemplateSwitchBar } from '@/features/eduTree/TemplateSwitchBar';
import type { OptimizedPlanResult } from '@/types/optimizer';
import { formatCost, formatCredits } from '@/pages/EduTree/v5/utils/formatters';

export function EduTreePlanViewer() {
  const location = useLocation() as {
    state?: { optimizedPlan?: OptimizedPlanResult };
  };

  const optimizedPlan = location.state?.optimizedPlan;
  const loadFromBasket = usePlanBasket(s => s.loadFromBasket);
  const currentBasket = usePlanBasket(s => s.currentBasket);

  useEffect(() => {
    if (optimizedPlan) {
      const basket = transformOptimizedPlanToPlanBasket(optimizedPlan);
      loadFromBasket(basket);
    }
  }, [optimizedPlan, loadFromBasket]);

  const planBasket = currentBasket || (optimizedPlan ? transformOptimizedPlanToPlanBasket(optimizedPlan) : null);

  if (!planBasket) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <h2 className="text-2xl font-semibold text-foreground">No Plan Selected</h2>
          <p className="text-muted-foreground">
            Select a template from the marketplace to view your optimized degree plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-6 p-6">
      <TemplateSwitchBar
        institutionCode={planBasket.institutionCode}
        programCode={planBasket.programCode}
        currentTrackType={planBasket.trackType as any}
        currentMode={planBasket.mode as any}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          {planBasket.institutionCode} {planBasket.programCode} — {planBasket.mode}
        </h1>
        <p className="text-muted-foreground">
          Optimized degree plan with {planBasket.totalCredits} total credits
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Cost</div>
          <div className="text-2xl font-bold text-foreground">
            {formatCost(planBasket.estTotalCostUsd)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Credits</div>
          <div className="text-2xl font-bold text-foreground">
            {formatCredits(planBasket.totalCredits)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Alt Credits</div>
          <div className="text-2xl font-bold text-foreground">
            {formatCredits(planBasket.totalAltCredits)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Residency Credits</div>
          <div className="text-2xl font-bold text-foreground">
            {formatCredits(planBasket.totalInstitutionalCredits)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Term Plan</h2>
        <div className="space-y-6">
          {planBasket.terms.map((term) => (
            <div
              key={term.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{term.label}</h3>
                <span className="text-sm text-muted-foreground">
                  {formatCredits(term.totalCredits)}
                </span>
              </div>
              <div className="space-y-2">
                {term.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded border border-border bg-background/50 p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {course.courseCode || course.altIdentifier || 'Unknown Course'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {course.sourceType === 'alt_credit' ? (
                          <>
                            {course.sourceCode} • {course.requirementArea}
                          </>
                        ) : (
                          <>Institutional • {course.requirementArea}</>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {formatCredits(course.credits)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EduTreePlanViewer;
