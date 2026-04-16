/**
 * ComparePage — Phase 3 hybrid (table on desktop, cards on mobile) comparison
 * across the 5 verified schools. Re-ranks live as the user adjusts the credit
 * picker or the goal toggle. State syncs to ?query for shareability + refresh.
 */
import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Scale } from 'lucide-react';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import { VERIFIED_SCHOOL_CODES } from '@/lib/planScoring/config';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreditPicker } from './components/CreditPicker';
import { CompareTable } from './components/CompareTable';
import { CompareCards } from './components/CompareCards';
import { GoalToggle } from './components/GoalToggle';
import { useCompareUrlState, isPickerActive } from './hooks/useCompareUrlState';
import { buildCompareRows } from './buildCompareRows';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';

const VERIFIED_SET = new Set<string>(VERIFIED_SCHOOL_CODES);

export default function ComparePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { state, setGoal, setPicker } = useCompareUrlState();

  const { data: allTemplates = [], isLoading } = useMarketplaceTemplates();

  // Filter to one template per verified school, biased toward the locked career.
  const schoolTemplates = useMemo<MarketplaceDegreeTemplate[]>(() => {
    if (allTemplates.length === 0) return [];
    const verified = allTemplates.filter((t) =>
      VERIFIED_SET.has((t.anchorSchool || '').toUpperCase())
    );

    // For each school, pick the best matching template (career match > standard track > first)
    const bySchool = new Map<string, MarketplaceDegreeTemplate>();
    for (const t of verified) {
      const code = (t.anchorSchool || '').toUpperCase();
      const existing = bySchool.get(code);
      if (!existing) {
        bySchool.set(code, t);
        continue;
      }
      const matchesCareer = state.careerId
        ? t.primaryCareerIds?.includes(state.careerId)
        : false;
      const existingMatches = state.careerId
        ? existing.primaryCareerIds?.includes(state.careerId)
        : false;
      if (matchesCareer && !existingMatches) bySchool.set(code, t);
    }
    return Array.from(bySchool.values());
  }, [allTemplates, state.careerId]);

  const rows = useMemo(
    () => buildCompareRows(schoolTemplates, state.picker, state.goal),
    [schoolTemplates, state.picker, state.goal]
  );

  const personalized = isPickerActive(state.picker);

  return (
    <>
      <Helmet>
        <title>Compare Degree Plans | Pivot</title>
        <meta
          name="description"
          content="Side-by-side comparison of 5 verified universities — cost, time, and personalized transfer fit."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/get-started')}
            className="gap-1.5 -ml-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to your top 3
          </Button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-primary">
                <Scale className="h-4 w-4" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Compare 5 verified schools
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Side-by-side
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                {personalized
                  ? "Ranked using the credits you've claimed below. Adjust either to see the order shift in real time."
                  : 'Add your existing credits below to personalize transfer fit, or switch how schools are ranked.'}
              </p>
            </div>
            <GoalToggle value={state.goal} onChange={setGoal} />
          </div>
        </div>

        {/* Picker */}
        <CreditPicker state={state.picker} onChange={setPicker} />

        {/* Comparison surface */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 space-y-3 border rounded-xl bg-card">
            <p className="text-muted-foreground">
              No verified school templates loaded yet.
            </p>
            <Button variant="outline" onClick={() => navigate('/edu-tree-v5/marketplace')}>
              Browse full marketplace
            </Button>
          </div>
        ) : isMobile ? (
          <CompareCards rows={rows} picker={state.picker} />
        ) : (
          <CompareTable rows={rows} picker={state.picker} />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Costs &amp; timelines from verified institutional catalogs and active provider pricing packs.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/edu-tree-v5/marketplace')}
            className="gap-1.5 text-muted-foreground"
          >
            See full marketplace
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
