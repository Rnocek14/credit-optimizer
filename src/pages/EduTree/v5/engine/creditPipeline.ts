/**
 * Credit Decision Pipeline
 * 
 * SINGLE SOURCE OF TRUTH for all credit-based graduation eligibility decisions.
 * 
 * This module is the canonical entry point for:
 * - Determining graduation eligibility
 * - Calculating credit totals by classification
 * - Enforcing policy constraints
 * - Generating audit trails
 * 
 * NO SHORTCUTS. NO UI OVERRIDES. NO SPECIAL CASES.
 * All credit decisions MUST flow through evaluateCreditDecision().
 * 
 * Pipeline order (invariant):
 * 1. Policy verification (bucket mode present?)
 * 2. Credit classification (resident/transfer/alt)
 * 3. Residency check (FIRST - before transfer caps)
 * 4. Transfer/Alt cap checks
 * 5. Upper-division check
 * 6. Total credits check
 * 7. Compile violations
 * 8. Determine eligibility (binary: eligible | blocked)
 * 9. Generate audit trail
 */

import type { BasketItem } from '../state/usePlanBasket';
import type { PartnerPolicy } from './yearPlanner';
import type { Violation, BucketMode, PolicyData } from './constraints';
import { validatePlan } from './constraints';
import { 
  isResidentCredit, 
  isTransferCredit, 
  isAltCredit, 
  calculateCreditTotals 
} from '../utils/creditClassification';
import { countsTowardAltCap, calculateAltCreditsTotal } from '../utils/altCredit';
import { validateGraduationReadiness, type GraduationRequirementOverrides } from '../utils/graduationValidator';

// ============================================================================
// Types
// ============================================================================

export type InstitutionCode = 'TESU' | 'WGU' | 'COSC' | 'SNHU' | 'UMGC' | string;
export type DegreeLevel = 'bachelor' | 'associate';
export type Eligibility = 'eligible' | 'blocked';

export interface CreditDecisionInput {
  /** All courses in the student's plan */
  basket: BasketItem[];
  /** Target institution code (e.g., 'TESU', 'WGU') */
  institutionCode: InstitutionCode;
  /** Degree level affects total credit requirements */
  degreeLevel: DegreeLevel;
  /** Policy data from the institution */
  policy: PartnerPolicy & Partial<PolicyData>;
  /** Optional: residency variant (e.g., 'accelerate' for TESU fee waiver) */
  residencyVariant?: string;
}

export interface CreditTotals {
  /** Sum of all credits in basket */
  total: number;
  /** Credits earned at the target institution */
  resident: number;
  /** Credits from other accredited institutions (RA transfer) */
  transfer: number;
  /** Credits from non-collegiate sources (ACE/NCCRS, MOOCs, testing centers) */
  alt: number;
  /** Upper-division credits (300+ level) */
  upperDiv: number;
  /** Credits by provider code */
  byProvider: Record<string, number>;
}

export interface CreditDecisionOutput {
  // ============================================
  // Credit Totals
  // ============================================
  totals: CreditTotals;
  
  // ============================================
  // Eligibility (BINARY - no "almost")
  // ============================================
  /** Final eligibility determination */
  eligibility: Eligibility;
  /** Specific blockers preventing eligibility (if blocked) */
  blockers: string[];
  /** Warnings that don't block eligibility */
  warnings: string[];
  
  // ============================================
  // Validation Details
  // ============================================
  /** All violations from constraint checking */
  violations: Violation[];
  /** Graduation readiness breakdown */
  requirements: {
    totalCredits: { earned: number; required: number; met: boolean };
    residency: { earned: number; required: number; met: boolean };
    upperDivision: { earned: number; required: number; met: boolean };
    altCreditCap: { earned: number; limit: number; met: boolean };
    transferCap?: { earned: number; limit: number; met: boolean };
  };
  
  // ============================================
  // Policy Metadata (Audit Trail)
  // ============================================
  policy: {
    institution: InstitutionCode;
    degreeLevel: DegreeLevel;
    confidence: number;
    bucketMode: BucketMode;
    catalogYear?: string;
  };
  
  // ============================================
  // Reproducibility
  // ============================================
  hashes: {
    /** Hash of normalized input for reproducibility */
    input: string;
    /** Hash of output for verification */
    output: string;
  };
  /** Timestamp of evaluation */
  evaluatedAt: string;
}

// ============================================================================
// Hash Utilities (for reproducibility)
// ============================================================================

/**
 * Simple string hash for reproducibility checks.
 * Not cryptographic - just for diffing/verification.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Normalize basket for deterministic hashing.
 * Sort by courseId to ensure consistent ordering.
 */
function normalizeBasket(basket: BasketItem[]): BasketItem[] {
  return [...basket].sort((a, b) => a.courseId.localeCompare(b.courseId));
}

/**
 * Create input hash for audit trail.
 */
function hashInput(input: CreditDecisionInput): string {
  const normalized = {
    basket: normalizeBasket(input.basket).map(b => ({
      courseId: b.courseId,
      credits: b.credits,
      providerType: b.providerType,
      providerCode: (b as any).providerCode,
      level: (b as any).level,
    })),
    institutionCode: input.institutionCode,
    degreeLevel: input.degreeLevel,
    residencyVariant: input.residencyVariant,
  };
  return simpleHash(JSON.stringify(normalized));
}

/**
 * Create output hash for verification.
 * 
 * IMPORTANT: We hash normalized violation signatures (type + severity only)
 * to ensure stable hashes even if violation message copy changes.
 * Violations are sorted by type+severity for consistent ordering.
 */
function hashOutput(output: Omit<CreditDecisionOutput, 'hashes' | 'evaluatedAt'>): string {
  // Normalize violations to stable signature (type + severity only, sorted)
  const normalizedViolations = output.violations
    .map(v => ({ type: v.type, severity: v.severity }))
    .sort((a, b) => (a.type + a.severity).localeCompare(b.type + b.severity));
  
  const normalized = {
    totals: output.totals,
    eligibility: output.eligibility,
    blockers: [...output.blockers].sort(),
    violations: normalizedViolations,
  };
  return simpleHash(JSON.stringify(normalized));
}

// ============================================================================
// Core Pipeline
// ============================================================================

/**
 * Evaluate credit decision for a student's plan.
 * 
 * This is the SINGLE ENTRY POINT for all graduation eligibility decisions.
 * All UI components should call this function - never compute eligibility directly.
 * 
 * @param input - Credit decision input containing basket, institution, and policy
 * @returns Deterministic credit decision output with audit trail
 */
export function evaluateCreditDecision(input: CreditDecisionInput): CreditDecisionOutput {
  const { basket, institutionCode, degreeLevel, policy, residencyVariant } = input;
  
  // ============================================
  // Step 1: Policy Verification
  // ============================================
  const bucketMode: BucketMode = (policy as any).transfer_alt_bucket_mode ?? 'unknown';
  const policyConfidence = (policy as any).confidence ?? 50; // Default to low confidence if not set
  
  // ============================================
  // Step 2: Credit Classification
  // ============================================
  const classificationResults = calculateCreditTotals(
    basket.map(item => ({
      providerType: item.providerType,
      providerCode: (item as any).providerCode,
      isAltCredit: (item as any).isAltCredit,
      aceNccrs: (item as any).aceNccrs,
      credits: item.credits,
      courseId: item.courseId,
    })),
    institutionCode
  );
  
  // Upper-division calculation
  const upperDivCredits = basket
    .filter(item => ((item as any).level ?? 0) >= 300)
    .reduce((sum, item) => sum + item.credits, 0);
  
  const totals: CreditTotals = {
    total: classificationResults.total,
    resident: classificationResults.resident,
    transfer: classificationResults.transfer,
    alt: classificationResults.alt,
    upperDiv: upperDivCredits,
    byProvider: classificationResults.byProvider,
  };
  
  // ============================================
  // Step 3-6: Run Constraint Validation
  // ============================================
  // Build constraints object from policy
  const constraints = {
    target_school: institutionCode,
    max_ace_credits: policy.max_alt_credits,
    transfer_alt_bucket_mode: bucketMode,
    max_alt_credit: (policy as any).max_alt_credit ?? policy.max_alt_credits,
    max_transfer_credits: (policy as any).max_transfer_credits,
    max_transfer_alt_combined_credits: (policy as any).max_transfer_alt_combined_credits,
    min_upper_division_credits: (policy as any).upper_division_min ?? (policy as any).min_upper_division_credits,
  };
  
  const violations = validatePlan(basket, [], constraints as any);
  
  // ============================================
  // Step 7: Run Graduation Readiness Check
  // ============================================
  const overrides: GraduationRequirementOverrides = {
    requiredTotalCredits: degreeLevel === 'associate' 
      ? ((policy as any).totalCreditsAssociate ?? 60)
      : ((policy as any).totalCreditsBachelor ?? (policy as any).degree_credit_total ?? 120),
  };
  
  const readiness = validateGraduationReadiness(basket, policy, overrides);
  
  // ============================================
  // Step 8: Compile Violations & Determine Eligibility
  // ============================================
  // INVARIANT: Blockers are ordered consistently for deterministic output
  // Order: residency first, then cap violations, then upper-division, then other
  const residencyBlockers = readiness.blockers.filter(b => 
    b.toLowerCase().includes('residency') || b.toLowerCase().includes('resident')
  );
  const capBlockers = violations
    .filter(v => v.severity === 'error' && ['alt_cap', 'transfer_cap', 'combined_cap', 'total_transfer'].includes(v.type))
    .map(v => v.message);
  const upperDivBlockers = readiness.blockers.filter(b => 
    b.toLowerCase().includes('upper') || b.toLowerCase().includes('division')
  );
  const otherBlockers = [
    ...readiness.blockers.filter(b => 
      !residencyBlockers.includes(b) && !upperDivBlockers.includes(b)
    ),
    ...violations
      .filter(v => v.severity === 'error' && !['alt_cap', 'transfer_cap', 'combined_cap', 'total_transfer'].includes(v.type))
      .map(v => v.message),
  ];
  
  // Ordered: residency → caps → upper-div → other
  const allBlockers = [
    ...residencyBlockers,
    ...capBlockers,
    ...upperDivBlockers,
    ...otherBlockers,
  ];
  
  const allWarnings = [
    ...readiness.warnings,
    ...violations.filter(v => v.severity === 'warning').map(v => v.message),
  ];
  
  // ELIGIBILITY IS BINARY - no "almost"
  const eligibility: Eligibility = allBlockers.length === 0 ? 'eligible' : 'blocked';
  
  // ============================================
  // Step 9: Build Requirements Summary
  // ============================================
  const requirements = {
    totalCredits: {
      earned: readiness.totalCredits.earned,
      required: readiness.totalCredits.required,
      met: readiness.totalCredits.met,
    },
    residency: {
      earned: readiness.residency.earned,
      required: readiness.residency.required,
      met: readiness.residency.met,
    },
    upperDivision: {
      earned: readiness.upperDivision.earned,
      required: readiness.upperDivision.required,
      met: readiness.upperDivision.met,
    },
    altCreditCap: {
      earned: totals.alt,
      limit: policy.max_alt_credits,
      met: totals.alt <= policy.max_alt_credits,
    },
    transferCap: (constraints.max_transfer_credits != null) ? {
      earned: totals.transfer,
      limit: constraints.max_transfer_credits,
      met: totals.transfer <= constraints.max_transfer_credits,
    } : undefined,
  };
  
  // ============================================
  // Step 10: Generate Audit Trail
  // ============================================
  const evaluatedAt = new Date().toISOString();
  
  const outputWithoutHashes = {
    totals,
    eligibility,
    blockers: allBlockers,
    warnings: allWarnings,
    violations,
    requirements,
    policy: {
      institution: institutionCode,
      degreeLevel,
      confidence: policyConfidence,
      bucketMode,
      catalogYear: (policy as any).catalog_year,
    },
  };
  
  return {
    ...outputWithoutHashes,
    hashes: {
      input: hashInput(input),
      output: hashOutput(outputWithoutHashes),
    },
    evaluatedAt,
  };
}

// ============================================================================
// Convenience Helpers
// ============================================================================

/**
 * Quick eligibility check without full audit trail.
 * For UI components that just need to show a badge.
 */
export function isEligibleForGraduation(input: CreditDecisionInput): boolean {
  return evaluateCreditDecision(input).eligibility === 'eligible';
}

/**
 * Get blockers only (for UI display).
 */
export function getGraduationBlockers(input: CreditDecisionInput): string[] {
  return evaluateCreditDecision(input).blockers;
}

/**
 * Compare two baskets for equivalence (same eligibility outcome).
 */
export function compareDecisions(
  a: CreditDecisionOutput,
  b: CreditDecisionOutput
): { equivalent: boolean; differences: string[] } {
  const differences: string[] = [];
  
  if (a.eligibility !== b.eligibility) {
    differences.push(`Eligibility: ${a.eligibility} → ${b.eligibility}`);
  }
  if (a.totals.total !== b.totals.total) {
    differences.push(`Total credits: ${a.totals.total} → ${b.totals.total}`);
  }
  if (a.totals.alt !== b.totals.alt) {
    differences.push(`Alt credits: ${a.totals.alt} → ${b.totals.alt}`);
  }
  if (a.blockers.length !== b.blockers.length) {
    differences.push(`Blocker count: ${a.blockers.length} → ${b.blockers.length}`);
  }
  
  return {
    equivalent: differences.length === 0,
    differences,
  };
}
