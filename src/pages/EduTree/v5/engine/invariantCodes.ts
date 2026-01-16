/**
 * Canonical Invariant Codes & Types
 * 
 * SINGLE SOURCE OF TRUTH for template invariant verification.
 * 
 * This module provides:
 * - Stable invariant codes (no typo drift)
 * - Deterministic evaluation order (stable test snapshots)
 * - Type-safe severity and violation shapes
 * 
 * Usage:
 * ```ts
 * import { INVARIANT, INVARIANT_EVAL_ORDER, type InvariantCode } from './invariantCodes';
 * ```
 */

// ============================================
// SEVERITY TYPES
// ============================================

export type InvariantSeverity = 'pass' | 'warn' | 'fail';

// ============================================
// VIOLATION SHAPE (stable, machine-queryable)
// ============================================

export type InvariantViolation = {
  code: InvariantCode;
  severity: Exclude<InvariantSeverity, 'pass'>; // warn | fail
  message: string;                              // short, human-readable
  details?: Record<string, unknown>;            // structured payload for debug
};

// ============================================
// RESULT SHAPE
// ============================================

export type InvariantResult = {
  ok: boolean;                        // true iff no FAIL violations
  severity: InvariantSeverity;        // pass if none, warn if only warns, fail if any fail
  violations: InvariantViolation[];   // deterministic ordering
  computed: Record<string, unknown>;  // optional, for dashboards
};

// ============================================
// INVARIANT CODES (constants)
// ============================================

/**
 * Complete invariant code list for V1 scale-safe verification.
 * 
 * Categories:
 * - A) Credit Totals & Accounting
 * - B) Residency
 * - C) Bucket-mode / Caps
 * - D) Structural sanity (terms/slots)
 * - F) Gate/status/report consistency
 */
export const INVARIANT = {
  // ============================================
  // A) Credit Totals & Accounting
  // ============================================
  /** One or more credit values are NaN, infinite, or negative */
  NEGATIVE_OR_NAN_CREDITS: 'NEGATIVE_OR_NAN_CREDITS',
  /** Total credits do not match program requirement (e.g., not 120) */
  TOTAL_CREDITS_MISMATCH: 'TOTAL_CREDITS_MISMATCH',
  /** Credit categories (resident+transfer+alt+unknown) don't sum to total */
  CREDIT_ACCOUNTING_UNBALANCED: 'CREDIT_ACCOUNTING_UNBALANCED',
  /** Active template contains unknown credits (must be zero for active) */
  UNKNOWN_CREDITS_NONZERO_ACTIVE: 'UNKNOWN_CREDITS_NONZERO_ACTIVE',
  /** Unknown credits exceed warning threshold (for pending_review) */
  UNKNOWN_CREDITS_EXCEEDS_THRESHOLD: 'UNKNOWN_CREDITS_EXCEEDS_THRESHOLD',

  // ============================================
  // B) Residency
  // ============================================
  /** Resident credits are below required residency minimum */
  RESIDENCY_BELOW_MINIMUM: 'RESIDENCY_BELOW_MINIMUM',
  /** Resident credits sourced from invalid provider types */
  RESIDENCY_SOURCE_INVALID: 'RESIDENCY_SOURCE_INVALID',

  // ============================================
  // C) Bucket-mode / Caps
  // ============================================
  /** Policy bucket mode is missing or set to 'unknown' */
  BUCKET_MODE_MISSING_OR_UNKNOWN: 'BUCKET_MODE_MISSING_OR_UNKNOWN',
  /** Required cap value is missing for the bucket mode */
  REQUIRED_CAP_VALUE_MISSING: 'REQUIRED_CAP_VALUE_MISSING',
  /** Transfer credits exceed separate-mode cap */
  SEPARATE_TRANSFER_CAP_EXCEEDED: 'SEPARATE_TRANSFER_CAP_EXCEEDED',
  /** Alt credits exceed separate-mode cap */
  SEPARATE_ALT_CAP_EXCEEDED: 'SEPARATE_ALT_CAP_EXCEEDED',
  /** Transfer+Alt credits exceed combined-mode cap */
  COMBINED_CAP_EXCEEDED: 'COMBINED_CAP_EXCEEDED',

  // ============================================
  // D) Structural sanity (terms/slots)
  // ============================================
  /** Template term count does not match expectation */
  TERM_COUNT_UNEXPECTED: 'TERM_COUNT_UNEXPECTED',
  /** Term slot count does not match expectation */
  TERM_SLOTS_COUNT_MISMATCH: 'TERM_SLOTS_COUNT_MISMATCH',
  /** Term total credits do not match expectation */
  TERM_CREDITS_MISMATCH: 'TERM_CREDITS_MISMATCH',
  /** Slot credits are invalid (not positive number) */
  SLOT_CREDITS_INVALID: 'SLOT_CREDITS_INVALID',
  /** Slot providerType is missing or invalid */
  SLOT_TYPE_OR_PROVIDER_INVALID: 'SLOT_TYPE_OR_PROVIDER_INVALID',

  // ============================================
  // F) Gate/status/report consistency
  // ============================================
  /** Template status doesn't match expected gate status */
  TEMPLATE_STATUS_INCONSISTENT_WITH_GATE: 'TEMPLATE_STATUS_INCONSISTENT_WITH_GATE',
  /** Invariant report missing for a touched template (job-level check) */
  INVARIANT_REPORT_MISSING_FOR_TOUCHED_TEMPLATE: 'INVARIANT_REPORT_MISSING_FOR_TOUCHED_TEMPLATE',
} as const;

export type InvariantCode = typeof INVARIANT[keyof typeof INVARIANT];

// ============================================
// DETERMINISTIC EVALUATION ORDER
// ============================================

/**
 * Static evaluation order for deterministic output.
 * 
 * Order rationale:
 * 1. Math/accounting first (foundational correctness)
 * 2. Residency (compliance requirement)
 * 3. Bucket mode before caps (avoid misleading cap errors)
 * 4. Structural sanity (term/slot integrity)
 * 5. Pipeline contract last (job-level checks)
 */
export const INVARIANT_EVAL_ORDER: InvariantCode[] = [
  // A) Totals & accounting first (foundational)
  INVARIANT.NEGATIVE_OR_NAN_CREDITS,
  INVARIANT.TOTAL_CREDITS_MISMATCH,
  INVARIANT.CREDIT_ACCOUNTING_UNBALANCED,
  INVARIANT.UNKNOWN_CREDITS_NONZERO_ACTIVE,
  INVARIANT.UNKNOWN_CREDITS_EXCEEDS_THRESHOLD,

  // B) Residency
  INVARIANT.RESIDENCY_BELOW_MINIMUM,
  INVARIANT.RESIDENCY_SOURCE_INVALID,

  // C) Bucket mode + caps
  INVARIANT.BUCKET_MODE_MISSING_OR_UNKNOWN,
  INVARIANT.REQUIRED_CAP_VALUE_MISSING,
  INVARIANT.SEPARATE_TRANSFER_CAP_EXCEEDED,
  INVARIANT.SEPARATE_ALT_CAP_EXCEEDED,
  INVARIANT.COMBINED_CAP_EXCEEDED,

  // D) Structural sanity
  INVARIANT.TERM_COUNT_UNEXPECTED,
  INVARIANT.TERM_SLOTS_COUNT_MISMATCH,
  INVARIANT.TERM_CREDITS_MISMATCH,
  INVARIANT.SLOT_CREDITS_INVALID,
  INVARIANT.SLOT_TYPE_OR_PROVIDER_INVALID,

  // F) Contract checks last (pipeline integrity)
  INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE,
  INVARIANT.INVARIANT_REPORT_MISSING_FOR_TOUCHED_TEMPLATE,
];

// ============================================
// CONFIGURATION
// ============================================

export type InvariantConfig = {
  /** Threshold for unknown credits warning (default: 6) */
  unknownWarnThreshold: number;
  /** Allow over-cap in pending_review templates (default: true for early scaling) */
  allowOverCapInPendingReview: boolean;
  /** Expected credits per term (e.g., 12). Set undefined to skip check. */
  expectedTermCredits?: number;
  /** Expected slots per term (e.g., 4). Set undefined to skip check. */
  expectedSlotsPerTerm?: number;
  /** Expected term count (e.g., 10). Set undefined to skip check. */
  expectedTermCount?: number;
};

export const DEFAULT_INVARIANT_CONFIG: InvariantConfig = {
  unknownWarnThreshold: 6,
  allowOverCapInPendingReview: true,
  expectedTermCredits: 12,
  expectedSlotsPerTerm: 4,
  expectedTermCount: 10,
};

// ============================================
// INPUT TYPES
// ============================================

export type GateStatus = 'green' | 'yellow' | 'red';
export type TemplateStatus = 'active' | 'pending_review' | 'blocked' | string;

export type CreditsSummary = {
  requiredTotal: number;
  total: number;
  resident: number;
  transfer: number;
  alt: number;
  unknown: number;
};

export type PolicyCaps = {
  bucketMode: 'separate' | 'combined' | 'unknown' | null;
  maxTransferCredits?: number | null;
  maxAltCredits?: number | null;
  maxCombinedCredits?: number | null;
  residencyRequired?: number | null;
};

export type TermSlot = {
  credits: number;
  providerType: string;     // normalized provider type
  slotType?: string;        // resident/transfer/alt/etc.
};

export type Term = {
  index: number;            // 0-based or 1-based, but consistent
  slots: TermSlot[];
};

export type InvariantInputs = {
  credits: CreditsSummary;
  caps: PolicyCaps;
  terms?: Term[];
  templateStatus: TemplateStatus;
  gateStatus: GateStatus;
  touchedTemplateIds?: string[]; // for job-level report count verification
};

// ============================================
// PRIORITY INDEX (for sorting)
// ============================================

/**
 * Priority index map for deterministic violation sorting.
 * Lower number = higher priority (appears first).
 */
export const INVARIANT_PRIORITY: Record<InvariantCode, number> = Object.fromEntries(
  INVARIANT_EVAL_ORDER.map((code, index) => [code, index])
) as Record<InvariantCode, number>;

/**
 * Sort violations by canonical priority order.
 */
export function sortViolationsByPriority(
  violations: InvariantViolation[]
): InvariantViolation[] {
  return [...violations].sort((a, b) => {
    const priorityA = INVARIANT_PRIORITY[a.code] ?? 100;
    const priorityB = INVARIANT_PRIORITY[b.code] ?? 100;
    return priorityA - priorityB;
  });
}
