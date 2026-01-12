/**
 * Canonical field resolvers for policy data
 * 
 * These helpers ensure consistent field resolution across scanner, UI, and constraints.
 * They handle legacy key fallbacks and prevent "split-brain" conditions where different
 * parts of the system read different keys.
 */

/**
 * Get minimum upper-division credits from policy data.
 * Canonical key: min_upper_division_credits
 * Legacy fallback: upper_division_min
 * 
 * @returns The minimum UL credits required, or null if not set
 */
export function getMinUpperDivisionCredits(policyData: any): number | null {
  const v =
    policyData?.min_upper_division_credits ??
    policyData?.upper_division_min ??
    null;

  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Check if upper-division requirement is verified (policy has explicit UL minimum)
 */
export function isUpperDivisionVerified(policyData: any): boolean {
  return getMinUpperDivisionCredits(policyData) !== null;
}

/**
 * Get provenance URL from policy data
 */
export function getProvenanceUrl(policyData: any): string | null {
  return policyData?.provenance_url ?? null;
}

/**
 * Get provenance verified timestamp from policy data
 */
export function getProvenanceVerifiedAt(policyData: any): Date | null {
  const ts = policyData?.provenance_verified_at;
  if (!ts) return null;
  const date = new Date(ts);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if provenance is stale (older than threshold days)
 */
export function isProvenanceStale(policyData: any, thresholdDays = 180): boolean {
  const verifiedAt = getProvenanceVerifiedAt(policyData);
  if (!verifiedAt) return true; // No verification = stale
  const daysSince = (Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > thresholdDays;
}
