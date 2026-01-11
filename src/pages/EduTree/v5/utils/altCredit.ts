/**
 * Alt Credit Calculation Utilities
 * 
 * Single source of truth for determining if credits count toward the alt credit cap.
 * Used by:
 * - MarketplacePanel (add-time flag computation)
 * - PolicyBadges (display logic)
 * - currentAceCredits calculation (basket totals)
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
 * 3) Non-university providerType → alt credit (MOOCs, bootcamps, testing centers)
 * 
 * @returns true if credits count toward max_alt_credits cap
 */
export function computeIsAltCreditFromSignals(signals: AltCreditSignals): boolean {
  // 1) Explicit flag takes precedence
  if (typeof signals.isAltCredit === 'boolean') {
    return signals.isAltCredit;
  }
  
  // 2) ACE/NCCRS evaluated → alt credit
  if (signals.aceNccrs === true) {
    return true;
  }
  
  // 3) Non-university providerType → alt credit
  return signals.providerType !== 'university';
}

/**
 * Thin wrapper for convenience when you have a full option/item object.
 * Extracts the relevant signals and computes alt credit status.
 */
export function countsTowardAltCap(itemOrOption: AltCreditSignals): boolean {
  return computeIsAltCreditFromSignals(itemOrOption);
}

/**
 * Calculate total alt credits from a collection of basket items.
 * Uses the shared alt credit computation for consistency.
 */
export function calculateAltCreditsTotal(
  items: Array<AltCreditSignals & { credits: number }>
): number {
  return items
    .filter(item => countsTowardAltCap(item))
    .reduce((sum, item) => sum + item.credits, 0);
}
