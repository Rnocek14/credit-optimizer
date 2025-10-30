/**
 * Anchor Policy Adapter - Extract PartnerPolicy from Constraints
 */

import type { Constraints } from '../state/usePlanBasket';
import type { PartnerPolicy } from '../engine/yearPlanner';

/**
 * Extract anchor policy from constraints for year planner
 * Week 1.5: Basic policy extraction with sane defaults
 * Week 2: Fetch actual policy from partner_policies table
 */
export function getAnchorPolicyFromConstraints(
  constraints: Constraints
): PartnerPolicy | undefined {
  // If no target school, return undefined
  const targetSchool = constraints.target_school;
  if (!targetSchool) return undefined;
  
  // Week 1.5: Extract from constraints if available (Week 2 will query DB)
  if (typeof targetSchool === 'object') {
    const school = targetSchool as any;
    if (school?.policy) {
      return {
        partner_name: school.name || 'Unknown',
        max_alt_credits: Number(school.policy.max_alt_credits ?? 60),
        min_residency_credits: Number(school.policy.min_residency_credits ?? 30),
        upper_division_min: Number(school.policy.upper_division_min ?? 0),
        notes: school.policy.notes,
      };
    }
  }
  
  // If target_school is just a string, return default policy (prevents crashes)
  if (typeof targetSchool === 'string') {
    console.warn('[anchorPolicy] Using default policy for string target_school:', targetSchool);
    return {
      partner_name: targetSchool,
      max_alt_credits: 60,
      min_residency_credits: 30,
      upper_division_min: 0,
    };
  }
  
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
