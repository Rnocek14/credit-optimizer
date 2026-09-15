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
  hasPolicy,
  type InstitutionCode 
} from '@/lib/degree/institutionPolicies';

/**
 * Extract anchor policy from constraints for year planner.
 *
 * Returns undefined when we have no policy for the target school. Callers
 * already handle undefined (it is returned when no target school is set at
 * all), and an absent policy is the honest answer.
 *
 * Until 2026-09-15 this defaulted to TESU: `codeMap[normalized] || 'TESU'`.
 * The map covered three schools, so UMGC, SNHU, Phoenix, Strayer and every
 * scrape-template institution code — all selectable in the anchor picker —
 * were silently validated against TESU's 15-credit residency and 90-credit
 * alt-credit pool. A student targeting a school with a 30-credit residency was
 * told 15 would do. The object branch was worse: any `school.code` was cast
 * straight to InstitutionCode with no check at all.
 */
export function getAnchorPolicyFromConstraints(
  constraints: Constraints
): PartnerPolicy | undefined {
  const targetSchool = constraints.target_school;
  if (!targetSchool) return undefined;

  // Known aliases → institution code. Every code here must exist in
  // institutionPolicies.ts; unknown input resolves to null, never a default.
  const codeMap: Record<string, InstitutionCode> = {
    'tesu': 'TESU',
    'thomas edison': 'TESU',
    'thomas edison state university': 'TESU',
    'wgu': 'WGU',
    'western governors': 'WGU',
    'western governors university': 'WGU',
    'cosc': 'COSC',
    'charter oak': 'COSC',
    'charter oak state college': 'COSC',
    'umgc': 'UMGC',
    'university of maryland global campus': 'UMGC',
    'snhu': 'SNHU',
    'southern new hampshire university': 'SNHU',
  };

  let institutionCode: InstitutionCode | null = null;
  let partnerName: string;

  if (typeof targetSchool === 'string') {
    partnerName = targetSchool;
    institutionCode = codeMap[targetSchool.trim().toLowerCase()] ?? null;
  } else if (targetSchool && typeof targetSchool === 'object') {
    const school = targetSchool as { name?: string; code?: string };
    partnerName = school.name || 'Unknown';
    const raw = (school.code || school.name || '').trim();
    // Resolve via the alias map, then verify the result is a code we hold a
    // policy for. Never trust a caller-supplied code unchecked.
    const candidate = codeMap[raw.toLowerCase()] ?? (raw.toUpperCase() as InstitutionCode);
    institutionCode = hasPolicy(candidate) ? candidate : null;
  } else {
    return undefined;
  }

  if (!institutionCode || !hasPolicy(institutionCode)) {
    console.warn(
      `[anchorPolicyAdapter] No policy for target school "${partnerName}" — ` +
      `returning undefined rather than substituting another school's policy.`
    );
    return undefined;
  }

  const centralPolicy = getPolicyOrDefault(institutionCode);
  if (!centralPolicy) return undefined;

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
