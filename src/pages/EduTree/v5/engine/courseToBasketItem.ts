/**
 * Utility to normalize MarketplaceOption to BasketItem shape for dead-end checking
 * 
 * This ensures consistent policy classification (providerType, credits, level)
 * between basket-level validation (addItemGuarded) and semester-level validation.
 * 
 * INVARIANT: The same course must classify identically in both paths.
 * 
 * CLASSIFICATION ALIGNMENT:
 * - providerType: passed through from MarketplaceOption
 * - providerCode: passed through for provider cap checks
 * - level: passed through for upper-division checks
 * - aceNccrs: passed through for alt-credit classification
 * - isAltCredit: passed through for explicit alt-credit flagging
 * - equivalency_key: passed through for duplicate detection
 * 
 * These fields MUST match exactly how addItemGuarded creates BasketItems.
 */

import type { BasketItem } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/v5';

/**
 * Convert a MarketplaceOption to a candidate BasketItem for dead-end validation
 * 
 * This mirrors the normalization in usePlanBasketWithToasts.addItemGuarded
 * but is used for pre-commit validation (e.g., semester drop checks).
 * 
 * CRITICAL: Any field used by countsTowardAltCap, isResidentCredit, or
 * upper-division checks MUST be present here with the same derivation.
 */
export function courseToBasketItem(
  option: MarketplaceOption,
  moduleId: string
): BasketItem {
  return {
    moduleId,
    optionId: option.id,
    courseId: option.courseId,
    title: option.title ?? option.courseId,
    credits: option.credits ?? 0,
    cost_usd: option.cost_usd ?? 0,
    duration_weeks: option.duration_weeks ?? 8,
    workload_weekly_hours: option.workload_weekly_hours ?? (option.credits ? option.credits * 2.5 : 0),
    cri_score: option.cri_score ?? 0,
    providerType: option.providerType,
    providerCode: option.providerCode,
    equivalency_key: option.equivalency_key,
    level: option.level, // Important for upper-division checks
    status: 'pinned',
    
    // Alt-credit classification flags - MUST match addItemGuarded
    aceNccrs: option.aceNccrs,
    isAltCredit: option.isAltCredit,
    
    // Transfer verification (if available from marketplace)
    proctored: option.proctored,
  };
}
