import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/v5';
import type { ScoringWeights } from '../utils/optionScoring';
import { calculateOptionScore } from '../utils/optionScoring';

/**
 * Phase 1c: Shared filtering and scoring logic
 * Extracted from autoComplete.ts for reuse in multi-module coordinator
 */

export interface ScoredOption extends MarketplaceOption {
  score: number;
  scoreBreakdown: {
    cost: number;
    time: number;
    quality: number;
    cri: number;
    total: number;
  };
}

/**
 * Filter marketplace options based on constraints and prerequisites
 */
export function filterEligibleOptions(
  options: MarketplaceOption[],
  constraints: Constraints,
  runningTotals: {
    cost: number;
    aceCredits: number;
  },
  basketCourseIds: Set<string>
): MarketplaceOption[] {
  return options.filter((opt) => {
    // Budget check
    if (constraints.max_budget_usd) {
      const newCost = runningTotals.cost + (opt.cost_usd ?? 0);
      if (newCost > constraints.max_budget_usd) return false;
    }

    // CRI floor check
    if (constraints.min_cri_score && (opt.scoreBreakdown?.cri ?? 0) < constraints.min_cri_score) {
      return false;
    }

    // Transfer cap check (incremental enforcement with safety guards)
    const isAltCredit = opt.providerType === 'mooc' || opt.providerType === 'testing_center';
    const cap = Number(constraints.max_ace_credits ?? 0);
    const credits = Number(opt.credits ?? 0);
    
    if (isAltCredit && cap > 0) {
      const remaining = Math.max(0, cap - runningTotals.aceCredits);
      
      // Safety: block if credits invalid or exceeds remaining
      if (credits <= 0 || credits > remaining) {
        // Debug log when ACE cap blocks an option
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
          console.debug('[EduV5:OptFilters/cut]', { 
            why: credits <= 0 ? 'invalid_credits' : 'ace_cap', 
            courseId: opt.courseId, 
            optCredits: credits,
            need: credits, 
            remaining,
            cap,
            running: runningTotals.aceCredits
          });
        }
        return false;
      }
    }

    // Prerequisite check
    if (opt.prereq_course_ids?.length) {
      const prereqsMet = opt.prereq_course_ids.every((pid) => basketCourseIds.has(pid));
      if (!prereqsMet) return false;
    }

    return true;
  });
}

/**
 * Score marketplace options and attach metadata
 * Defensive: provides defaults for missing cost/duration/cri
 */
export function scoreOptions(
  options: MarketplaceOption[],
  weights: ScoringWeights
): ScoredOption[] {
  return options.map((opt) => {
    const breakdown = calculateOptionScore(
      {
        cost_usd: opt.cost_usd ?? 100, // Defensive: typical ACE course
        duration_weeks: opt.duration_weeks ?? 8, // Defensive: typical semester
        providerType: opt.providerType || 'university',
        aceNccrs: opt.aceNccrs ?? false,
        proctored: opt.proctored ?? false,
        providerRep: opt.providerRep ?? 0,
      },
      options, // Pass all options for normalization
      weights
    );

    return {
      ...opt,
      score: breakdown.total,
      scoreBreakdown: breakdown,
    };
  });
}

/**
 * Deterministic comparison for stable sorting
 * Order: score DESC → CRI DESC → cost ASC → duration ASC → courseId ASC
 */
export function compareByScore(a: ScoredOption, b: ScoredOption): number {
  // Higher score wins
  if (a.score !== b.score) return b.score - a.score;

  // Higher CRI wins
  const aCRI = a.scoreBreakdown?.cri ?? 0;
  const bCRI = b.scoreBreakdown?.cri ?? 0;
  if (aCRI !== bCRI) return bCRI - aCRI;

  // Lower cost wins
  const aCost = a.cost_usd ?? Infinity;
  const bCost = b.cost_usd ?? Infinity;
  if (aCost !== bCost) return aCost - bCost;

  // Shorter duration wins
  const aDuration = a.duration_weeks ?? 999;
  const bDuration = b.duration_weeks ?? 999;
  if (aDuration !== bDuration) return aDuration - bDuration;

  // Stable tiebreaker
  return a.courseId.localeCompare(b.courseId);
}

/**
 * Pick the best option from a list of scored options
 * Uses deterministic sorting for reproducibility
 */
export function pickBestOption(options: ScoredOption[]): ScoredOption | null {
  if (options.length === 0) return null;
  
  const sorted = [...options].sort(compareByScore);
  return sorted[0];
}

/**
 * Check if new items would violate constraints (incremental enforcement)
 */
export function withinConstraints(
  newItems: MarketplaceOption[],
  runningTotals: { cost: number; aceCredits: number; workloadHours: number },
  constraints: Constraints
): boolean {
  const additionalCost = newItems.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  const additionalAce = newItems
    .filter((i) => i.providerType === 'mooc' || i.providerType === 'testing_center')
    .reduce((sum, i) => sum + i.credits, 0);
  const additionalWorkload = newItems.reduce(
    (sum, i) => sum + (i.workload_weekly_hours ?? i.credits * 2.5),
    0
  );

  if (constraints.max_budget_usd && runningTotals.cost + additionalCost > constraints.max_budget_usd) {
    return false;
  }

  if (constraints.max_ace_credits && runningTotals.aceCredits + additionalAce > constraints.max_ace_credits) {
    return false;
  }

  if (constraints.max_weekly_hours && runningTotals.workloadHours + additionalWorkload > constraints.max_weekly_hours) {
    return false;
  }

  return true;
}
