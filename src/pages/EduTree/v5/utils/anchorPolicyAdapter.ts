/**
 * Anchor Policy Adapter - Extract PartnerPolicy from Constraints
 */

import type { Constraints } from '../state/usePlanBasket';
import type { PartnerPolicy } from '../engine/yearPlanner';

/**
 * Extract anchor policy from constraints for year planner
 * Note: target_school is currently just a string identifier
 * TODO Week 2: Fetch actual policy from partner_policies table
 */
export function getAnchorPolicyFromConstraints(
  constraints: Constraints
): PartnerPolicy | undefined {
  // Week 1: Return undefined (no policy integration yet)
  // Week 2: Query partner_policies table using constraints.target_school
  if (!constraints.target_school) return undefined;
  
  // Placeholder for Week 2 implementation
  return undefined;
}

/**
 * Calculate transfer/residency totals from basket
 */
export function calculateAnchorTotals(basket: Array<{
  credits: number;
  providerType?: 'university' | 'mooc' | 'bootcamp' | 'testing_center' | null;
  level?: number;
}>) {
  return {
    aceCredits: basket
      .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
      .reduce((sum, i) => sum + i.credits, 0),
    residencyCredits: basket
      .filter(i => i.providerType === 'university')
      .reduce((sum, i) => sum + i.credits, 0),
    upperDivisionCredits: basket
      .filter(i => (i.level || 0) >= 300)
      .reduce((sum, i) => sum + i.credits, 0),
  };
}
