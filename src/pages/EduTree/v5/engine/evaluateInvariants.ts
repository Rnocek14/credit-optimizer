/**
 * Template Invariant Evaluator
 * 
 * Deterministic evaluation of template invariants for scale-safe verification.
 * 
 * Usage:
 * ```ts
 * import { evaluateInvariants } from './evaluateInvariants';
 * 
 * // Uses DEFAULT_INVARIANT_CONFIG when config omitted
 * const result = evaluateInvariants(inputs);
 * if (!result.ok) {
 *   console.log('Invariant failures:', result.violations);
 * }
 * ```
 */

import {
  INVARIANT,
  DEFAULT_INVARIANT_CONFIG,
  sortViolationsByPriority,
  type InvariantCode,
  type InvariantConfig,
  type InvariantInputs,
  type InvariantResult,
  type InvariantSeverity,
  type InvariantViolation,
  type ViolationSeverity,
  type JsonRecord,
} from './invariantCodes';

// Re-export for convenience
export { DEFAULT_INVARIANT_CONFIG } from './invariantCodes';
export type { InvariantResult, InvariantViolation, InvariantInputs, InvariantConfig, JsonRecord };

/**
 * Evaluate all template invariants against provided inputs.
 * 
 * @param input - Template data and policy information
 * @param config - Evaluation thresholds and expectations (defaults to DEFAULT_INVARIANT_CONFIG)
 * @returns Deterministic result with ok flag, severity, and ordered violations
 */
export function evaluateInvariants(
  input: InvariantInputs,
  config: InvariantConfig = DEFAULT_INVARIANT_CONFIG
): InvariantResult {
  const violations: InvariantViolation[] = [];

  // Helper to add violations with explicit severity type
  const fail = (code: InvariantCode, message: string, details?: JsonRecord) =>
    violations.push({ code, severity: 'fail' as const, message, details });
  const warn = (code: InvariantCode, message: string, details?: JsonRecord) =>
    violations.push({ code, severity: 'warn' as const, message, details });

  // ============================================
  // A) NEGATIVE / NaN CREDITS
  // ============================================
  {
    const vals = input.credits;
    const numeric = [vals.requiredTotal, vals.total, vals.resident, vals.transfer, vals.alt, vals.unknown];
    const bad = numeric.some(n => typeof n !== 'number' || Number.isNaN(n) || !Number.isFinite(n) || n < 0);
    if (bad) {
      fail(INVARIANT.NEGATIVE_OR_NAN_CREDITS, 'One or more credit values are invalid (NaN, infinite, or negative).', {
        credits: vals,
      });
    }
  }

  // ============================================
  // A1) TOTAL_CREDITS_MISMATCH
  // ============================================
  {
    const { requiredTotal, total } = input.credits;
    if (requiredTotal > 0 && total !== requiredTotal) {
      fail(INVARIANT.TOTAL_CREDITS_MISMATCH, 'Total credits do not match program requirement.', {
        requiredTotal,
        total,
      });
    }
  }

  // ============================================
  // A2) CREDIT_ACCOUNTING_UNBALANCED
  // ============================================
  {
    const c = input.credits;
    const sum = c.resident + c.transfer + c.alt + c.unknown;
    if (c.total !== sum) {
      fail(INVARIANT.CREDIT_ACCOUNTING_UNBALANCED, 'Credit categories do not sum to total credits.', {
        total: c.total,
        sum,
        breakdown: { resident: c.resident, transfer: c.transfer, alt: c.alt, unknown: c.unknown },
      });
    }
  }

  // ============================================
  // A3) UNKNOWN_CREDITS rules
  // ============================================
  {
    const { unknown } = input.credits;
    const isActive = input.templateStatus === 'active';

    if (isActive && unknown !== 0) {
      fail(INVARIANT.UNKNOWN_CREDITS_NONZERO_ACTIVE, 'Active template contains unknown credits (must be zero).', {
        unknown,
      });
    } else if (!isActive && unknown > config.unknownWarnThreshold) {
      warn(INVARIANT.UNKNOWN_CREDITS_EXCEEDS_THRESHOLD, 'Unknown credits exceed warning threshold.', {
        unknown,
        threshold: config.unknownWarnThreshold,
      });
    }
  }

  // ============================================
  // B1) RESIDENCY_BELOW_MINIMUM
  // ============================================
  {
    const req = input.caps.residencyRequired ?? null;
    if (req && req > 0 && input.credits.resident < req) {
      fail(INVARIANT.RESIDENCY_BELOW_MINIMUM, 'Resident credits are below the required residency minimum.', {
        required: req,
        resident: input.credits.resident,
      });
    }
  }

  // ============================================
  // B2) RESIDENCY_SOURCE_INVALID
  // NOTE: Not implemented in V1. Requires slot-level residency source validation.
  // Will be emitted when we can verify resident credits come from institution providers only.
  // ============================================

  // ============================================
  // C0) BUCKET_MODE_MISSING_OR_UNKNOWN
  // ============================================
  const bucketMode = input.caps.bucketMode;
  const hasValidBucketMode = bucketMode === 'separate' || bucketMode === 'combined';
{
    if (!hasValidBucketMode) {
      fail(INVARIANT.BUCKET_MODE_MISSING_OR_UNKNOWN, 'Policy bucket mode is missing or unknown.', {
        bucketMode,
      });
    }
  }

  // ============================================
  // C1) REQUIRED_CAP_VALUE_MISSING (mode-aware)
  // Only check when bucket mode is valid to avoid noise
  // ============================================
  if (hasValidBucketMode) {
    if (bucketMode === 'separate') {
      if (input.caps.maxAltCredits == null || input.caps.maxTransferCredits == null) {
        fail(INVARIANT.REQUIRED_CAP_VALUE_MISSING, 'Separate bucket mode requires max_alt and max_transfer caps.', {
          maxAltCredits: input.caps.maxAltCredits,
          maxTransferCredits: input.caps.maxTransferCredits,
        });
      }
    }
    if (bucketMode === 'combined') {
      if (input.caps.maxCombinedCredits == null) {
        fail(INVARIANT.REQUIRED_CAP_VALUE_MISSING, 'Combined bucket mode requires a combined transfer+alt cap.', {
          maxCombinedCredits: input.caps.maxCombinedCredits,
        });
      }
    }
  }

  // ============================================
  // C2/C3) CAP EXCEEDED
  // Only check when bucket mode is valid to avoid misleading errors
  // ============================================
  if (hasValidBucketMode) {
    const isActive = input.templateStatus === 'active';
    const overCapSeverity: ViolationSeverity =
      isActive || !config.allowOverCapInPendingReview ? 'fail' : 'warn';

    const emit = overCapSeverity === 'fail' ? fail : warn;

    if (bucketMode === 'separate' && input.caps.maxTransferCredits != null) {
      const over = input.credits.transfer - input.caps.maxTransferCredits;
      if (over > 0) {
        emit(INVARIANT.SEPARATE_TRANSFER_CAP_EXCEEDED, 'Transfer credits exceed separate-mode cap.', {
          transfer: input.credits.transfer,
          cap: input.caps.maxTransferCredits,
          over,
          templateStatus: input.templateStatus,
        });
      }
    }

    if (bucketMode === 'separate' && input.caps.maxAltCredits != null) {
      const over = input.credits.alt - input.caps.maxAltCredits;
      if (over > 0) {
        emit(INVARIANT.SEPARATE_ALT_CAP_EXCEEDED, 'Alt credits exceed separate-mode cap.', {
          alt: input.credits.alt,
          cap: input.caps.maxAltCredits,
          over,
          templateStatus: input.templateStatus,
        });
      }
    }

    if (bucketMode === 'combined' && input.caps.maxCombinedCredits != null) {
      const combined = input.credits.transfer + input.credits.alt;
      const over = combined - input.caps.maxCombinedCredits;
      if (over > 0) {
        emit(INVARIANT.COMBINED_CAP_EXCEEDED, 'Transfer+Alt credits exceed combined-mode cap.', {
          combined,
          cap: input.caps.maxCombinedCredits,
          over,
          templateStatus: input.templateStatus,
        });
      }
    }
  } // end hasValidBucketMode
  }

  // ============================================
  // D) Term sanity (only if terms present)
  // ============================================
  if (input.terms && input.terms.length > 0) {
    // D1) TERM_COUNT_UNEXPECTED
    if (config.expectedTermCount != null && input.terms.length !== config.expectedTermCount) {
      fail(INVARIANT.TERM_COUNT_UNEXPECTED, 'Template term count does not match expectation.', {
        expected: config.expectedTermCount,
        actual: input.terms.length,
      });
    }

    // D2) TERM_SLOTS_COUNT_MISMATCH and D3) TERM_CREDITS_MISMATCH
    for (const term of input.terms) {
      if (config.expectedSlotsPerTerm != null && term.slots.length !== config.expectedSlotsPerTerm) {
        fail(INVARIANT.TERM_SLOTS_COUNT_MISMATCH, 'Term slot count does not match expectation.', {
          termIndex: term.index,
          expected: config.expectedSlotsPerTerm,
          actual: term.slots.length,
        });
      }

      const termCredits = term.slots.reduce((s, slot) => s + (slot.credits ?? 0), 0);
      if (config.expectedTermCredits != null && termCredits !== config.expectedTermCredits) {
        fail(INVARIANT.TERM_CREDITS_MISMATCH, 'Term total credits do not match expectation.', {
          termIndex: term.index,
          expected: config.expectedTermCredits,
          actual: termCredits,
        });
      }

      // SLOT_CREDITS_INVALID + SLOT_TYPE_OR_PROVIDER_INVALID
      for (const [i, slot] of term.slots.entries()) {
        if (typeof slot.credits !== 'number' || !Number.isFinite(slot.credits) || slot.credits <= 0) {
          fail(INVARIANT.SLOT_CREDITS_INVALID, 'Slot credits are invalid (must be positive number).', {
            termIndex: term.index,
            slotIndex: i,
            credits: slot.credits,
          });
        }
        if (!slot.providerType || typeof slot.providerType !== 'string') {
          fail(INVARIANT.SLOT_TYPE_OR_PROVIDER_INVALID, 'Slot providerType is missing/invalid.', {
            termIndex: term.index,
            slotIndex: i,
            providerType: slot.providerType,
          });
        }
      }
    }
  }

  // ============================================
  // F1) TEMPLATE_STATUS_INCONSISTENT_WITH_GATE
  // ============================================
  {
    const gate = input.gateStatus;
    const status = input.templateStatus;

    // Strict mapping:
    // green -> active allowed
    // yellow -> must be pending_review (active forbidden)
    // red -> generation should be blocked
    if (gate === 'yellow' && status === 'active') {
      fail(INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE, 'Template is active but gate status is yellow.', {
        gate,
        status,
      });
    }
    if (gate === 'red' && (status === 'active' || status === 'pending_review')) {
      fail(INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE, 'Template exists in marketable state but gate status is red.', {
        gate,
        status,
      });
    }
  }

  // ============================================
  // F2) INVARIANT_REPORT_MISSING_FOR_TOUCHED_TEMPLATE
  // NOTE: This is a JOB-LEVEL check implemented in template-job-processor.
  // It verifies that every touched template has a corresponding invariant report.
  // DO NOT emit from per-template evaluation - the job processor handles this
  // by comparing templateIds.length to invariant_reports created.
  // ============================================

  // ============================================
  // Deterministic ordering enforcement
  // ============================================
  const sortedViolations = sortViolationsByPriority(violations);

  const hasFail = sortedViolations.some(v => v.severity === 'fail');
  const hasWarn = sortedViolations.some(v => v.severity === 'warn');

  const severity: InvariantSeverity = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

  return {
    ok: !hasFail,
    severity,
    violations: sortedViolations,
    computed: {
      ...input.credits,
      bucketMode: input.caps.bucketMode,
      templateStatus: input.templateStatus,
      gateStatus: input.gateStatus,
      termCount: input.terms?.length ?? 0,
    },
  };
}

/**
 * Quick check if a result has any specific violation code.
 */
export function hasViolation(result: InvariantResult, code: InvariantCode): boolean {
  return result.violations.some(v => v.code === code);
}

/**
 * Get all violation codes from a result (for snapshot testing).
 */
export function getViolationCodes(result: InvariantResult): InvariantCode[] {
  return result.violations.map(v => v.code);
}
