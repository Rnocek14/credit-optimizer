/**
 * Alt Credit Calculation Utilities
 * 
 * Single source of truth for determining if credits count toward the alt credit cap.
 * Used by:
 * - MarketplacePanel (add-time flag computation)
 * - PolicyBadges (display logic)
 * - currentAceCredits calculation (basket totals)
 * 
 * IMPORTANT: All alt-credit policy logic MUST flow through this file.
 * Do not use raw `providerType !== 'university'` checks elsewhere.
 */

import type { ProviderType } from './optionScoring';

export interface AltCreditSignals {
  /** Explicit alt credit flag (highest priority if set) */
  isAltCredit?: boolean;
  /** ACE/NCCRS evaluation flag */
  aceNccrs?: boolean;
  /** Provider type for fallback classification */
  providerType?: ProviderType;
}

/**
 * Compute whether an option/item counts toward the alt credit cap.
 * 
 * Priority order:
 * 1) Explicit isAltCredit flag (already computed, highest priority)
 * 2) ACE/NCCRS tag → alt credit (these are transfer-evaluated courses)
 * 3) University providerType → NOT alt credit
 * 4) Non-university providerType → alt credit (MOOCs, bootcamps, testing centers)
 * 5) Missing providerType → CONSERVATIVE: treat as alt credit (safer for warnings)
 * 
 * @returns true if credits count toward max_alt_credits cap
 */
export function countsTowardAltCap(signals: AltCreditSignals): boolean {
  // 1) Explicit flag takes precedence
  if (typeof signals.isAltCredit === 'boolean') {
    return signals.isAltCredit;
  }
  
  // 2) ACE/NCCRS evaluated → alt credit
  if (signals.aceNccrs === true) {
    return true;
  }
  
  // 3) University providerType → NOT alt credit
  if (signals.providerType === 'university') {
    return false;
  }
  
  // 4) Missing providerType → treat as alt credit (conservative default)
  if (!signals.providerType) {
    return true;
  }
  
  // 5) Non-university providerType → alt credit
  return true;
}

/**
 * Calculate total alt credits from a collection of basket items.
 * Uses the shared alt credit computation for consistency.
 * 
 * Handles legacy items gracefully - if signals are missing,
 * defaults to conservative (counts as alt credit).
 */
export function calculateAltCreditsTotal(
  items: Array<AltCreditSignals & { credits: number }>
): number {
  return items
    .filter(item => countsTowardAltCap(item))
    .reduce((sum, item) => sum + item.credits, 0);
}

/**
 * Debug helper: Get detailed breakdown of alt credit calculation.
 * Useful for verifying consistency between add-time, display, and totals.
 */
export function getAltCreditBreakdown(
  items: Array<AltCreditSignals & { credits: number; courseId?: string; optionId?: string }>
): {
  totalCredits: number;
  altCredits: number;
  items: Array<{
    courseId?: string;
    optionId?: string;
    credits: number;
    countsAsAlt: boolean;
    reason: 'explicit' | 'aceNccrs' | 'providerType' | 'missing';
    providerType?: ProviderType;
  }>;
} {
  const breakdown = items.map(item => {
    const countsAsAlt = countsTowardAltCap(item);
    let reason: 'explicit' | 'aceNccrs' | 'providerType' | 'missing';
    
    if (typeof item.isAltCredit === 'boolean') {
      reason = 'explicit';
    } else if (item.aceNccrs === true) {
      reason = 'aceNccrs';
    } else if (!item.providerType) {
      reason = 'missing';
    } else {
      reason = 'providerType';
    }
    
    return {
      courseId: item.courseId,
      optionId: item.optionId,
      credits: item.credits,
      countsAsAlt,
      reason,
      providerType: item.providerType,
    };
  });
  
  return {
    totalCredits: items.reduce((sum, i) => sum + i.credits, 0),
    altCredits: breakdown.filter(i => i.countsAsAlt).reduce((sum, i) => sum + i.credits, 0),
    items: breakdown,
  };
}
