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
  /** Total credits required for the degree */
  totalCredits: number;
  /**
   * Credits the user would need to take fresh at this school
   * (totalCredits − matchedCredits when personalized, else totalCredits − acceptedCeiling).
   * Lower = less time/money spent re-doing work.
   */
  remainingCredits: number;
  /** Composite score 0..1 under current goal weights */
  score: number;
  /** Top composite score — anchor of the page */
  isBest: boolean;
  /** Cheapest in the pool */
  isCheapest: boolean;
  /** Fastest in the pool */
  isFastest: boolean;
  /** Accepts the most credits (highest matched/ceiling) */
  isMostCreditFriendly: boolean;
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

  const personalized =
    (picker.CLEP ?? 0) + (picker.SOPHIA ?? 0) + (picker.STUDYCOM ?? 0) + (picker.STRAIGHTERLINE ?? 0) > 0;

  const rows: CompareRow[] = scored.map((s) => {
    const t = s.template;
    const totalCredits = t.totals?.credits ?? t.est?.credits ?? 120;
    const acceptedCeiling = t.twoPhaseData?.altCredits ?? 0;
    const matchedCredits = Math.round(s.normalized.transfer * totalCredits);
    const effectiveAccepted = personalized ? matchedCredits : acceptedCeiling;
    const remainingCredits = Math.max(0, totalCredits - effectiveAccepted);
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
      totalCredits,
      remainingCredits,
      score: applyWeights(s, weights),
      isBest: false,
      isCheapest: false,
      isFastest: false,
      isMostCreditFriendly: false,
    };
  });

  // Sort by composite score descending — that becomes the on-screen order
  rows.sort((a, b) => b.score - a.score);
  if (rows.length > 0) rows[0].isBest = true;

  // Tag superlatives (only if there's a clear winner; ties → no badge to avoid noise)
  tagWinner(rows, (r) => r.cost, 'isCheapest', 'min');
  tagWinner(rows, (r) => r.weeks, 'isFastest', 'min');
  tagWinner(
    rows,
    (r) => (personalized ? r.matchedCredits : r.acceptedCeiling),
    'isMostCreditFriendly',
    'max'
  );

  return rows;
}

/**
 * Mark exactly one row as the winner for a metric, but only if it's strictly
 * better than the runner-up. Avoids slapping a badge on every school in a tie.
 */
function tagWinner(
  rows: CompareRow[],
  pick: (r: CompareRow) => number,
  flag: 'isCheapest' | 'isFastest' | 'isMostCreditFriendly',
  dir: 'min' | 'max'
): void {
  if (rows.length < 2) return;
  const sorted = [...rows].sort((a, b) =>
    dir === 'min' ? pick(a) - pick(b) : pick(b) - pick(a)
  );
  const winner = sorted[0];
  const runnerUp = sorted[1];
  if (!Number.isFinite(pick(winner)) || pick(winner) <= 0) return;
  if (pick(winner) === pick(runnerUp)) return;
  winner[flag] = true;
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
