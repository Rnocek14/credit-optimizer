/**
 * Policy Completeness Scoring System
 * 
 * Computes a structured completeness score (0-100) and traffic-light status
 * for institution policy packs. This is the foundation for the scale-readiness
 * audit system.
 * 
 * Status Levels:
 * - Green (80-100): Ready for template generation
 * - Yellow (50-79): Buildable with warnings
 * - Red (0-49): Blocked - cannot safely generate templates
 */

import type { NormalizedPolicy } from './normalizePolicy';
import { normalizePolicy, validateNormalizedPolicy } from './normalizePolicy';

// ============================================================================
// Types
// ============================================================================

export type PolicyStatus = 'green' | 'yellow' | 'red';

export interface FieldStatus {
  field: string;
  present: boolean;
  value?: unknown;
  weight: number;
  category: 'required' | 'conditional' | 'optional';
  reason?: string;
}

export interface ProvenanceStatus {
  residency: 'ground_truth' | 'human_override' | 'ai_extraction' | 'missing';
  maxTransfer: 'ground_truth' | 'human_override' | 'ai_extraction' | 'missing';
  maxAlt: 'ground_truth' | 'human_override' | 'ai_extraction' | 'missing';
}

export interface PolicyCompletenessResult {
  /** Overall score 0-100 */
  score: number;
  /** Traffic-light status */
  status: PolicyStatus;
  /** Institution code */
  institutionCode: string;
  /** Degree level */
  degreeLevel: 'bachelor' | 'associate';
  /** Detailed field status */
  fields: FieldStatus[];
  /** Critical missing fields that block templates */
  missingCritical: string[];
  /** Optional missing fields that generate warnings */
  missingOptional: string[];
  /** Provenance status for key fields */
  provenance: ProvenanceStatus;
  /** Whether ground truth exists for this institution */
  hasGroundTruth: boolean;
  /** Whether bucket mode is valid (separate or combined) */
  bucketModeValid: boolean;
  /** Human-readable summary */
  summary: string;
  /** Actionable recommendations */
  recommendations: string[];
}

// ============================================================================
// Field Definitions
// ============================================================================

/**
 * Required fields - missing any of these results in Red status
 */
const CRITICAL_FIELDS = [
  { key: 'transfer_alt_bucket_mode', weight: 25 },
  { key: 'degree_credit_total', weight: 15 },
  { key: 'residency_credits', weight: 15 },
] as const;

/**
 * Conditionally required fields based on bucket mode
 */
const CONDITIONAL_FIELDS = {
  separate: [
    { key: 'max_alt_credit', weight: 15 },
    { key: 'max_transfer_credits', weight: 10 },
  ],
  combined: [
    { key: 'max_transfer_alt_combined_credits', weight: 20 },
  ],
} as const;

/**
 * Optional fields that improve score but don't block
 */
const OPTIONAL_FIELDS = [
  { key: 'upper_division_min', weight: 5 },
  { key: 'capstone_in_residence', weight: 5 },
  { key: 'provider_caps', weight: 5 },
  { key: 'catalog_year', weight: 3 },
  { key: 'confidence', weight: 2 },
] as const;

// ============================================================================
// Scoring Logic
// ============================================================================

/**
 * Compute completeness score for a raw policy object.
 */
export function computePolicyCompleteness(
  policyData: Record<string, unknown>,
  institutionCode: string,
  degreeLevel: 'bachelor' | 'associate',
  groundTruthExists: boolean = false,
  fieldProvenance?: Record<string, { source?: string }>
): PolicyCompletenessResult {
  const fields: FieldStatus[] = [];
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];
  const recommendations: string[] = [];
  
  let totalPossibleWeight = 0;
  let earnedWeight = 0;
  
  // ============================================
  // Check Critical Fields
  // ============================================
  for (const { key, weight } of CRITICAL_FIELDS) {
    totalPossibleWeight += weight;
    const value = policyData[key];
    const present = value !== undefined && value !== null;
    
    fields.push({
      field: key,
      present,
      value,
      weight,
      category: 'required',
    });
    
    if (present) {
      // Special case: bucket_mode must be 'separate' or 'combined', not 'unknown'
      if (key === 'transfer_alt_bucket_mode') {
        if (value === 'separate' || value === 'combined') {
          earnedWeight += weight;
        } else {
          missingCritical.push(`${key} (must be 'separate' or 'combined', got '${value}')`);
          recommendations.push(`Set transfer_alt_bucket_mode to 'separate' or 'combined'`);
        }
      } else {
        earnedWeight += weight;
      }
    } else {
      missingCritical.push(key);
      recommendations.push(`Add required field: ${key}`);
    }
  }
  
  // ============================================
  // Check Conditional Fields (based on bucket mode)
  // ============================================
  const bucketMode = policyData.transfer_alt_bucket_mode as string;
  const bucketModeValid = bucketMode === 'separate' || bucketMode === 'combined';
  
  if (bucketModeValid) {
    const conditionalFields = bucketMode === 'separate' 
      ? CONDITIONAL_FIELDS.separate 
      : CONDITIONAL_FIELDS.combined;
    
    for (const { key, weight } of conditionalFields) {
      totalPossibleWeight += weight;
      const value = policyData[key];
      const present = value !== undefined && value !== null;
      
      fields.push({
        field: key,
        present,
        value,
        weight,
        category: 'conditional',
        reason: `Required for ${bucketMode} bucket mode`,
      });
      
      if (present) {
        earnedWeight += weight;
      } else {
        missingCritical.push(`${key} (required for ${bucketMode} mode)`);
        recommendations.push(`Add ${key} for ${bucketMode} bucket mode`);
      }
    }
  }
  
  // ============================================
  // Check Optional Fields
  // ============================================
  for (const { key, weight } of OPTIONAL_FIELDS) {
    totalPossibleWeight += weight;
    const value = policyData[key];
    const present = value !== undefined && value !== null;
    
    fields.push({
      field: key,
      present,
      value,
      weight,
      category: 'optional',
    });
    
    if (present) {
      earnedWeight += weight;
    } else {
      missingOptional.push(key);
    }
  }
  
  // ============================================
  // Provenance Bonus
  // ============================================
  const getProvenance = (key: string): ProvenanceStatus['residency'] => {
    const prov = fieldProvenance?.[key]?.source;
    if (prov === 'ground_truth') return 'ground_truth';
    if (prov === 'human_override') return 'human_override';
    if (prov === 'ai_extraction') return 'ai_extraction';
    return 'missing';
  };
  
  const provenance: ProvenanceStatus = {
    residency: getProvenance('residency_credits'),
    maxTransfer: getProvenance('max_transfer_credits'),
    maxAlt: getProvenance('max_alt_credit'),
  };
  
  // Provenance bonus: +5 for ground_truth on key fields
  const PROVENANCE_BONUS = 5;
  if (provenance.residency === 'ground_truth' || provenance.residency === 'human_override') {
    totalPossibleWeight += PROVENANCE_BONUS;
    earnedWeight += PROVENANCE_BONUS;
  } else if (policyData.residency_credits !== undefined) {
    totalPossibleWeight += PROVENANCE_BONUS;
    // No bonus for ai_extraction
    if (provenance.residency === 'ai_extraction') {
      recommendations.push('Verify residency_credits with ground_truth or human_override');
    }
  }
  
  // Ground truth bonus
  const GROUND_TRUTH_BONUS = 10;
  totalPossibleWeight += GROUND_TRUTH_BONUS;
  if (groundTruthExists) {
    earnedWeight += GROUND_TRUTH_BONUS;
  } else {
    recommendations.push('Add entry to institution_policy_ground_truth table');
  }
  
  // ============================================
  // Calculate Final Score
  // ============================================
  const score = totalPossibleWeight > 0 
    ? Math.round((earnedWeight / totalPossibleWeight) * 100) 
    : 0;
  
  // Determine status
  let status: PolicyStatus;
  if (missingCritical.length > 0) {
    status = 'red';
  } else if (score >= 80) {
    status = 'green';
  } else if (score >= 50) {
    status = 'yellow';
  } else {
    status = 'red';
  }
  
  // Generate summary
  const summary = generateSummary(status, score, missingCritical, groundTruthExists);
  
  return {
    score,
    status,
    institutionCode,
    degreeLevel,
    fields,
    missingCritical,
    missingOptional,
    provenance,
    hasGroundTruth: groundTruthExists,
    bucketModeValid,
    summary,
    recommendations,
  };
}

/**
 * Compute completeness from a NormalizedPolicy object.
 */
export function computeNormalizedPolicyCompleteness(
  policy: NormalizedPolicy,
  groundTruthExists: boolean = false,
  fieldProvenance?: Record<string, { source?: string }>
): PolicyCompletenessResult {
  // Convert NormalizedPolicy back to raw format for scoring
  const rawPolicy: Record<string, unknown> = {
    transfer_alt_bucket_mode: policy.bucketMode,
    degree_credit_total: policy.requiredTotalCredits,
    residency_credits: policy.minResidencyCredits,
    max_alt_credit: policy.maxAltCredits,
    max_transfer_credits: policy.maxTransferCredits,
    max_transfer_alt_combined_credits: policy.maxCombinedCredits,
    upper_division_min: policy.upperDivisionMin,
    capstone_in_residence: policy.capstoneInResidence,
    provider_caps: policy.providerCaps,
    catalog_year: policy.catalogYear,
    confidence: policy.confidence,
  };
  
  return computePolicyCompleteness(
    rawPolicy,
    policy.institutionCode,
    policy.degreeLevel,
    groundTruthExists,
    fieldProvenance
  );
}

/**
 * Generate human-readable summary.
 */
function generateSummary(
  status: PolicyStatus,
  score: number,
  missingCritical: string[],
  hasGroundTruth: boolean
): string {
  switch (status) {
    case 'green':
      return `Ready for template generation (${score}%). ${hasGroundTruth ? 'Ground truth verified.' : 'Add ground truth for full verification.'}`;
    case 'yellow':
      return `Buildable with warnings (${score}%). Missing optional fields may affect accuracy.`;
    case 'red':
      return `Blocked (${score}%). Missing critical fields: ${missingCritical.slice(0, 3).join(', ')}${missingCritical.length > 3 ? '...' : ''}`;
  }
}

// ============================================================================
// Threshold Constants (exported for CI tests)
// ============================================================================

export const COMPLETENESS_THRESHOLDS = {
  GREEN_MIN: 80,
  YELLOW_MIN: 50,
} as const;

/**
 * Check if a policy meets the minimum threshold for a given status.
 */
export function meetsThreshold(score: number, targetStatus: PolicyStatus): boolean {
  switch (targetStatus) {
    case 'green':
      return score >= COMPLETENESS_THRESHOLDS.GREEN_MIN;
    case 'yellow':
      return score >= COMPLETENESS_THRESHOLDS.YELLOW_MIN;
    case 'red':
      return true; // Everything meets red threshold
  }
}
