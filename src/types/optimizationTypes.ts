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
  MULTI_SCHOOL: 'multi-school',
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
  [OPTIMIZATION.MULTI_SCHOOL]: 'Multi-School',
};

/**
 * Map database track_type values to normalized Optimization values
 * Handles legacy values, case differences, and underscore/hyphen variants
 */
export function normalizeOptimization(trackType: string | null | undefined): Optimization {
  if (!trackType) return OPTIMIZATION.STANDARD;
  
  // Normalize: trim, lowercase, convert underscores to hyphens
  const normalized = trackType.trim().toLowerCase().replace(/_/g, '-');
  
  // Handle legacy/variant values
  switch (normalized) {
    case 'alt-max':
    case 'altmax':
    case 'alt-credit':
    case 'altcredit':
    case 'cheapest':
      return OPTIMIZATION.ALT_CREDIT;
    
    case 'fastest':
    case 'time-min':
    case 'timemin':
      return OPTIMIZATION.FASTEST;
    
    case 'balanced':
      return OPTIMIZATION.BALANCED;
    
    case 'multi-school':
    case 'multischool':
    case 'multi-school-cheapest':
      return OPTIMIZATION.MULTI_SCHOOL;
    
    case 'standard':
    case 'standard-like':
    case 'standardlike':
    default:
      return OPTIMIZATION.STANDARD;
  }
}

/**
 * Check if an optimization type is alt-credit based (uses external credits)
 */
export function isAltCreditOptimization(optimization: Optimization): boolean {
  return optimization === OPTIMIZATION.ALT_CREDIT || optimization === OPTIMIZATION.MULTI_SCHOOL;
}
