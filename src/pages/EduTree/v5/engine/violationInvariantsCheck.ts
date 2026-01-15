/**
 * Violation Invariants Checker
 * 
 * Validates that all violation outputs conform to expected contracts.
 * This is used by the golden basket test runner to ensure the credit
 * system never produces malformed or unexpected violations.
 * 
 * Invariants enforced:
 * 1. No unknown violation types (all must be in VIOLATION_TYPES)
 * 2. Blockers only contain blocking types
 * 3. POLICY_UNVERIFIED appears when policy fields are missing
 * 4. All violations have required shape
 * 5. Severity is strictly 'error' | 'warning' | 'info'
 */

import type { CreditDecisionOutput } from './creditPipeline';
import { VIOLATION_TYPES, type ViolationType, isBlockingViolationType } from './violationTypes';

// ============================================================================
// Types
// ============================================================================

export interface InvariantViolation {
  invariant: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface InvariantCheckResult {
  passed: boolean;
  violations: InvariantViolation[];
}

// ============================================================================
// Valid Values
// ============================================================================

const VALID_VIOLATION_TYPES = new Set(Object.values(VIOLATION_TYPES));
const VALID_SEVERITIES = new Set(['error', 'warning', 'info'] as const);

// ============================================================================
// Invariant Checks
// ============================================================================

/**
 * Check that all violation types are known.
 */
function checkNoUnknownViolationTypes(output: CreditDecisionOutput): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  for (const v of output.violations) {
    if (!VALID_VIOLATION_TYPES.has(v.type)) {
      violations.push({
        invariant: 'NO_UNKNOWN_TYPES',
        message: `Unknown violation type: '${v.type}'`,
        details: { violation: v },
      });
    }
  }
  
  return violations;
}

/**
 * Check that blockers only contain blocking violation types.
 */
function checkBlockersAreBlocking(output: CreditDecisionOutput): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  for (const blocker of output.blockers) {
    // First check if it's a valid violation type, then check if blocking
    if (!VALID_VIOLATION_TYPES.has(blocker as ViolationType)) {
      violations.push({
        invariant: 'BLOCKERS_ARE_BLOCKING',
        message: `Unknown blocker type '${blocker}'`,
        details: { blocker },
      });
    } else if (!isBlockingViolationType(blocker as ViolationType)) {
      violations.push({
        invariant: 'BLOCKERS_ARE_BLOCKING',
        message: `Non-blocking type '${blocker}' found in blockers list`,
        details: { blocker },
      });
    }
  }
  
  return violations;
}

/**
 * Check that all violations have required shape.
 */
function checkViolationShape(output: CreditDecisionOutput): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  for (let i = 0; i < output.violations.length; i++) {
    const v = output.violations[i];
    
    // Must have type
    if (!v.type || typeof v.type !== 'string') {
      violations.push({
        invariant: 'VIOLATION_HAS_TYPE',
        message: `Violation at index ${i} missing 'type'`,
        details: { violation: v },
      });
    }
    
    // Must have severity
    if (!v.severity || !VALID_SEVERITIES.has(v.severity as any)) {
      violations.push({
        invariant: 'VIOLATION_HAS_VALID_SEVERITY',
        message: `Violation at index ${i} has invalid severity: '${v.severity}'`,
        details: { violation: v },
      });
    }
    
    // Must have message
    if (!v.message || typeof v.message !== 'string') {
      violations.push({
        invariant: 'VIOLATION_HAS_MESSAGE',
        message: `Violation at index ${i} missing 'message'`,
        details: { violation: v },
      });
    }
    
    // affectedCourses must be array if present
    if (v.affectedCourses !== undefined && !Array.isArray(v.affectedCourses)) {
      violations.push({
        invariant: 'AFFECTED_COURSES_IS_ARRAY',
        message: `Violation at index ${i} has non-array 'affectedCourses'`,
        details: { violation: v },
      });
    }
  }
  
  return violations;
}

/**
 * Check that eligibility and blockers are consistent.
 */
function checkEligibilityConsistency(output: CreditDecisionOutput): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  // If eligible, no blockers
  if (output.eligibility === 'eligible' && output.blockers.length > 0) {
    violations.push({
      invariant: 'ELIGIBLE_NO_BLOCKERS',
      message: `Eligibility is 'eligible' but blockers exist: ${output.blockers.join(', ')}`,
      details: { blockers: output.blockers },
    });
  }
  
  // If blocked, must have blockers
  if (output.eligibility === 'blocked' && output.blockers.length === 0) {
    violations.push({
      invariant: 'BLOCKED_HAS_BLOCKERS',
      message: `Eligibility is 'blocked' but no blockers listed`,
    });
  }
  
  return violations;
}

/**
 * Check that blockers correspond to error-severity violations.
 */
function checkBlockersMatchViolations(output: CreditDecisionOutput): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  const errorViolationTypes = new Set<string>(
    output.violations
      .filter(v => v.severity === 'error')
      .map(v => v.type)
  );
  
  for (const blocker of output.blockers) {
    if (!errorViolationTypes.has(blocker as string)) {
      violations.push({
        invariant: 'BLOCKER_HAS_ERROR_VIOLATION',
        message: `Blocker '${blocker}' has no corresponding error-severity violation`,
        details: { 
          blocker, 
          errorTypes: Array.from(errorViolationTypes) 
        },
      });
    }
  }
  
  return violations;
}

/**
 * Check that policy metadata is present.
 */
function checkPolicyMetadata(output: CreditDecisionOutput): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  if (!output.policy) {
    violations.push({
      invariant: 'HAS_POLICY_METADATA',
      message: 'Missing policy metadata',
    });
    return violations;
  }
  
  if (!output.policy.institution) {
    violations.push({
      invariant: 'HAS_INSTITUTION',
      message: 'Policy metadata missing institution',
    });
  }
  
  if (!output.policy.degreeLevel) {
    violations.push({
      invariant: 'HAS_DEGREE_LEVEL',
      message: 'Policy metadata missing degreeLevel',
    });
  }
  
  if (!output.policy.bucketMode) {
    violations.push({
      invariant: 'HAS_BUCKET_MODE',
      message: 'Policy metadata missing bucketMode',
    });
  }
  
  return violations;
}

/**
 * Check that unknown bucket mode triggers POLICY_UNVERIFIED.
 */
function checkUnknownBucketModeWarning(output: CreditDecisionOutput): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  if (output.policy?.bucketMode === 'unknown') {
    const hasPolicyUnverified = output.violations.some(
      v => v.type === VIOLATION_TYPES.POLICY_UNVERIFIED
    );
    
    if (!hasPolicyUnverified) {
      violations.push({
        invariant: 'UNKNOWN_BUCKET_MODE_WARNS',
        message: 'bucketMode is unknown but no POLICY_UNVERIFIED violation emitted',
      });
    }
  }
  
  return violations;
}

// ============================================================================
// Main Check Function
// ============================================================================

/**
 * Run all invariant checks on a CreditDecisionOutput.
 * Returns a result indicating whether all invariants passed.
 */
export function checkViolationInvariants(
  output: CreditDecisionOutput
): InvariantCheckResult {
  const allViolations: InvariantViolation[] = [
    ...checkNoUnknownViolationTypes(output),
    ...checkBlockersAreBlocking(output),
    ...checkViolationShape(output),
    ...checkEligibilityConsistency(output),
    ...checkBlockersMatchViolations(output),
    ...checkPolicyMetadata(output),
    ...checkUnknownBucketModeWarning(output),
  ];
  
  return {
    passed: allViolations.length === 0,
    violations: allViolations,
  };
}

/**
 * Assert that all invariants pass. Throws if any fail.
 * Use in tests.
 */
export function assertViolationInvariants(output: CreditDecisionOutput): void {
  const result = checkViolationInvariants(output);
  
  if (!result.passed) {
    const messages = result.violations.map(
      v => `[${v.invariant}] ${v.message}`
    );
    throw new Error(`Violation invariants failed:\n${messages.join('\n')}`);
  }
}

/**
 * Get a list of all invariant names (for documentation).
 */
export function getInvariantNames(): string[] {
  return [
    'NO_UNKNOWN_TYPES',
    'BLOCKERS_ARE_BLOCKING',
    'VIOLATION_HAS_TYPE',
    'VIOLATION_HAS_VALID_SEVERITY',
    'VIOLATION_HAS_MESSAGE',
    'AFFECTED_COURSES_IS_ARRAY',
    'ELIGIBLE_NO_BLOCKERS',
    'BLOCKED_HAS_BLOCKERS',
    'BLOCKER_HAS_ERROR_VIOLATION',
    'HAS_POLICY_METADATA',
    'HAS_INSTITUTION',
    'HAS_DEGREE_LEVEL',
    'HAS_BUCKET_MODE',
    'UNKNOWN_BUCKET_MODE_WARNS',
  ];
}
