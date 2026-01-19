/**
 * V1 Institution Scope Configuration
 * 
 * SINGLE SOURCE OF TRUTH for V1-allowed institutions.
 * This file is the canonical definition used by:
 * - Frontend: useAvailableInstitutions.ts (UI gating)
 * - Backend: policyGate.ts (server-side enforcement)
 * - Tests: policyGate.test.ts (verification)
 * 
 * Evidence coverage audit (as of V1 lock):
 * - TESU: 78.8%
 * - COSC: 83.1%
 * - WGU: 56.9%
 * 
 * EXCELSIOR/EMPIRE excluded until evidence coverage reaches 50%+
 * 
 * To add an institution to V1 scope:
 * 1. Verify evidence coverage >= 50%
 * 2. Ensure policy pack is active with all required fields
 * 3. Add to V1_ALLOWED_INSTITUTIONS array below
 * 4. Run black-box tests to verify enforcement
 */

/**
 * V1 Allowed Institutions
 * Array format for easy iteration; converted to Set for O(1) lookup
 */
export const V1_ALLOWED_INSTITUTIONS_LIST = ['TESU', 'COSC', 'WGU'] as const;

/**
 * V1 Allowed Institutions Set (for O(1) lookup)
 */
export const V1_ALLOWED_INSTITUTIONS = new Set<string>(V1_ALLOWED_INSTITUTIONS_LIST);

/**
 * Check if an institution is in V1 scope
 * Handles case normalization and whitespace trimming
 */
export function isV1Institution(institutionCode: string | null | undefined): boolean {
  if (!institutionCode) return false;
  const normalized = institutionCode.toUpperCase().trim();
  return V1_ALLOWED_INSTITUTIONS.has(normalized);
}

/**
 * Get human-readable list of V1 institutions (for error messages)
 */
export function getV1InstitutionsList(): string {
  return V1_ALLOWED_INSTITUTIONS_LIST.join(', ');
}
