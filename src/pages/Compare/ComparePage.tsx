/**
 * ComparePage — Phase 3 hybrid (table on desktop, cards on mobile) comparison
 * across the 5 verified schools. Re-ranks live as the user adjusts the credit
 * picker or the goal toggle. State syncs to ?query for shareability + refresh.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import { VERIFIED_SCHOOL_CODES } from '@/lib/planScoring/config';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreditPickerCollapsible } from './components/CreditPickerCollapsible';
import { CompareTable } from './components/CompareTable';
import { CompareCards } from './components/CompareCards';
import { GoalToggle } from './components/GoalToggle';
import { CompareHeadline } from './components/CompareHeadline';
import { BestFitReasons } from './components/BestFitReasons';
import { ShareCompareButton } from './components/ShareCompareButton';
import { useCompareUrlState, isPickerActive } from './hooks/useCompareUrlState';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { buildCompareRows } from './buildCompareRows';
import { buildCompareHeadline, buildBestFitReasons } from './compareInsights';
import {
  trackCompareViewed,
  trackCompareGoalChanged,
  trackComparePickerChanged,
  trackCompareRankingsUpdated,
  trackCompareViewPlanClicked,
} from './analytics';
import {
  CREDIT_SOURCES,
  totalPickerCredits,
  type CreditPickerState,
  type CreditSource,
} from './types';
import type { GoalPreference } from '@/hooks/useQuickPlanGeneration';
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

  const headline = useMemo(
    () => buildCompareHeadline(rows, state.goal, personalized),
    [rows, state.goal, personalized]
  );

  const reasons = useMemo(
    () => buildBestFitReasons(rows, personalized),
    [rows, personalized]
  );

  // ─────────────────────── analytics ───────────────────────

  // 1. compare_viewed — fire once per page load, after rows resolve.
  const viewedFiredRef = useRef(false);
  useEffect(() => {
    if (viewedFiredRef.current) return;
    if (isLoading) return;
    if (rows.length === 0) return;
    viewedFiredRef.current = true;
    const source = document.referrer.includes('/get-started') ? 'get_started' : 'direct';
    trackCompareViewed({
      careerId: state.careerId,
      goal: state.goal,
      picker: state.picker,
      schoolCount: rows.length,
      source,
      isPersonalized: personalized,
    });
  }, [isLoading, rows.length, state.careerId, state.goal, state.picker, personalized]);

  // 4. compare_rankings_updated — debounced after re-score.
  const debouncedRankings = useDebouncedCallback(trackCompareRankingsUpdated, 400);
  // Skip the very first call so it doesn't double-fire with compare_viewed.
  const rankingsInitRef = useRef(false);
  useEffect(() => {
    if (rows.length === 0) return;
    if (!rankingsInitRef.current) {
      rankingsInitRef.current = true;
      return;
    }
    debouncedRankings({
      goal: state.goal,
      careerId: state.careerId,
      picker: state.picker,
      rows,
      isPersonalized: personalized,
    });
  }, [rows, state.goal, state.careerId, state.picker, personalized, debouncedRankings]);

  // 2. compare_goal_changed
  const handleGoalChange = (next: GoalPreference) => {
    if (next === state.goal) return;
    trackCompareGoalChanged({
      fromGoal: state.goal,
      toGoal: next,
      careerId: state.careerId,
      picker: state.picker,
      isPersonalized: personalized,
    });
    setGoal(next);
  };

  // 3. compare_picker_changed — debounced (slider drag is noisy).
  const debouncedPickerEvent = useDebouncedCallback(trackComparePickerChanged, 400);
  const handlePickerChange = (nextPicker: CreditPickerState) => {
    // Detect which provider changed (single-source diff per call).
    const changed = CREDIT_SOURCES.find(
      (s: CreditSource) => nextPicker[s] !== state.picker[s]
    );
    if (changed) {
      debouncedPickerEvent({
        provider: changed,
        newCredits: nextPicker[changed],
        oldCredits: state.picker[changed],
        picker: nextPicker,
        careerId: state.careerId,
        goal: state.goal,
      });
    }
    setPicker(nextPicker);
  };

  // 5. compare_view_plan_clicked — handed to Table/Cards.
  // Routes through /plan/preview so the user sees the closer card before committing.
  const handleViewPlan = (programId: string) => {
    const idx = rows.findIndex((r) => r.template.id === programId);
    const previewQs = new URLSearchParams();
    if (state.goal) previewQs.set('goal', state.goal);
    if (state.careerId) previewQs.set('career', state.careerId);
    if (isPickerActive(state.picker)) {
      previewQs.set('picker', JSON.stringify(state.picker));
    }
    const previewUrl = `/plan/preview/${programId}${previewQs.toString() ? `?${previewQs.toString()}` : ''}`;

    if (idx === -1) {
      navigate(previewUrl);
      return;
    }
    const row = rows[idx];
    trackCompareViewPlanClicked({
      school: row.school,
      programId: row.template.id,
      rankPosition: idx + 1,
      goal: state.goal,
      careerId: state.careerId,
      picker: state.picker,
      isPersonalized: personalized,
      topSchoolAtClick: rows[0]?.school ?? null,
    });
    navigate(previewUrl);
  };

  return (
    <>
      <Helmet>
        <title>Compare Degree Plans | Pivot</title>
        <meta
          name="description"
          content={`Side-by-side comparison of ${VERIFIED_SCHOOL_CODES.length} verified universities — cost, time, and personalized transfer fit.`}
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 lg:py-10 max-w-6xl space-y-6">
        {/* Back link only — no decorative chip, no filler H1 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/get-started')}
          className="gap-1.5 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to your top 3
        </Button>

        {/* HERO: the savings sentence is the H1. No competition above the fold. */}
        {!isLoading && headline ? (
          <CompareHeadline headline={headline} />
        ) : !isLoading ? (
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Compare verified degree plans
          </h1>
        ) : null}

        {/* Trust + controls row — sits directly under the decision, not in the footer */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>
              <span className="text-foreground font-medium">{VERIFIED_SCHOOL_CODES.length} verified institutions</span>
              <span className="mx-1.5">·</span>
              <span>institutional policy data</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShareCompareButton />
            <GoalToggle value={state.goal} onChange={handleGoalChange} />
          </div>
        </div>

        {/* Why #1 — explains the decision BEFORE the data table */}
        {!isLoading && rows[0] && reasons.length > 0 && (
          <BestFitReasons school={rows[0].school} reasons={reasons} />
        )}

        {/* Quiet picker — collapsed by default, auto-expands if user has credits */}
        <CreditPickerCollapsible state={state.picker} onChange={handlePickerChange} />

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
          <CompareCards rows={rows} picker={state.picker} onViewPlan={handleViewPlan} />
        ) : (
          <CompareTable rows={rows} picker={state.picker} onViewPlan={handleViewPlan} />
        )}

        {/* Footer — quiet provenance line, no second trust card */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Costs &amp; timelines pulled from verified institutional catalogs and active provider pricing packs.
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
