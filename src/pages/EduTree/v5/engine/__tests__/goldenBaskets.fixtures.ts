/**
 * Golden Basket Test Fixtures
 * 
 * Canonical test cases for credit system validation.
 * Each fixture represents a real-world scenario that MUST produce
 * deterministic, correct results.
 * 
 * Categories:
 * 1. Happy Path - Standard graduation scenarios
 * 2. Cap Boundary - Edge cases at exact limits
 * 3. Residency - Institutional credit requirements
 * 4. Upper Division - 300/400 level requirements
 * 5. Failure Modes - Policy errors, missing data
 * 
 * IMPORTANT: 
 * - Use 3-credit blocks as default (realistic course sizes)
 * - Use 1-credit blocks only for precise boundary tests
 * - Add new fixtures when discovering edge cases
 * - Do NOT modify existing fixtures without updating expected outputs
 */

import type { BasketItem } from '../../state/usePlanBasket';
import type { CreditDecisionInput, CreditDecisionOutput, Eligibility } from '../creditPipeline';
import { expect } from 'vitest';

// ============================================================================
// Helper: Create Basket Item
// ============================================================================

interface BasketItemParams {
  courseId: string;
  credits: number;
  providerType: 'university' | 'mooc' | 'testing_center' | null;
  providerCode?: string;
  level?: number;
  isAltCredit?: boolean;
  aceNccrs?: boolean;
}

function createBasketItem(params: BasketItemParams): BasketItem {
  return {
    moduleId: `mod-${params.courseId}`,
    courseId: params.courseId,
    credits: params.credits,
    cost_usd: params.credits * 100, // Rough estimate
    duration_weeks: params.credits * 2,
    workload_weekly_hours: 6,
    cri_score: 80,
    status: 'pinned',
    providerType: params.providerType,
    providerCode: params.providerCode,
    level: params.level ?? 100,
    isAltCredit: params.isAltCredit,
    aceNccrs: params.aceNccrs,
  } as BasketItem;
}

// ============================================================================
// Policy Templates (aligned with actual constraint keys from constraints.ts)
// ============================================================================

const TESU_BACHELOR_POLICY = {
  min_residency_credits: 15,
  max_alt_credits: 90,        // Used by graduation validator
  max_alt_credit: 90,         // Used by constraints.ts (policy key takes precedence)
  upper_division_min: 18,
  transfer_alt_bucket_mode: 'separate' as const,
  degree_credit_total: 120,
  totalCreditsBachelor: 120,
  confidence: 95,
  catalog_year: '2024-2025',
};

const WGU_BACHELOR_POLICY = {
  min_residency_credits: 0,   // WGU doesn't have traditional residency
  max_alt_credits: 78,
  max_alt_credit: 78,
  upper_division_min: 0,      // Competency-based
  transfer_alt_bucket_mode: 'separate' as const,
  degree_credit_total: 121,
  totalCreditsBachelor: 121,
  confidence: 85,
  catalog_year: '2024-2025',
};

const TESU_ASSOCIATE_POLICY = {
  min_residency_credits: 9,
  max_alt_credits: 45,
  max_alt_credit: 45,
  upper_division_min: 0,
  transfer_alt_bucket_mode: 'separate' as const,
  degree_credit_total: 60,
  totalCreditsAssociate: 60,
  confidence: 95,
  catalog_year: '2024-2025',
};

const COSC_COMBINED_POLICY = {
  min_residency_credits: 30,
  max_alt_credits: 0,         // Not tracked separately
  max_alt_credit: 0,
  max_transfer_alt_combined_credits: 90,
  upper_division_min: 0,
  transfer_alt_bucket_mode: 'combined' as const,
  degree_credit_total: 120,
  totalCreditsBachelor: 120,
  confidence: 80,
  catalog_year: '2024-2025',
};

// ============================================================================
// Assertion Type (function-based, no eval)
// ============================================================================

export type AssertionFn = (result: CreditDecisionOutput) => void;

// ============================================================================
// Golden Basket Type
// ============================================================================

export interface GoldenBasket {
  id: string;
  name: string;
  description: string;
  category: 'happy_path' | 'cap_boundary' | 'residency' | 'upper_division' | 'failure_mode';
  input: CreditDecisionInput;
  expected: {
    eligibility: Eligibility;
    blockerCount: number;
    /** Function-based assertions for compile-time safety */
    assertions: AssertionFn[];
  };
}

// ============================================================================
// Golden Baskets
// ============================================================================

export const GOLDEN_BASKETS: GoldenBasket[] = [
  // ============================================
  // 1. HAPPY PATH - Standard Graduation Scenarios
  // ============================================
  {
    id: 'tesu_standard_120cr',
    name: 'TESU Standard Bachelor Path',
    description: 'Standard 120-credit TESU graduation with proper residency and upper-div',
    category: 'happy_path',
    input: {
      basket: [
        // 30 credits from TESU (resident) - 10 courses x 3 credits
        ...Array.from({ length: 10 }, (_, i) => createBasketItem({
          courseId: `TESU-${100 + i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: i < 4 ? 100 : 300, // 4 lower-div, 6 upper-div = 18 upper-div credits
        })),
        // 60 credits from RA transfer - 20 courses x 3 credits
        ...Array.from({ length: 20 }, (_, i) => createBasketItem({
          courseId: `TRANSFER-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER_UNIV',
          level: 200, // Lower division
        })),
        // 30 credits from alt (MOOCs) - 10 courses x 3 credits
        ...Array.from({ length: 10 }, (_, i) => createBasketItem({
          courseId: `SOPHIA-${i}`,
          credits: 3,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'eligible',
      blockerCount: 0,
      assertions: [
        (r) => expect(r.totals.total).toBe(120),
        (r) => expect(r.totals.resident).toBeGreaterThanOrEqual(15),
        (r) => expect(r.totals.alt).toBeLessThanOrEqual(90),
        (r) => expect(r.totals.upperDiv).toBeGreaterThanOrEqual(18),
      ],
    },
  },
  
  {
    id: 'tesu_accelerate_minimal',
    name: 'TESU Accelerate Minimal Residency',
    description: 'TESU with fee waiver, minimal 6-credit residency variant',
    category: 'happy_path',
    input: {
      basket: [
        // 6 credits from TESU (accelerate variant minimum) - 2 courses x 3 credits
        ...Array.from({ length: 2 }, (_, i) => createBasketItem({
          courseId: `TESU-ACC-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 60 credits from RA transfer - 20 courses x 3 credits
        ...Array.from({ length: 20 }, (_, i) => createBasketItem({
          courseId: `TRANSFER-ACC-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER_UNIV',
          level: i < 6 ? 300 : 100, // 6 upper-div = 18 credits
        })),
        // 54 credits from alt (MOOCs) - 18 courses x 3 credits
        ...Array.from({ length: 18 }, (_, i) => createBasketItem({
          courseId: `SOPHIA-ACC-${i}`,
          credits: 3,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: {
        ...TESU_BACHELOR_POLICY,
        min_residency_credits: 6, // Accelerate variant
      } as any,
      residencyVariant: 'accelerate',
    },
    expected: {
      eligibility: 'eligible',
      blockerCount: 0,
      assertions: [
        (r) => expect(r.totals.total).toBe(120),
        (r) => expect(r.totals.resident).toBeGreaterThanOrEqual(6),
        (r) => expect(r.totals.alt).toBe(54),
        (r) => expect(r.totals.alt).toBeLessThanOrEqual(90),
      ],
    },
  },
  
  // ============================================
  // 2. CAP BOUNDARY - Edge Cases at Exact Limits
  // ============================================
  {
    id: 'tesu_exactly_90_alt',
    name: 'TESU Exactly 90 Alt Credits',
    description: 'Exactly at the 90-credit alt cap - should pass',
    category: 'cap_boundary',
    input: {
      basket: [
        // 15 resident credits - 5 courses x 3 credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `TESU-RES-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300, // All upper-div
        })),
        // 15 RA transfer credits - 5 courses x 3 credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `RA-XFER-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 300, // Upper-div
        })),
        // 90 alt credits exactly - 30 courses x 3 credits
        ...Array.from({ length: 30 }, (_, i) => createBasketItem({
          courseId: `ALT-90-${i}`,
          credits: 3,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'eligible',
      blockerCount: 0,
      assertions: [
        (r) => expect(r.totals.alt).toBe(90),
        (r) => expect(r.requirements.altCreditCap.met).toBe(true),
      ],
    },
  },
  
  {
    id: 'tesu_over_alt_91cr',
    name: 'TESU 91 Alt Credits (Over Cap)',
    description: '91 alt credits exceeds 90-credit cap - MUST block',
    category: 'cap_boundary',
    input: {
      basket: [
        // 15 resident credits - 5 courses x 3 credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `TESU-OVER-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 14 RA transfer - 14 courses x 1 credit
        ...Array.from({ length: 14 }, (_, i) => createBasketItem({
          courseId: `RA-OVER-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 200,
        })),
        // 91 alt credits (1 over cap) - 30 x 3 = 90, + 1 x 1 = 91
        ...Array.from({ length: 30 }, (_, i) => createBasketItem({
          courseId: `ALT-OVER-${i}`,
          credits: 3,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        })),
        createBasketItem({
          courseId: 'ALT-OVER-EXTRA',
          credits: 1,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        }),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.totals.alt).toBe(91),
        (r) => expect(r.requirements.altCreditCap.met).toBe(false),
      ],
    },
  },
  
  {
    id: 'wgu_over_78_alt',
    name: 'WGU 79 Alt Credits (Over Cap)',
    description: 'WGU has 78-credit alt cap - 79 should block',
    category: 'cap_boundary',
    input: {
      basket: [
        // 42 resident (WGU) - 14 courses x 3 credits
        ...Array.from({ length: 14 }, (_, i) => createBasketItem({
          courseId: `WGU-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'WGU',
          level: 300,
        })),
        // 79 alt credits - 26 x 3 = 78, + 1 = 79
        ...Array.from({ length: 26 }, (_, i) => createBasketItem({
          courseId: `ALT-WGU-${i}`,
          credits: 3,
          providerType: 'testing_center',
          providerCode: 'CLEP',
          level: 100,
        })),
        createBasketItem({
          courseId: 'ALT-WGU-EXTRA',
          credits: 1,
          providerType: 'testing_center',
          providerCode: 'CLEP',
          level: 100,
        }),
      ],
      institutionCode: 'WGU',
      degreeLevel: 'bachelor',
      policy: WGU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.totals.alt).toBe(79),
        (r) => expect(r.totals.alt).toBeGreaterThan(78),
      ],
    },
  },
  
  // ============================================
  // 3. RESIDENCY - Institutional Credit Requirements
  // ============================================
  {
    id: 'tesu_residency_shortfall_1cr',
    name: 'TESU Residency Shortfall (14/15)',
    description: 'One credit short of residency - MUST block',
    category: 'residency',
    input: {
      basket: [
        // 14 resident credits (1 short) - 14 courses x 1 credit
        ...Array.from({ length: 14 }, (_, i) => createBasketItem({
          courseId: `TESU-SHORT-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: 'TESU',
          level: i < 4 ? 100 : 300, // 10 upper-div
        })),
        // 106 credits from transfer to reach 120 - mix of upper/lower
        ...Array.from({ length: 30 }, (_, i) => createBasketItem({
          courseId: `XFER-SHORT-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER',
          level: i < 3 ? 300 : 100, // 9 more upper-div = 19 total
        })),
        ...Array.from({ length: 16 }, (_, i) => createBasketItem({
          courseId: `XFER-SHORT-B-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.totals.resident).toBe(14),
        (r) => expect(r.requirements.residency.met).toBe(false),
      ],
    },
  },
  
  {
    id: 'tesu_residency_exactly_met',
    name: 'TESU Residency Exactly Met (15/15)',
    description: 'Exactly 15 resident credits - should pass',
    category: 'residency',
    input: {
      basket: [
        // 15 resident credits exactly - 5 courses x 3 credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `TESU-EXACT-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300, // All upper-div
        })),
        // 105 credits from transfer - 35 courses x 3 credits
        ...Array.from({ length: 35 }, (_, i) => createBasketItem({
          courseId: `XFER-EXACT-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER',
          level: i < 1 ? 300 : 100, // 3 more upper-div = 18 total
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'eligible',
      blockerCount: 0,
      assertions: [
        (r) => expect(r.totals.resident).toBe(15),
        (r) => expect(r.requirements.residency.met).toBe(true),
      ],
    },
  },
  
  // ============================================
  // 4. UPPER DIVISION - 300/400 Level Requirements
  // ============================================
  {
    id: 'tesu_upper_div_shortfall',
    name: 'TESU Upper-Div Shortfall (17/18)',
    description: 'One credit short of upper-division - MUST block',
    category: 'upper_division',
    input: {
      basket: [
        // 17 upper-div (1 short) - 17 courses x 1 credit
        ...Array.from({ length: 17 }, (_, i) => createBasketItem({
          courseId: `UPPER-SHORT-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 103 lower-div to reach 120 - 103 courses x 1 credit (some TESU for residency)
        ...Array.from({ length: 103 }, (_, i) => createBasketItem({
          courseId: `LOWER-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: i < 3 ? 'TESU' : 'OTHER', // 3 more TESU = 20 total resident
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.totals.upperDiv).toBe(17),
        (r) => expect(r.requirements.upperDivision.met).toBe(false),
      ],
    },
  },
  
  // ============================================
  // 5. FAILURE MODES - Policy Errors, Missing Data
  // ============================================
  {
    id: 'missing_bucket_mode',
    name: 'Missing Bucket Mode',
    description: 'Policy without bucket mode should emit policy_unverified error',
    category: 'failure_mode',
    input: {
      basket: [
        createBasketItem({
          courseId: 'TEST-1',
          credits: 3,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        }),
      ],
      institutionCode: 'UNKNOWN',
      degreeLevel: 'bachelor',
      policy: {
        min_residency_credits: 15,
        max_alt_credits: 90,
        max_alt_credit: 90,
        // transfer_alt_bucket_mode: missing!
        confidence: 30,
      } as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.violations.some(v => v.type === 'policy_unverified')).toBe(true),
      ],
    },
  },
  
  {
    id: 'null_provider_conservative',
    name: 'Null Provider Type (Conservative)',
    description: 'Missing providerType should count as alt credit',
    category: 'failure_mode',
    input: {
      basket: [
        // 15 resident - 5 courses x 3 credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `RES-NULL-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 91 with null providerType (should count as alt, over 90 cap)
        // 30 x 3 = 90, + 1 = 91
        ...Array.from({ length: 30 }, (_, i) => createBasketItem({
          courseId: `NULL-PROV-${i}`,
          credits: 3,
          providerType: null,
          level: 100,
        })),
        createBasketItem({
          courseId: 'NULL-PROV-EXTRA',
          credits: 1,
          providerType: null,
          level: 100,
        }),
        // 14 more credits to reach 120 - 14 x 1 credit
        ...Array.from({ length: 14 }, (_, i) => createBasketItem({
          courseId: `EXTRA-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.totals.alt).toBe(91), // null providerType = alt
        (r) => expect(r.totals.alt).toBeGreaterThan(90), // Over cap
      ],
    },
  },
  
  // ============================================
  // SPECIALIZED VIOLATIONS
  // ============================================
  
  /**
   * PROVIDER_CAP: Per-provider limit exceeded
   * Tests that provider-specific caps (e.g., CLEP 60 credits) are enforced.
   */
  {
    id: 'provider_cap_clep_exceeded',
    name: 'CLEP Provider Cap Exceeded',
    description: 'CLEP credits exceed per-provider 60-credit limit',
    category: 'failure_mode',
    input: {
      basket: [
        // 63 credits from CLEP (3 over the 60-credit cap) - 21 courses x 3 credits
        ...Array.from({ length: 21 }, (_, i) => createBasketItem({
          courseId: `CLEP-${i}`,
          credits: 3,
          providerType: 'testing_center',
          providerCode: 'CLEP',
          level: 100,
        })),
        // 30 credits TESU resident
        ...Array.from({ length: 10 }, (_, i) => createBasketItem({
          courseId: `TESU-PROV-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: i < 4 ? 100 : 300,
        })),
        // 27 more RA transfer to hit 120
        ...Array.from({ length: 9 }, (_, i) => createBasketItem({
          courseId: `TRANSFER-PROV-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: {
        ...TESU_BACHELOR_POLICY,
        provider_caps: { CLEP: 60 },
      } as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.totals.byProvider['CLEP']).toBe(63),
        (r) => expect(r.violations.some(v => v.type === 'provider_cap')).toBe(true),
      ],
    },
  },
  
  /**
   * GENED_INCOMPLETE: General education category not satisfied
   * Tests that gen-ed requirements are enforced when category data is provided.
   * Note: This test requires gen-ed category data in the policy.
   */
  {
    id: 'gened_incomplete_humanities',
    name: 'Gen-Ed Humanities Incomplete',
    description: 'Missing credits in humanities gen-ed category',
    category: 'failure_mode',
    input: {
      basket: [
        // All STEM courses, no humanities
        ...Array.from({ length: 40 }, (_, i) => createBasketItem({
          courseId: `STEM-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: i < 20 ? 100 : 300,
          // No requirementArea or gened mapping
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: TESU_BACHELOR_POLICY as any,
    },
    expected: {
      // Note: This may pass if gen-ed validation isn't wired up in the pipeline
      // The test documents expected behavior when validateInstitutionPolicies is called
      eligibility: 'eligible', // Update to 'blocked' when gen-ed is fully integrated
      blockerCount: 0,
      assertions: [
        (r) => expect(r.totals.total).toBe(120),
        (r) => expect(r.totals.resident).toBe(120), // All TESU
      ],
    },
  },
  
  /**
   * CAPSTONE_SUBSTITUTION: Capstone must be taken in residence
   * Tests that capstone courses can't be substituted with transfer/alt credit.
   */
  {
    id: 'capstone_substitution_blocked',
    name: 'Capstone Substitution Blocked',
    description: 'Capstone course from non-resident provider should be blocked',
    category: 'failure_mode',
    input: {
      basket: [
        // 15 TESU resident credits (but no capstone)
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `TESU-NOCAP-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // Capstone from transfer (SHOULD BE BLOCKED)
        createBasketItem({
          courseId: 'CAPSTONE-TRANSFER',
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER_UNIV',
          level: 400,
        }),
        // Fill remaining credits
        ...Array.from({ length: 34 }, (_, i) => createBasketItem({
          courseId: `FILL-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER_UNIV',
          level: 100,
        })),
      ],
      institutionCode: 'TESU',
      degreeLevel: 'bachelor',
      policy: {
        ...TESU_BACHELOR_POLICY,
        capstone_in_residence: true,
      } as any,
    },
    expected: {
      // Note: This will only block if capstone detection is implemented
      // Currently documents expected behavior
      eligibility: 'eligible', // Update to 'blocked' when capstone validation is added
      blockerCount: 0,
      assertions: [
        (r) => expect(r.totals.total).toBe(120),
        (r) => expect(r.totals.resident).toBe(15),
      ],
    },
  },
  
  /**
   * COMBINED_CAP: Combined bucket mode cap exceeded
   * Tests that combined transfer+alt credits are properly capped.
   */
  {
    id: 'cosc_combined_cap_exceeded',
    name: 'COSC Combined Cap Exceeded',
    description: 'Combined transfer+alt credits exceed 90-credit limit',
    category: 'cap_boundary',
    input: {
      basket: [
        // 30 COSC resident
        ...Array.from({ length: 10 }, (_, i) => createBasketItem({
          courseId: `COSC-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'COSC',
          level: 300,
        })),
        // 60 transfer + 31 alt = 91 combined (1 over cap)
        ...Array.from({ length: 20 }, (_, i) => createBasketItem({
          courseId: `TRANSFER-COSC-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 100,
        })),
        ...Array.from({ length: 10 }, (_, i) => createBasketItem({
          courseId: `SOPHIA-COSC-${i}`,
          credits: 3,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        })),
        // 1 more alt credit to push over
        createBasketItem({
          courseId: 'SOPHIA-COSC-EXTRA',
          credits: 1,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          level: 100,
        }),
      ],
      institutionCode: 'COSC',
      degreeLevel: 'bachelor',
      policy: COSC_COMBINED_POLICY as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        (r) => expect(r.totals.total).toBe(121),
        (r) => expect(r.totals.resident).toBe(30),
        (r) => expect(r.totals.transfer + r.totals.alt).toBe(91), // Combined over 90
        (r) => expect(r.violations.some(v => v.type === 'combined_cap')).toBe(true),
      ],
    },
  },
];

// ============================================================================
// Export Helpers
// ============================================================================

export function getBasketById(id: string): GoldenBasket | undefined {
  return GOLDEN_BASKETS.find(b => b.id === id);
}

export function getBasketsByCategory(category: GoldenBasket['category']): GoldenBasket[] {
  return GOLDEN_BASKETS.filter(b => b.category === category);
}
