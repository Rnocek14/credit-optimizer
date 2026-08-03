/**
 * Plan scoring configuration — tunable weights + verified school pool.
 * Keep all magic numbers here so we can iterate without touching engine logic.
 */

/**
 * Schools rendered in /compare and /get-started.
 *
 * Inclusion criteria (as of 2026-05-20):
 *   - status='active' policy pack in institution_policy_packs
 *   - non-trivial credit_transfer_rules coverage (≥100 rules, ≥50% catalog_verified)
 *
 * Audit caveat (2026-05-20): every active pack currently passes Gate 5 via
 * `auto_defaulted` provenance — NOT real ground truth. The "verified" label
 * in product copy is held up by safe auto-defaults at confidence ≥0.80, not by
 * curated catalog reads. Tracked separately; do not tighten this list until
 * ground truth is populated.
 *
 * Removed 2026-05-20:
 *   - LIBERTY: 3 transfer rules, 0 verified, 0 evidence URLs. Active pack has
 *     auto_defaulted provenance only. NOTE: superseded pack
 *     ec135abd-4c51-430f-94a3-3524deff9eae (source liberty_transfer_faq_2026_04_17)
 *     carries real ground truth and was clobbered by a later scraper merge.
 *     Recoverable — restore before re-adding.
 *   - SNHU: 0 transfer rules. Empty shell.
 */
/*
 * Trimmed 2026-08-03 (Phase 3 honest-data pass):
 *   - EMPIRE: no seeder, no fixture, no template migration — never rendered a
 *     compare column and cannot back the "verified" claim.
 *   - EXCELSIOR: excluded until evidence coverage reaches 50%+ (its ~170
 *     course rules are real, but degree templates/baselines are not seeded) —
 *     matches useAvailableInstitutions' own gate.
 * Re-add each school only when it has: active templates, baseline snapshots,
 * and ground-truth-backed policy fields. See docs/DATA_ASSET_REGISTER.md.
 */
export const VERIFIED_SCHOOL_CODES = [
  'TESU',
  'COSC',
  'WGU',
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
