/**
 * useQuickPlanGeneration — ranks marketplace templates by career + constraint fit.
 * Returns top 3 templates for the GetStarted results page.
 */
import { useMemo } from 'react';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';

export type GoalPreference = 'cheapest' | 'fastest' | 'balanced';
export type ExperienceLevel = 'fresh' | 'some-college' | 'returning';

export interface QuickPlanConstraints {
  careerId: string | null;
  goal: GoalPreference;
  experience: ExperienceLevel;
}

export interface RankedTemplate {
  template: MarketplaceDegreeTemplate;
  badge: 'Best Value' | 'Fastest' | 'Most Flexible' | 'Recommended';
  estimatedYears: number;
  estimatedCost: number;
  transferPercent: number;
}

function scoreCost(t: MarketplaceDegreeTemplate): number {
  return t.totals?.costUsd ?? t.est?.costUsd ?? 99999;
}

function scoreTime(t: MarketplaceDegreeTemplate): number {
  return t.totals?.weeks ?? t.est?.weeks ?? 200;
}

function rankTemplates(
  templates: MarketplaceDegreeTemplate[],
  constraints: QuickPlanConstraints
): RankedTemplate[] {
  if (templates.length === 0) return [];

  // Score each template
  const scored = templates.map(t => {
    const cost = scoreCost(t);
    const weeks = scoreTime(t);
    const totalCredits = t.totals?.credits ?? t.est?.credits ?? 120;
    const altCredits = t.twoPhaseData?.altCredits ?? 0;
    const transferPct = totalCredits > 0 ? Math.round((altCredits / totalCredits) * 100) : 0;

    // Weighted score based on goal
    let score: number;
    switch (constraints.goal) {
      case 'cheapest':
        score = -cost + (-weeks * 10);
        break;
      case 'fastest':
        score = -weeks * 100 + (-cost * 0.01);
        break;
      case 'balanced':
      default:
        score = -cost * 0.5 + -weeks * 50;
        break;
    }

    // Career match bonus
    if (constraints.careerId && t.primaryCareerIds?.includes(constraints.careerId)) {
      score += 5000;
    }

    return { template: t, score, cost, weeks, transferPct };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top 3, assign badges
  const top = scored.slice(0, 3);
  const badges: Array<RankedTemplate['badge']> = ['Recommended', 'Recommended', 'Recommended'];

  // Find cheapest and fastest among top 3
  const cheapestIdx = top.reduce((best, item, i) => item.cost < top[best].cost ? i : best, 0);
  const fastestIdx = top.reduce((best, item, i) => item.weeks < top[best].weeks ? i : best, 0);

  if (cheapestIdx !== fastestIdx) {
    badges[cheapestIdx] = 'Best Value';
    badges[fastestIdx] = 'Fastest';
    // Third gets Most Flexible
    const thirdIdx = [0, 1, 2].find(i => i !== cheapestIdx && i !== fastestIdx) ?? 2;
    badges[thirdIdx] = 'Most Flexible';
  } else {
    badges[0] = 'Recommended';
    if (top.length > 1) badges[1] = 'Best Value';
    if (top.length > 2) badges[2] = 'Most Flexible';
  }

  return top.map((item, i) => ({
    template: item.template,
    badge: badges[i],
    estimatedYears: Math.round((item.weeks / 52) * 10) / 10,
    estimatedCost: item.cost,
    transferPercent: item.transferPct,
  }));
}

export function useQuickPlanGeneration(constraints: QuickPlanConstraints | null) {
  const { data: allTemplates = [], isLoading } = useMarketplaceTemplates();

  const results = useMemo(() => {
    if (!constraints || allTemplates.length === 0) return [];
    return rankTemplates(allTemplates, constraints);
  }, [allTemplates, constraints]);

  return { results, isLoading };
}
