/**
 * Dead-End Detector - Prevents selections that make degree completion impossible
 * 
 * Checks if selecting an option would:
 * - Exceed noncollegiate credit cap
 * - Make residency requirements unsatisfiable
 * - Block upper-division requirements
 * - Exceed total credits allowed
 */

import { getNoncollegiateCap, getResidencyCredits, getPolicyOrDefault } from '@/lib/degree/institutionPolicies';
import type { BasketItem, MarketplaceOption, Constraints } from '../types/exports';

export interface DeadEndCheck {
  isDeadEnd: boolean;
  reason?: string;
  ruleViolated?: string;
  currentValue?: number;
  cap?: number;
  overage?: number;
}

/**
 * Check if selecting an option would create a dead-end
 */
export function checkForDeadEnd(
  option: MarketplaceOption,
  currentBasket: BasketItem[],
  constraints: Constraints
): DeadEndCheck {
  const anchorSchool = constraints.target_school || 'TESU';
  const policy = getPolicyOrDefault(anchorSchool);
  const noncollegiateCap = getNoncollegiateCap(anchorSchool, 'bachelor');
  const residencyRequired = getResidencyCredits(anchorSchool, 'standard');
  
  // Calculate current totals
  let currentNoncollegiate = 0;
  let currentResidency = 0;
  let currentTotal = 0;
  
  for (const item of currentBasket) {
    currentTotal += item.credits;
    if (item.providerType === 'mooc' || item.providerType === 'testing_center') {
      currentNoncollegiate += item.credits;
    }
    if (item.providerType === 'university') {
      currentResidency += item.credits;
    }
  }
  
  // Check 1: Would exceed noncollegiate cap
  if (option.providerType === 'mooc' || option.providerType === 'testing_center') {
    const afterNoncollegiate = currentNoncollegiate + option.credits;
    if (afterNoncollegiate > noncollegiateCap) {
      return {
        isDeadEnd: true,
        reason: `Would exceed ${anchorSchool} transfer credit cap (${afterNoncollegiate}/${noncollegiateCap})`,
        ruleViolated: 'NONCOLLEGIATE_CAP',
        currentValue: afterNoncollegiate,
        cap: noncollegiateCap,
        overage: afterNoncollegiate - noncollegiateCap,
      };
    }
  }
  
  // Check 2: Would make residency unsatisfiable
  // If we're adding non-university credits and remaining slots can't satisfy residency
  const remainingCredits = policy.totalCreditsBachelor - currentTotal - option.credits;
  const stillNeededResidency = residencyRequired - currentResidency;
  
  if (option.providerType !== 'university' && stillNeededResidency > 0) {
    // After this selection, can we still fit enough university credits?
    if (remainingCredits < stillNeededResidency) {
      return {
        isDeadEnd: true,
        reason: `Would leave insufficient room for ${anchorSchool} residency credits (need ${stillNeededResidency}, only ${remainingCredits} slots remain)`,
        ruleViolated: 'RESIDENCY_UNSATISFIABLE',
        currentValue: remainingCredits,
        cap: stillNeededResidency,
      };
    }
  }
  
  // Check 3: Would exceed total credits
  const afterTotal = currentTotal + option.credits;
  if (afterTotal > policy.totalCreditsBachelor) {
    return {
      isDeadEnd: true,
      reason: `Would exceed degree total (${afterTotal}/${policy.totalCreditsBachelor} credits)`,
      ruleViolated: 'TOTAL_CREDITS_EXCEEDED',
      currentValue: afterTotal,
      cap: policy.totalCreditsBachelor,
      overage: afterTotal - policy.totalCreditsBachelor,
    };
  }
  
  return { isDeadEnd: false };
}

/**
 * Filter options to remove dead-ends, returning annotated results
 */
export function annotateOptionsWithDeadEnds(
  options: MarketplaceOption[],
  currentBasket: BasketItem[],
  constraints: Constraints
): Array<MarketplaceOption & { deadEnd?: DeadEndCheck }> {
  return options.map(opt => {
    const check = checkForDeadEnd(opt, currentBasket, constraints);
    return { ...opt, deadEnd: check.isDeadEnd ? check : undefined };
  });
}
