/**
 * useQuickPlanGeneration — ranks marketplace templates for the GetStarted flow.
 *
 * Pipeline:
 *   1. Pull all active marketplace templates
 *   2. Filter to the 5 catalog-verified schools (TESU/COSC/EXCELSIOR/EMPIRE/WGU)
 *   3. Apply career match boost (if a career was selected)
 *   4. Hand off to rankTopThree() for scoring + strategy assignment
 */
import { useMemo } from 'react';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import { rankTopThree, type RankedPlan } from '@/lib/planScoring';
import { VERIFIED_SCHOOL_CODES } from '@/lib/planScoring/config';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';

export type GoalPreference = 'cheapest' | 'fastest' | 'balanced';
export type ExperienceLevel = 'fresh' | 'some-college' | 'returning';

export interface QuickPlanConstraints {
  careerId: string | null;
  goal: GoalPreference;
  experience: ExperienceLevel;
}

/** Public re-export for legacy consumers (ResultsStep). */
export type RankedTemplate = RankedPlan;

const VERIFIED_SET = new Set<string>(VERIFIED_SCHOOL_CODES);

function filterToVerifiedSchools(
  templates: MarketplaceDegreeTemplate[]
): MarketplaceDegreeTemplate[] {
  return templates.filter((t) => VERIFIED_SET.has((t.anchorSchool || '').toUpperCase()));
}

function applyCareerBoost(
  templates: MarketplaceDegreeTemplate[],
  careerId: string | null
): MarketplaceDegreeTemplate[] {
  if (!careerId) return templates;
  // Prefer templates that explicitly target the chosen career — keep both groups,
  // but matched templates come first so they win ties in the scoring step.
  const matched = templates.filter((t) => t.primaryCareerIds?.includes(careerId));
  const others = templates.filter((t) => !t.primaryCareerIds?.includes(careerId));
  return [...matched, ...others];
}

export function useQuickPlanGeneration(constraints: QuickPlanConstraints | null) {
  const { data: allTemplates = [], isLoading } = useMarketplaceTemplates();

  const results = useMemo<RankedPlan[]>(() => {
    if (!constraints || allTemplates.length === 0) return [];
    const verified = filterToVerifiedSchools(allTemplates);
    if (verified.length === 0) return [];
    const ordered = applyCareerBoost(verified, constraints.careerId);
    return rankTopThree(ordered);
  }, [allTemplates, constraints]);

  return { results, isLoading };
}
