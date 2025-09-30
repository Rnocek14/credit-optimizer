/**
 * CI mode configuration for seed auditor
 * Set AUDIT_SEEDS=true in CI to fail on seed issues
 */
import { ENV } from '@/config/env';

export const isAuditMode = () => ENV.AUDIT_SEEDS;

export const handleAuditFailure = (issues: string[]) => {
  if (ENV.AUDIT_SEEDS) {
    console.error('[SeedAudit] Failing CI due to seed issues:', issues);
    throw new Error(`Seed audit failed with ${issues.length} issue(s)`);
  }
};
