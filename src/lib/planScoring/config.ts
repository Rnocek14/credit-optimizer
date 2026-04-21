/**
 * Plan scoring configuration — tunable weights + verified school pool.
 * Keep all magic numbers here so we can iterate without touching engine logic.
 */

/**
 * Schools with active, catalog-verified policy packs (residency + max transfer
 * + degree total all backed by ground truth or safe auto-defaults at conf ≥80).
 * Source of truth: institution_policy_packs.status = 'active'.
 */
export const VERIFIED_SCHOOL_CODES = [
  'TESU',
  'COSC',
  'EXCELSIOR',
  'EMPIRE',
  'WGU',
  'LIBERTY',
  'SNHU',
] as const;

export type VerifiedSchoolCode = (typeof VERIFIED_SCHOOL_CODES)[number];

/** Weight blends per strategy. Sum should be 1.0. */
export const STRATEGY_WEIGHTS = {
  bestOverall: { cost: 0.4, time: 0.3, transfer: 0.3 },
  cheapest:    { cost: 1.0, time: 0.0, transfer: 0.0 },
  fastest:     { cost: 0.0, time: 1.0, transfer: 0.0 },
} as const;

/** Sensible bounds for normalization fallbacks (used when pool has 1 template). */
export const SCORE_BOUNDS = {
  // Used as denominator floor so a single-template pool doesn't divide by zero
  minCostSpread: 1000,   // $
  minWeeksSpread: 4,     // weeks
} as const;
