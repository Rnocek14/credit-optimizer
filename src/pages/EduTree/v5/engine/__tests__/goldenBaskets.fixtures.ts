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
 * IMPORTANT: Add new fixtures here when discovering edge cases.
 * Do NOT modify existing fixtures without updating expected outputs.
 */

import type { BasketItem } from '../../state/usePlanBasket';
import type { CreditDecisionInput, Eligibility } from '../creditPipeline';

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
// Policy Templates
// ============================================================================

const TESU_BACHELOR_POLICY = {
  min_residency_credits: 15,
  max_alt_credits: 90,
  upper_division_min: 18,
  transfer_alt_bucket_mode: 'separate' as const,
  degree_credit_total: 120,
  totalCreditsBachelor: 120,
  confidence: 95,
  catalog_year: '2024-2025',
};

const WGU_BACHELOR_POLICY = {
  min_residency_credits: 0, // WGU doesn't have traditional residency
  max_alt_credits: 78,
  upper_division_min: 0, // Competency-based
  transfer_alt_bucket_mode: 'separate' as const,
  degree_credit_total: 121,
  totalCreditsBachelor: 121,
  confidence: 85,
  catalog_year: '2024-2025',
};

const TESU_ASSOCIATE_POLICY = {
  min_residency_credits: 9,
  max_alt_credits: 45,
  upper_division_min: 0,
  transfer_alt_bucket_mode: 'separate' as const,
  degree_credit_total: 60,
  totalCreditsAssociate: 60,
  confidence: 95,
  catalog_year: '2024-2025',
};

const COSC_COMBINED_POLICY = {
  min_residency_credits: 30,
  max_alt_credits: 0, // Not tracked separately
  max_transfer_alt_combined_credits: 90,
  upper_division_min: 0,
  transfer_alt_bucket_mode: 'combined' as const,
  degree_credit_total: 120,
  totalCreditsBachelor: 120,
  confidence: 80,
  catalog_year: '2024-2025',
};

// ============================================================================
// Golden Baskets
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
    /** Key assertions that must be true */
    assertions: string[];
  };
}

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
        // 30 credits from TESU (resident)
        ...Array.from({ length: 10 }, (_, i) => createBasketItem({
          courseId: `TESU-${100 + i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: i < 6 ? 100 : 300, // Mix of lower and upper div
        })),
        // 60 credits from RA transfer
        ...Array.from({ length: 20 }, (_, i) => createBasketItem({
          courseId: `TRANSFER-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER_UNIV',
          level: i < 14 ? 200 : 300,
        })),
        // 30 credits from alt (MOOCs)
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
        'totals.total === 120',
        'totals.resident >= 15',
        'totals.alt <= 90',
        'totals.upperDiv >= 18',
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
        // 6 credits from TESU (accelerate variant minimum)
        ...Array.from({ length: 2 }, (_, i) => createBasketItem({
          courseId: `TESU-ACC-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 114 credits from RA transfer + alt
        ...Array.from({ length: 20 }, (_, i) => createBasketItem({
          courseId: `TRANSFER-ACC-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER_UNIV',
          level: i < 10 ? 100 : 300,
        })),
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
        'totals.total === 120',
        'totals.resident >= 6',
        'totals.alt <= 90',
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
        // 15 resident credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `TESU-RES-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 15 RA transfer credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `RA-XFER-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 300,
        })),
        // 90 alt credits (exactly at cap)
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
        'totals.alt === 90',
        'requirements.altCreditCap.met === true',
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
        // 15 resident credits
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `TESU-OVER-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 14 RA transfer
        ...Array.from({ length: 14 }, (_, i) => createBasketItem({
          courseId: `RA-OVER-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: 'OTHER',
          level: 200,
        })),
        // 91 alt credits (1 over cap)
        ...Array.from({ length: 13 }, (_, i) => createBasketItem({
          courseId: `ALT-OVER-${i}`,
          credits: 7,
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
      eligibility: 'blocked',
      blockerCount: 1, // At least one blocker
      assertions: [
        'totals.alt > 90',
        'requirements.altCreditCap.met === false',
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
        // 42 resident (WGU) - rest is alt
        ...Array.from({ length: 14 }, (_, i) => createBasketItem({
          courseId: `WGU-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'WGU',
          level: 300,
        })),
        // 79 alt credits
        ...Array.from({ length: 79 }, (_, i) => createBasketItem({
          courseId: `ALT-WGU-${i}`,
          credits: 1,
          providerType: 'testing_center',
          providerCode: 'CLEP',
          level: 100,
        })),
      ],
      institutionCode: 'WGU',
      degreeLevel: 'bachelor',
      policy: WGU_BACHELOR_POLICY as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        'totals.alt === 79',
        'totals.alt > 78',
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
        // 14 resident credits (1 short)
        ...Array.from({ length: 7 }, (_, i) => createBasketItem({
          courseId: `TESU-SHORT-${i}`,
          credits: 2,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // Fill with transfer to reach 120
        ...Array.from({ length: 53 }, (_, i) => createBasketItem({
          courseId: `XFER-SHORT-${i}`,
          credits: 2,
          providerType: 'university',
          providerCode: 'OTHER',
          level: i < 20 ? 300 : 100,
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
        'totals.resident === 14',
        'requirements.residency.met === false',
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
        // 15 resident credits exactly
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `TESU-EXACT-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // Fill with transfer (no alt to stay under caps)
        ...Array.from({ length: 35 }, (_, i) => createBasketItem({
          courseId: `XFER-EXACT-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'OTHER',
          level: i < 3 ? 300 : 100,
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
        'totals.resident === 15',
        'requirements.residency.met === true',
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
        // 17 upper-div (1 short)
        ...Array.from({ length: 17 }, (_, i) => createBasketItem({
          courseId: `UPPER-SHORT-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // Fill with lower-div
        ...Array.from({ length: 103 }, (_, i) => createBasketItem({
          courseId: `LOWER-${i}`,
          credits: 1,
          providerType: 'university',
          providerCode: i < 50 ? 'TESU' : 'OTHER',
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
        'totals.upperDiv === 17',
        'requirements.upperDivision.met === false',
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
        // transfer_alt_bucket_mode: missing!
        confidence: 30,
      } as any,
    },
    expected: {
      eligibility: 'blocked',
      blockerCount: 1,
      assertions: [
        'violations.some(v => v.type === "policy_unverified")',
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
        // 15 resident
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
          courseId: `RES-NULL-${i}`,
          credits: 3,
          providerType: 'university',
          providerCode: 'TESU',
          level: 300,
        })),
        // 100 with null providerType (should count as alt)
        ...Array.from({ length: 100 }, (_, i) => createBasketItem({
          courseId: `NULL-PROV-${i}`,
          credits: 1,
          providerType: null,
          level: 100,
        })),
        // 5 more credits to reach 120
        ...Array.from({ length: 5 }, (_, i) => createBasketItem({
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
        'totals.alt === 100', // null providerType = alt
        'totals.alt > 90', // Over cap
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
