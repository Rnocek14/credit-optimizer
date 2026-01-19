/**
 * Dead-End Detector - Prevents selections that make degree completion impossible
 * 
 * Checks if selecting an option would:
 * - Exceed noncollegiate credit cap
 * - Make residency requirements unsatisfiable
 * - Block upper-division requirements
 * - Exceed total credits allowed
 * - Make remaining requirements impossible to complete
 */

import { getNoncollegiateCap, getResidencyCredits, getPolicyOrDefault } from '@/lib/degree/institutionPolicies';
import type { BasketItem, MarketplaceOption, Constraints } from '../types/exports';

export interface DeadEndCheck {
  isDeadEnd: boolean;
  reasons: string[];
  ruleViolated?: string;
  currentValue?: number;
  cap?: number;
  overage?: number;
  snapshot?: {
    totalCredits: number;
    noncollegiateCredits: number;
    residencyCredits: number;
    upperDivCredits: number;
    remainingModuleCount: number;
    maxPossibleCredits: number;
    maxPossibleResidency: number;
    maxPossibleUpperDiv: number;
  };
}

export interface RemainingModule {
  moduleId: string;
  options: MarketplaceOption[];
  creditsRequired: number;
}

/**
 * Check if selecting an option would create a dead-end
 * 
 * Enhanced version that considers remaining modules and feasibility
 */
export function checkForDeadEnd(
  option: MarketplaceOption,
  currentBasket: BasketItem[],
  constraints: Constraints,
  remainingModules?: RemainingModule[]
): DeadEndCheck {
  const anchorSchool = constraints.target_school || 'TESU';
  const policy = getPolicyOrDefault(anchorSchool);
  const noncollegiateCap = getNoncollegiateCap(anchorSchool, 'bachelor');
  const residencyRequired = getResidencyCredits(anchorSchool, 'standard');
  
  // P1 Safety: Handle missing policy explicitly
  const upperDivRequired = policy?.upperDivisionAreaOfStudyMin ?? 18;
  const totalCreditsRequired = policy?.totalCreditsBachelor ?? 120;
  
  const reasons: string[] = [];
  
  // Calculate current totals
  let currentNoncollegiate = 0;
  let currentResidency = 0;
  let currentTotal = 0;
  let currentUpperDiv = 0;
  
  for (const item of currentBasket) {
    currentTotal += item.credits;
    if (item.providerType === 'mooc' || item.providerType === 'testing_center') {
      currentNoncollegiate += item.credits;
    }
    if (item.providerType === 'university') {
      currentResidency += item.credits;
    }
    // Check level from item if available (cast to access optional property)
    const itemLevel = (item as any).level as number | undefined;
    if (itemLevel && itemLevel >= 300) {
      currentUpperDiv += item.credits;
    }
  }
  
  // Calculate "after selection" totals
  const afterTotal = currentTotal + option.credits;
  let afterNoncollegiate = currentNoncollegiate;
  let afterResidency = currentResidency;
  let afterUpperDiv = currentUpperDiv;
  
  if (option.providerType === 'mooc' || option.providerType === 'testing_center') {
    afterNoncollegiate += option.credits;
  }
  if (option.providerType === 'university') {
    afterResidency += option.credits;
  }
  if (option.level && option.level >= 300) {
    afterUpperDiv += option.credits;
  }
  
  // =========================================================================
  // Check 1: Would exceed noncollegiate cap (immediate violation)
  // =========================================================================
  if (afterNoncollegiate > noncollegiateCap) {
    reasons.push(`Exceeds ${anchorSchool} noncollegiate cap (${afterNoncollegiate}/${noncollegiateCap})`);
  }
  
  // =========================================================================
  // Check 2: Would exceed total credits (immediate violation)
  // =========================================================================
  if (afterTotal > totalCreditsRequired) {
    reasons.push(`Exceeds degree total (${afterTotal}/${totalCreditsRequired} credits)`);
  }
  
  // =========================================================================
  // Check 3: Feasibility checks with remaining modules
  // =========================================================================
  if (remainingModules && remainingModules.length > 0) {
    // Calculate remaining deficits
    const needCredits = totalCreditsRequired - afterTotal;
    const needResidency = Math.max(0, residencyRequired - afterResidency);
    const needUpperDiv = Math.max(0, upperDivRequired - afterUpperDiv);
    const noncollegiateRoom = noncollegiateCap - afterNoncollegiate;
    
    // Calculate maximum possible from remaining modules (best-case)
    let maxCreditsPossible = 0;
    let maxResidencyPossible = 0;
    let maxUpperDivPossible = 0;
    
    for (const mod of remainingModules) {
      const { creditsRequired, options } = mod;
      
      // Can this module contribute credits at all?
      if (options.length > 0) {
        maxCreditsPossible += creditsRequired;
        
        // Can this module contribute residency? (has any university option)
        const hasUniversityOption = options.some(o => o.providerType === 'university');
        if (hasUniversityOption) {
          maxResidencyPossible += creditsRequired;
        }
        
        // Can this module contribute upper-div? (has any level >= 300 option)
        const hasUpperDivOption = options.some(o => o.level && o.level >= 300);
        if (hasUpperDivOption) {
          maxUpperDivPossible += creditsRequired;
        }
      }
    }
    
    // Check feasibility
    if (needCredits > maxCreditsPossible) {
      reasons.push(
        `Insufficient remaining modules for credits (need ${needCredits}, max possible ${maxCreditsPossible})`
      );
    }
    
    if (needResidency > maxResidencyPossible) {
      reasons.push(
        `Cannot satisfy residency (need ${needResidency} more, only ${maxResidencyPossible} possible from remaining institutional slots)`
      );
    }
    
    if (needUpperDiv > maxUpperDivPossible) {
      reasons.push(
        `Cannot satisfy upper-division (need ${needUpperDiv} more, only ${maxUpperDivPossible} possible from remaining 300+ level slots)`
      );
    }
    
    // Check if remaining noncollegiate room is negative (already exceeded)
    if (noncollegiateRoom < 0) {
      reasons.push(
        `Already exceeding noncollegiate cap by ${Math.abs(noncollegiateRoom)} credits`
      );
    }
  } else {
    // Simplified check without remaining modules (legacy behavior)
    const remainingCredits = totalCreditsRequired - afterTotal;
    const stillNeededResidency = residencyRequired - afterResidency;
    
    // After this selection, can we still fit enough university credits for residency?
    if (option.providerType !== 'university' && stillNeededResidency > 0) {
      if (remainingCredits < stillNeededResidency) {
        reasons.push(
          `Insufficient room for residency (need ${stillNeededResidency}, only ${remainingCredits} slots remain)`
        );
      }
    }
  }
  
  const isDeadEnd = reasons.length > 0;
  
  return {
    isDeadEnd,
    reasons,
    ruleViolated: isDeadEnd ? reasons[0]?.split(' ')[0] : undefined,
    currentValue: afterNoncollegiate,
    cap: noncollegiateCap,
    overage: isDeadEnd && afterNoncollegiate > noncollegiateCap 
      ? afterNoncollegiate - noncollegiateCap 
      : undefined,
    snapshot: remainingModules ? {
      totalCredits: afterTotal,
      noncollegiateCredits: afterNoncollegiate,
      residencyCredits: afterResidency,
      upperDivCredits: afterUpperDiv,
      remainingModuleCount: remainingModules.length,
      maxPossibleCredits: remainingModules.reduce((s, m) => s + (m.options.length > 0 ? m.creditsRequired : 0), 0),
      maxPossibleResidency: remainingModules.reduce((s, m) => 
        s + (m.options.some(o => o.providerType === 'university') ? m.creditsRequired : 0), 0),
      maxPossibleUpperDiv: remainingModules.reduce((s, m) => 
        s + (m.options.some(o => o.level && o.level >= 300) ? m.creditsRequired : 0), 0),
    } : undefined,
  };
}

/**
 * Filter options to remove dead-ends, returning annotated results
 */
export function annotateOptionsWithDeadEnds(
  options: MarketplaceOption[],
  currentBasket: BasketItem[],
  constraints: Constraints,
  remainingModules?: RemainingModule[]
): Array<MarketplaceOption & { deadEnd?: DeadEndCheck }> {
  return options.map(opt => {
    const check = checkForDeadEnd(opt, currentBasket, constraints, remainingModules);
    return { ...opt, deadEnd: check.isDeadEnd ? check : undefined };
  });
}

/**
 * Get only viable (non-dead-end) options
 */
export function filterViableOptions(
  options: MarketplaceOption[],
  currentBasket: BasketItem[],
  constraints: Constraints,
  remainingModules?: RemainingModule[]
): MarketplaceOption[] {
  return options.filter(opt => {
    const check = checkForDeadEnd(opt, currentBasket, constraints, remainingModules);
    return !check.isDeadEnd;
  });
}
