/**
 * Invariant Decision Snapshot Helper
 * 
 * Records the exact invariant configuration used at template evaluation time.
 * Creates an immutable audit trail so we can answer:
 * "Why was this template allowed / warned / blocked at that time?"
 * 
 * DESIGN PRINCIPLES:
 * - Immutable: Snapshots are never modified after creation
 * - Best-effort: Write failures are logged, not thrown (don't block template generation)
 * - Single source: Uses already-computed effectiveConfig (no re-fetching)
 * 
 * @version 2026-01-invariant-snapshots-v1
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type { InvariantViolation, InvariantSeverity } from './creditInvariantChecker.ts';
import type { EffectiveInvariantConfig } from './institutionOverrides.ts';

// ============================================
// VERSION CONSTANT
// ============================================

/**
 * Invariant version for snapshot tracking.
 * Bump this when invariant logic changes materially.
 * Old snapshots remain valid forever with their original version.
 */
export const INVARIANT_VERSION = '2026-01-invariant-snapshots-v1' as const;

// ============================================
// TYPES
// ============================================

export type InvariantDecision = 'pass' | 'warn' | 'block';

export interface InvariantDecisionSnapshotInput {
  job_id?: string | null;
  template_id: string;
  institution_code: string;
  program_catalog_id?: string | null;
  track?: string | null;
  template_status: string;
  effective_config: EffectiveInvariantConfig;
  violations: InvariantViolation[];
}

/**
 * Shape of effective_config stored in the snapshot JSONB column.
 * Must match EffectiveInvariantConfig fields.
 */
export interface SnapshotEffectiveConfig {
  unknownCreditsWarnThreshold: number;
  unknownCreditsActiveHardZero: boolean;
  allowMissingCapsInDraft: boolean;
  pendingReviewThresholdMultiplier: number;
  hasOverrides: boolean;
  sourceInstitution: string | null;
}

// ============================================
// DECISION DERIVATION (PURE FUNCTION)
// ============================================

/**
 * Derive invariant decision from violations array.
 * 
 * Logic:
 * - any severity === 'error' => 'block'
 * - else if any violations => 'warn'
 * - else => 'pass'
 * 
 * PURE: No side effects, no DB access.
 */
export function deriveInvariantDecision(violations: InvariantViolation[]): InvariantDecision {
  if (violations.some(v => v.severity === 'error')) {
    return 'block';
  }
  if (violations.length > 0) {
    return 'warn';
  }
  return 'pass';
}

// ============================================
// SNAPSHOT WRITER (BEST-EFFORT)
// ============================================

/**
 * Write an invariant decision snapshot to the database.
 * 
 * BEST-EFFORT: If the insert fails, logs a warning but does NOT throw.
 * Template generation should never fail because of snapshot storage issues.
 * 
 * @param supabase - Supabase client (should be service role for insert)
 * @param input - Snapshot data with all required fields
 * @returns true if insert succeeded, false otherwise
 */
export async function writeInvariantDecisionSnapshot(
  supabase: SupabaseClient,
  input: InvariantDecisionSnapshotInput
): Promise<boolean> {
  const decision = deriveInvariantDecision(input.violations);
  const violationCodes = input.violations.map(v => v.type);

  // Build the effective config snapshot (matches DB JSONB column)
  const effectiveConfigSnapshot: SnapshotEffectiveConfig = {
    unknownCreditsWarnThreshold: input.effective_config.unknownCreditsWarnThreshold,
    unknownCreditsActiveHardZero: input.effective_config.unknownCreditsActiveHardZero,
    allowMissingCapsInDraft: input.effective_config.allowMissingCapsInDraft,
    pendingReviewThresholdMultiplier: input.effective_config.pendingReviewThresholdMultiplier,
    hasOverrides: input.effective_config.hasOverrides,
    sourceInstitution: input.effective_config.sourceInstitution,
  };

  try {
    const { error } = await (supabase as any)
      .from('invariant_decision_snapshots')
      .upsert({
        job_id: input.job_id ?? null,
        template_id: input.template_id,
        institution_code: input.institution_code,
        program_catalog_id: input.program_catalog_id ?? null,
        track: input.track ?? null,
        template_status: input.template_status,
        invariant_version: INVARIANT_VERSION,
        effective_config: effectiveConfigSnapshot,
        decision,
        violation_codes: violationCodes,
      }, { 
        onConflict: 'template_id,invariant_version',
        ignoreDuplicates: true // Silent on retries - keeps snapshots immutable
      });

    if (error) {
      console.warn(
        `[INVARIANT_SNAPSHOT_WRITE_FAILED] Failed to write snapshot for template ${input.template_id}: ${error.message}`,
        { code: error.code, details: error.details }
      );
      return false;
    }

    console.log(
      `[invariant-snapshot] Recorded decision=${decision} for template=${input.template_id}, violations=${violationCodes.length}`
    );
    return true;
  } catch (err) {
    console.warn(
      `[INVARIANT_SNAPSHOT_WRITE_FAILED] Unexpected error writing snapshot for template ${input.template_id}:`,
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

/**
 * Build the effective config with the actual threshold used for evaluation.
 * 
 * This is a convenience function that constructs the full EffectiveInvariantConfig
 * including the status-adjusted threshold that was actually used for the invariant check.
 * 
 * @param baseConfig - The base EffectiveInvariantConfig (from fetchInstitutionOverridesBase)
 * @param effectiveWarnThreshold - The status-adjusted threshold actually used
 */
export function buildSnapshotEffectiveConfig(
  baseConfig: EffectiveInvariantConfig,
  effectiveWarnThreshold: number
): EffectiveInvariantConfig {
  return {
    ...baseConfig,
    // Override with the actual threshold used (may include pending_review multiplier)
    unknownCreditsWarnThreshold: effectiveWarnThreshold,
  };
}
