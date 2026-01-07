/**
 * Anchor Policy Adapter - Extract PartnerPolicy from Constraints
 * NOTE: Policy values come from src/lib/degree/institutionPolicies.ts (single source of truth)
 */

import type { Constraints } from '../state/usePlanBasket';
import type { PartnerPolicy } from '../engine/yearPlanner';
import { 
  getPolicyOrDefault, 
  getNoncollegiateCap, 
  getResidencyCredits,
  type InstitutionCode 
} from '@/lib/degree/institutionPolicies';

/**
 * Extract anchor policy from constraints for year planner
 * Uses central policy service - NO hardcoded fallbacks allowed
 */
export function getAnchorPolicyFromConstraints(
  constraints: Constraints
): PartnerPolicy | undefined {
  const targetSchool = constraints.target_school;
  if (!targetSchool) return undefined;
  
  // Extract institution code from target_school
  let institutionCode: InstitutionCode = 'TESU'; // Default to TESU via central service
  let partnerName = 'Thomas Edison State University';
  
  if (typeof targetSchool === 'string') {
    // Map string to institution code
    // Map known school names to institution codes (only supported codes)
    const codeMap: Partial<Record<string, InstitutionCode>> = {
      'tesu': 'TESU',
      'thomas edison': 'TESU',
      'thomas edison state university': 'TESU',
      'wgu': 'WGU',
      'western governors': 'WGU',
      'cosc': 'COSC',
      'charter oak': 'COSC',
      // Other institutions default to TESU via getPolicyOrDefault()
    };
    const normalized = targetSchool.toLowerCase();
    institutionCode = codeMap[normalized] || 'TESU';
    partnerName = targetSchool;
  } else if (typeof targetSchool === 'object') {
    const school = targetSchool as any;
    partnerName = school.name || 'Unknown';
    // Try to extract code from object
    if (school.code) {
      institutionCode = school.code as InstitutionCode;
    }
  }
  
  // Get policy from central service (single source of truth)
  const centralPolicy = getPolicyOrDefault(institutionCode);
  
  return {
    partner_name: partnerName,
    max_alt_credits: getNoncollegiateCap(institutionCode),
    min_residency_credits: getResidencyCredits(institutionCode, 'standard'),
    upper_division_min: centralPolicy.upperDivisionAreaOfStudyMin,
    notes: `Policy from central service for ${institutionCode}`,
  };
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
