/**
 * Optimization type constants - single source of truth
 * 
 * IMPORTANT: Always use these constants instead of string literals.
 * This prevents 'alt_max' vs 'alt-credit' vs 'altmax' drift.
 */

export const OPTIMIZATION = {
  STANDARD: 'standard',
  ALT_CREDIT: 'alt-credit',
  BALANCED: 'balanced',
  FASTEST: 'fastest',
} as const;

export type Optimization = typeof OPTIMIZATION[keyof typeof OPTIMIZATION];

/**
 * Display labels for optimization types
 * Use this for all user-facing labels to ensure consistency
 */
export const OPTIMIZATION_LABEL: Record<Optimization, string> = {
  [OPTIMIZATION.STANDARD]: 'Standard',
  [OPTIMIZATION.ALT_CREDIT]: 'Alt Credit Max',
  [OPTIMIZATION.BALANCED]: 'Balanced',
  [OPTIMIZATION.FASTEST]: 'Fastest',
};

/**
 * Map database track_type values to normalized Optimization values
 * Handles legacy 'alt_max' → 'alt-credit' conversion
 */
export function normalizeOptimization(trackType: string | null | undefined): Optimization {
  if (!trackType) return OPTIMIZATION.STANDARD;
  
  // Handle legacy/DB values
  if (trackType === 'alt_max') return OPTIMIZATION.ALT_CREDIT;
  if (trackType === 'cheapest') return OPTIMIZATION.ALT_CREDIT;
  
  // Direct match
  if (Object.values(OPTIMIZATION).includes(trackType as Optimization)) {
    return trackType as Optimization;
  }
  
  return OPTIMIZATION.STANDARD;
}

/**
 * Check if an optimization type is alt-credit based (uses external credits)
 */
export function isAltCreditOptimization(optimization: Optimization): boolean {
  return optimization === OPTIMIZATION.ALT_CREDIT;
}
