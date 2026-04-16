/**
 * Shared row + formatting helpers for /compare.
 *
 * A "CompareRow" represents one school's scored template ready for table/card display.
 */
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { scorePool, applyWeights, type ScoredTemplate } from '@/lib/planScoring';
import { STRATEGY_WEIGHTS } from '@/lib/planScoring/config';
import type { GoalPreference } from '@/hooks/useQuickPlanGeneration';
import type { CreditPickerState } from './types';

export interface CompareRow {
  template: MarketplaceDegreeTemplate;
  school: string;
  programCode: string;
  cost: number;
  weeks: number;
  years: number;
  /** Personalized transfer percent (0..100) using picker state */
  transferPercent: number;
  /** Estimated credits the user can transfer in to this school */
  matchedCredits: number;
  /** Total credits the school accepts via alt providers (ceiling) */
  acceptedCeiling: number;
  /** Composite score 0..1 under current goal weights */
  score: number;
  isBest: boolean;
}

const GOAL_TO_WEIGHTS = {
  balanced: STRATEGY_WEIGHTS.bestOverall,
  cheapest: STRATEGY_WEIGHTS.cheapest,
  fastest: STRATEGY_WEIGHTS.fastest,
} as const;

export function buildCompareRows(
  templates: MarketplaceDegreeTemplate[],
  picker: CreditPickerState,
  goal: GoalPreference
): CompareRow[] {
  if (templates.length === 0) return [];

  const scored: ScoredTemplate[] = scorePool(templates, { creditsBySource: picker });
  const weights = GOAL_TO_WEIGHTS[goal];

  const rows: CompareRow[] = scored.map((s) => {
    const t = s.template;
    const totalCredits = t.totals?.credits ?? t.est?.credits ?? 120;
    const acceptedCeiling = t.twoPhaseData?.altCredits ?? 0;
    const matchedCredits = Math.round(s.normalized.transfer * totalCredits);
    return {
      template: t,
      school: (t.anchorSchool || '').toUpperCase(),
      programCode: t.programId,
      cost: s.raw.cost,
      weeks: s.raw.weeks,
      years: Math.round((s.raw.weeks / 52) * 10) / 10,
      transferPercent: Math.round(s.normalized.transfer * 100),
      matchedCredits,
      acceptedCeiling,
      score: applyWeights(s, weights),
      isBest: false,
    };
  });

  // Sort by composite score descending — that becomes the on-screen order
  rows.sort((a, b) => b.score - a.score);
  if (rows.length > 0) rows[0].isBest = true;
  return rows;
}

export function formatCost(c: number): string {
  if (!Number.isFinite(c) || c <= 0) return '—';
  if (c >= 1000) return `$${(c / 1000).toFixed(1)}k`;
  return `$${Math.round(c).toLocaleString()}`;
}

export function formatYears(weeks: number): string {
  if (!Number.isFinite(weeks) || weeks <= 0) return '—';
  return `${(weeks / 52).toFixed(1)} yrs`;
}
