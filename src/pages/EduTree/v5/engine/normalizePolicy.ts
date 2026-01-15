/**
 * Policy Normalizer
 * 
 * SINGLE SOURCE OF TRUTH for policy key resolution.
 * 
 * This module eliminates "which key is the truth?" bugs by:
 * 1. Accepting raw policy objects with various key names
 * 2. Producing a canonical NormalizedPolicy shape
 * 3. Enforcing precedence rules (policy keys > constraint keys)
 * 
 * Usage:
 * ```ts
 * const normalized = normalizePolicy(rawPolicy, constraints);
 * // Now use normalized.maxAltCredits instead of guessing which key
 * ```
 */

import type { BucketMode, PolicyData } from './constraints';
import type { PartnerPolicy } from './yearPlanner';
import type { Constraints } from '../state/usePlanBasket';

/**
 * Normalized policy shape with canonical field names.
 * All downstream code should use this shape, not raw policy objects.
 */
export interface NormalizedPolicy {
  // ============================================
  // Bucket Mode (CRITICAL - determines cap enforcement)
  // ============================================
  /** How transfer/alt credits are counted: separate buckets or combined */
  bucketMode: BucketMode;
  
  // ============================================
  // Credit Caps
  // ============================================
  /** Maximum alt-credit (ACE/NCCRS/MOOC/testing) */
  maxAltCredits?: number;
  /** Maximum RA transfer credits */
  maxTransferCredits?: number;
  /** Maximum combined transfer+alt (only used when bucketMode='combined') */
  maxCombinedCredits?: number;
  /** Per-provider caps (e.g., { CLEP: 60 }) */
  providerCaps?: Record<string, number>;
  
  // ============================================
  // Graduation Requirements
  // ============================================
  /** Total credits required for degree */
  requiredTotalCredits: number;
  /** Minimum credits that must be earned in residence */
  minResidencyCredits?: number;
  /** Minimum upper-division (300+) credits */
  upperDivisionMin?: number;
  /** Whether capstone must be taken in residence */
  capstoneInResidence?: boolean;
  
  // ============================================
  // Metadata
  // ============================================
  /** Institution code (e.g., 'TESU', 'WGU') */
  institutionCode: string;
  /** Degree level */
  degreeLevel: 'bachelor' | 'associate';
  /** Policy confidence score (0-100) */
  confidence: number;
  /** Catalog year for this policy */
  catalogYear?: string;
}

/**
 * Raw policy input that may have various key names.
 * This captures all the ways policy data might be structured.
 */
type RawPolicy = PartnerPolicy & Partial<PolicyData> & {
  // Alt credit keys (precedence: max_alt_credit > max_alt_credits > max_ace_credits)
  max_alt_credit?: number;
  max_alt_credits?: number;
  max_ace_credits?: number;
  
  // Total credit keys
  totalCreditsBachelor?: number;
  totalCreditsAssociate?: number;
  degree_credit_total?: number;
  
  // Residency keys
  residency_credits?: number;
  min_residency_credits?: number;
  
  // Upper division keys
  upper_division_min?: number;
  min_upper_division_credits?: number;
  
  // Metadata
  confidence?: number;
  catalog_year?: string;
  
  // Bucket mode
  transfer_alt_bucket_mode?: BucketMode;
};

/**
 * Default values for when policy data is missing.
 */
const DEFAULTS = {
  BACHELOR_TOTAL_CREDITS: 120,
  ASSOCIATE_TOTAL_CREDITS: 60,
  CONFIDENCE_UNVERIFIED: 50,
  BUCKET_MODE_UNKNOWN: 'unknown' as BucketMode,
};

/**
 * Normalize a raw policy object into the canonical shape.
 * 
 * Precedence rules:
 * - Policy-specific keys take precedence over constraint keys
 * - More specific keys take precedence over generic keys
 * 
 * @param rawPolicy - Raw policy object with various key names
 * @param constraints - Optional constraints that may contain fallback values
 * @param institutionCode - Target institution code
 * @param degreeLevel - Degree level (affects default total credits)
 * @returns Normalized policy with canonical field names
 */
export function normalizePolicy(
  rawPolicy: RawPolicy,
  institutionCode: string,
  degreeLevel: 'bachelor' | 'associate',
  constraints?: Partial<Constraints>
): NormalizedPolicy {
  // ============================================
  // Bucket Mode
  // ============================================
  const bucketMode: BucketMode = 
    rawPolicy.transfer_alt_bucket_mode ?? 
    DEFAULTS.BUCKET_MODE_UNKNOWN;
  
  // ============================================
  // Alt Credit Cap (precedence: policy > constraints)
  // ============================================
  // Policy keys: max_alt_credit > max_alt_credits
  const policyAltCap = rawPolicy.max_alt_credit ?? rawPolicy.max_alt_credits;
  // Constraint key: max_ace_credits
  const constraintAltCap = constraints?.max_ace_credits;
  const maxAltCredits = policyAltCap ?? constraintAltCap;
  
  // ============================================
  // Transfer Credit Cap
  // ============================================
  const maxTransferCredits = rawPolicy.max_transfer_credits;
  
  // ============================================
  // Combined Credit Cap
  // ============================================
  const maxCombinedCredits = rawPolicy.max_transfer_alt_combined_credits;
  
  // ============================================
  // Total Credits Required
  // ============================================
  const requiredTotalCredits = 
    degreeLevel === 'associate'
      ? (rawPolicy.totalCreditsAssociate ?? rawPolicy.degree_credit_total ?? DEFAULTS.ASSOCIATE_TOTAL_CREDITS)
      : (rawPolicy.totalCreditsBachelor ?? rawPolicy.degree_credit_total ?? DEFAULTS.BACHELOR_TOTAL_CREDITS);
  
  // ============================================
  // Residency Credits
  // ============================================
  const minResidencyCredits = 
    rawPolicy.residency_credits ?? 
    rawPolicy.min_residency_credits;
  
  // ============================================
  // Upper Division
  // ============================================
  const upperDivisionMin = 
    rawPolicy.upper_division_min ?? 
    rawPolicy.min_upper_division_credits ??
    (constraints as any)?.min_upper_division_credits;
  
  // ============================================
  // Capstone
  // ============================================
  const capstoneInResidence = rawPolicy.capstone_in_residence;
  
  // ============================================
  // Provider Caps
  // ============================================
  const providerCaps = rawPolicy.provider_caps;
  
  // ============================================
  // Metadata
  // ============================================
  const confidence = rawPolicy.confidence ?? DEFAULTS.CONFIDENCE_UNVERIFIED;
  const catalogYear = rawPolicy.catalog_year;
  
  return {
    bucketMode,
    maxAltCredits,
    maxTransferCredits,
    maxCombinedCredits,
    providerCaps,
    requiredTotalCredits,
    minResidencyCredits,
    upperDivisionMin,
    capstoneInResidence,
    institutionCode,
    degreeLevel,
    confidence,
    catalogYear,
  };
}

/**
 * Validate that a normalized policy has all required fields for enforcement.
 * Returns list of missing/invalid fields.
 */
export function validateNormalizedPolicy(policy: NormalizedPolicy): string[] {
  const issues: string[] = [];
  
  // Bucket mode must be known
  if (policy.bucketMode === 'unknown') {
    issues.push('bucketMode is unknown - cannot enforce transfer/alt caps');
  }
  
  // Combined mode requires combined cap
  if (policy.bucketMode === 'combined' && policy.maxCombinedCredits == null) {
    issues.push('bucketMode=combined but maxCombinedCredits is missing');
  }
  
  // Separate mode should have at least one cap defined
  if (policy.bucketMode === 'separate' && 
      policy.maxAltCredits == null && 
      policy.maxTransferCredits == null) {
    issues.push('bucketMode=separate but no caps defined (maxAltCredits/maxTransferCredits)');
  }
  
  // Required total should be reasonable
  if (policy.requiredTotalCredits < 30 || policy.requiredTotalCredits > 200) {
    issues.push(`requiredTotalCredits (${policy.requiredTotalCredits}) seems invalid`);
  }
  
  return issues;
}

/**
 * Create a NormalizedPolicy from just an institution code with defaults.
 * Used when full policy data is not available.
 */
export function createDefaultPolicy(
  institutionCode: string,
  degreeLevel: 'bachelor' | 'associate'
): NormalizedPolicy {
  return {
    bucketMode: 'unknown',
    requiredTotalCredits: degreeLevel === 'bachelor' 
      ? DEFAULTS.BACHELOR_TOTAL_CREDITS 
      : DEFAULTS.ASSOCIATE_TOTAL_CREDITS,
    institutionCode,
    degreeLevel,
    confidence: DEFAULTS.CONFIDENCE_UNVERIFIED,
  };
}
