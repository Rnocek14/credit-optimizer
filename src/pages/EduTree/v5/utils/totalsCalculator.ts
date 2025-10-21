import type { BasketItem, Constraints } from '../state/usePlanBasket';

/**
 * Phase 1c: Shared totals calculation
 * Single source of truth for cost, duration, workload, and ACE credit calculations
 * Used by both the store (getTotals) and the auto-complete engine
 */

export interface PlanTotals {
  totalCost: number;
  totalWeeks: number;
  avgCRI: number;
  totalWorkloadHours: number;
  aceCredits: number;
}

/**
 * Calculate plan totals from basket items
 * Uses concurrency to compute realistic timeline
 */
export function calculateTotals(
  items: BasketItem[],
  constraints: Constraints
): PlanTotals {
  if (items.length === 0) {
    return {
      totalCost: 0,
      totalWeeks: 0,
      avgCRI: 0,
      totalWorkloadHours: 0,
      aceCredits: 0
    };
  }

  const totalCost = items.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);

  // Calculate realistic weeks using concurrency
  const concurrency = constraints.max_concurrent_courses ?? 2;
  const serialWeeks = items.reduce((sum, i) => sum + (i.duration_weeks ?? 8), 0);
  const totalWeeks = Math.ceil(serialWeeks / concurrency);

  const totalCRI = items.reduce((sum, i) => sum + i.cri_score, 0);
  const avgCRI = totalCRI / items.length;

  const totalWorkloadHours = items.reduce((sum, i) => sum + (i.workload_weekly_hours ?? 0), 0);

  // Only MOOCs and testing centers count as ACE/alternative credit
  const aceCredits = items
    .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
    .reduce((sum, i) => sum + i.credits, 0);

  return {
    totalCost,
    totalWeeks,
    avgCRI,
    totalWorkloadHours,
    aceCredits
  };
}

/**
 * Calculate running totals from existing basket + new items
 * Used during auto-complete to enforce incremental constraints
 */
export function calculateRunningTotals(
  existingItems: BasketItem[],
  newItems: BasketItem[],
  constraints: Constraints
): PlanTotals {
  return calculateTotals([...existingItems, ...newItems], constraints);
}

/**
 * Check if adding new items would violate constraints
 */
export function wouldViolateConstraints(
  existingItems: BasketItem[],
  newItems: BasketItem[],
  constraints: Constraints
): { violated: boolean; reason?: string } {
  const totals = calculateRunningTotals(existingItems, newItems, constraints);

  if (constraints.max_budget_usd && totals.totalCost > constraints.max_budget_usd) {
    return { 
      violated: true, 
      reason: `Budget exceeded: $${totals.totalCost} > $${constraints.max_budget_usd}` 
    };
  }

  if (constraints.max_ace_credits && totals.aceCredits > constraints.max_ace_credits) {
    return { 
      violated: true, 
      reason: `ACE credit cap exceeded: ${totals.aceCredits} > ${constraints.max_ace_credits}` 
    };
  }

  if (constraints.max_weekly_hours && totals.totalWorkloadHours > constraints.max_weekly_hours) {
    return { 
      violated: true, 
      reason: `Weekly workload exceeded: ${totals.totalWorkloadHours}h > ${constraints.max_weekly_hours}h` 
    };
  }

  return { violated: false };
}
