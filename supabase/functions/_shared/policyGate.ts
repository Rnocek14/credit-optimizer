/**
 * Shared Policy Gate Logic
 * Used by both seed-bsba-templates and template-generation-worker
 * to ensure consistent write-time enforcement.
 */

export type PolicyStatus = 'green' | 'yellow' | 'red';

/**
 * V1 Allowlist: Only these institutions are permitted for template generation.
 * This is the server-side enforcement that prevents bypassing the UI gate.
 */
export const V1_ALLOWED_INSTITUTIONS = new Set(['TESU', 'COSC', 'WGU']);

/**
 * Check if an institution is allowed in V1 scope.
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export function checkV1InstitutionScope(institution: string): { allowed: true } | { allowed: false; reason: string } {
  const normalized = institution?.toUpperCase()?.trim();
  if (!normalized) {
    return { allowed: false, reason: 'Institution code is required' };
  }
  if (!V1_ALLOWED_INSTITUTIONS.has(normalized)) {
    return { 
      allowed: false, 
      reason: `Institution '${normalized}' is not in V1 scope. Allowed: ${Array.from(V1_ALLOWED_INSTITUTIONS).join(', ')}` 
    };
  }
  return { allowed: true };
}

export interface PolicyData {
  residency_credits?: number;
  max_transfer_credits?: number;
  max_alt_credit?: number;
  max_ace_nccrs_credits?: number;
  total_credits?: number;
  transfer_alt_bucket_mode?: 'separate' | 'combined' | 'unknown';
  degree_credit_total?: number;
  max_transfer_alt_combined_credits?: number;
  provenance_verified_at?: string;
  upper_division_min?: number;
  capstone_in_residence?: boolean;
  provider_caps?: Record<string, number>;
  catalog_year?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface PolicyGateResult {
  canGenerate: boolean;
  status: PolicyStatus;
  score: number;
  reason: string;
  missingCritical: string[];
  hasGroundTruth: boolean;
}

/**
 * Critical fields that MUST be present for any template generation
 */
const CRITICAL_FIELDS = [
  { key: 'transfer_alt_bucket_mode', weight: 25 },
  { key: 'degree_credit_total', weight: 15, fallback: 'total_credits' },
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

/**
 * Evaluate policy completeness gate BEFORE generating templates.
 * This is the write-time enforcement that prevents bad templates.
 * 
 * Rules:
 * - GREEN: No missing critical fields AND hasGroundTruth AND score >= 80
 * - YELLOW: No missing critical fields but no ground truth or low optional coverage
 * - RED: Missing critical fields OR invalid bucket mode
 */
export function evaluatePolicyGate(
  policyData: PolicyData,
  hasGroundTruth: boolean = false
): PolicyGateResult {
  const missingCritical: string[] = [];
  let score = 0;
  const maxPossible = 100;
  
  // =========================================================================
  // CRITICAL FIELDS CHECK (55 points base)
  // =========================================================================
  
  // Critical field 1: bucket_mode (25 points)
  const bucketMode = policyData.transfer_alt_bucket_mode;
  if (!bucketMode || bucketMode === 'unknown') {
    missingCritical.push('transfer_alt_bucket_mode (must be separate or combined)');
  } else {
    score += 25;
  }
  
  // Critical field 2: degree_credit_total (15 points) - with fallback
  const totalCredits = policyData.degree_credit_total ?? policyData.total_credits;
  if (!totalCredits || totalCredits <= 0) {
    missingCritical.push('degree_credit_total');
  } else {
    score += 15;
  }
  
  // Critical field 3: residency_credits (15 points)
  if (!policyData.residency_credits || policyData.residency_credits <= 0) {
    missingCritical.push('residency_credits');
  } else {
    score += 15;
  }
  
  // =========================================================================
  // CONDITIONAL FIELDS CHECK (25 points based on bucket mode)
  // =========================================================================
  
  if (bucketMode === 'separate') {
    // Separate mode requires both max_alt_credit and max_transfer_credits
    if (policyData.max_alt_credit && policyData.max_alt_credit > 0) {
      score += 15;
    } else {
      missingCritical.push('max_alt_credit (required for separate mode)');
    }
    if (policyData.max_transfer_credits && policyData.max_transfer_credits > 0) {
      score += 10;
    } else {
      missingCritical.push('max_transfer_credits (required for separate mode)');
    }
  } else if (bucketMode === 'combined') {
    // Combined mode requires max_transfer_alt_combined_credits
    if (policyData.max_transfer_alt_combined_credits && policyData.max_transfer_alt_combined_credits > 0) {
      score += 25;
    } else {
      missingCritical.push('max_transfer_alt_combined_credits (required for combined mode)');
    }
  }
  // If bucketMode is invalid/unknown, conditional points are not awarded
  
  // =========================================================================
  // OPTIONAL FIELDS CHECK (20 points) - NO auto-award
  // =========================================================================
  
  for (const field of OPTIONAL_FIELDS) {
    const value = policyData[field.key];
    if (value !== undefined && value !== null) {
      // For boolean fields, check truthiness
      if (typeof value === 'boolean' || value) {
        score += field.weight;
      }
    }
  }
  
  // =========================================================================
  // DETERMINE STATUS (with ground truth requirement for GREEN)
  // =========================================================================
  
  let status: PolicyStatus;
  let reason: string;
  
  if (missingCritical.length > 0) {
    // RED: Missing critical fields - blocked
    status = 'red';
    reason = `Blocked: ${missingCritical.slice(0, 3).join(', ')}`;
  } else if (!hasGroundTruth) {
    // YELLOW: Structurally complete but no ground truth verification
    status = 'yellow';
    reason = 'Policy complete but not verified with ground truth - templates marked pending_review';
  } else if (score >= 80) {
    // GREEN: Complete + verified + high optional coverage
    status = 'green';
    reason = 'Policy verified and complete - templates can be published';
  } else if (score >= 50) {
    // YELLOW: Complete + verified but low optional coverage
    status = 'yellow';
    reason = `Policy verified but incomplete (score: ${score}/100) - templates marked pending_review`;
  } else {
    // RED: Score too low even with no missing critical (shouldn't happen often)
    status = 'red';
    reason = `Policy score too low (${score}/100) - blocked`;
  }
  
  const canGenerate = status !== 'red';
  
  return {
    canGenerate,
    status,
    score,
    reason,
    missingCritical,
    hasGroundTruth,
  };
}

/**
 * Get template status string based on policy gate result
 */
export function getTemplateStatus(gateResult: PolicyGateResult): 'active' | 'pending_review' | 'blocked' {
  switch (gateResult.status) {
    case 'green':
      return 'active';
    case 'yellow':
      return 'pending_review';
    case 'red':
    default:
      return 'blocked';
  }
}
