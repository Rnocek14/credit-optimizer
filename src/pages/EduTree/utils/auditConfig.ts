/**
 * CI mode configuration for seed auditor
 * Set AUDIT_SEEDS=true in CI to fail on seed issues
 */
export const isAuditMode = () => process.env.AUDIT_SEEDS === 'true';

export const handleAuditFailure = (issues: string[]) => {
  if (isAuditMode()) {
    console.error('[SeedAudit] Failing CI due to seed issues:', issues);
    throw new Error(`Seed audit failed with ${issues.length} issue(s)`);
  }
};
