/**
 * Canonical Violation Types
 * 
 * SINGLE SOURCE OF TRUTH for all violation type strings.
 * 
 * This module prevents:
 * - Silent drift from typos in violation type strings
 * - Inconsistent casing or naming across the codebase
 * - New types being introduced without documentation
 * 
 * Usage:
 * ```ts
 * import { VIOLATION_TYPES, type ViolationType } from './violationTypes';
 * 
 * // Instead of: v.type === 'alt_cap'
 * // Use: v.type === VIOLATION_TYPES.ALT_CAP
 * ```
 */

/**
 * All violation types organized by category.
 * 
 * Categories:
 * - CAPS: Credit cap violations (alt, transfer, combined, total)
 * - POLICY: Policy verification failures
 * - REQUIREMENTS: Graduation requirement violations
 * - SPECIALIZED: Institution/provider-specific violations
 * - PLANNING: Schedule/budget planning violations
 */
export const VIOLATION_TYPES = {
  // ============================================
  // CAP VIOLATIONS (Credit limits)
  // ============================================
  /** Alt-credit (ACE/NCCRS/MOOC/testing) exceeds separate bucket cap */
  ALT_CAP: 'alt_cap',
  /** RA transfer credits exceed separate bucket cap */
  TRANSFER_CAP: 'transfer_cap',
  /** Combined transfer+alt credits exceed unified cap */
  COMBINED_CAP: 'combined_cap',
  /** Total transfer volume exceeds school limit (broader than transfer_cap) */
  TOTAL_TRANSFER: 'total_transfer',
  /** Per-provider cap exceeded (e.g., CLEP 60 credits) */
  PROVIDER_CAP: 'provider_cap',
  
  // ============================================
  // POLICY VIOLATIONS (Verification failures)
  // ============================================
  /** Critical policy data missing or invalid (e.g., no bucket mode) */
  POLICY_UNVERIFIED: 'policy_unverified',
  
  // ============================================
  // REQUIREMENT VIOLATIONS (Graduation requirements)
  // ============================================
  /** Residency credits below minimum */
  RESIDENCY: 'residency',
  /** Upper-division credits below minimum */
  UPPER_DIVISION: 'upper_division',
  /** General education category not satisfied */
  GENED_INCOMPLETE: 'gened_incomplete',
  /** Capstone must be taken in residence (not via transfer/alt) */
  CAPSTONE_SUBSTITUTION: 'capstone_substitution',
  
  // ============================================
  // PLANNING VIOLATIONS (Schedule/budget)
  // ============================================
  /** Total cost exceeds budget */
  BUDGET: 'budget',
  /** Weekly workload exceeds limit */
  WORKLOAD: 'workload',
  /** Plan duration exceeds target graduation date */
  DEADLINE: 'deadline',
  /** Missing prerequisite courses */
  PREREQUISITE: 'prerequisite',
  /** Duplicate equivalent courses selected */
  CONFLICT: 'conflict',
} as const;

/**
 * Union type of all valid violation types.
 * Use this for type-safe violation handling.
 */
export type ViolationType = typeof VIOLATION_TYPES[keyof typeof VIOLATION_TYPES];

/**
 * Violation severity levels in order of importance.
 */
export const SEVERITY_ORDER = ['error', 'warning', 'info'] as const;
export type Severity = typeof SEVERITY_ORDER[number];

/**
 * Violation type categories for grouping and ordering.
 */
export const VIOLATION_CATEGORIES = {
  CAPS: [
    VIOLATION_TYPES.ALT_CAP,
    VIOLATION_TYPES.TRANSFER_CAP,
    VIOLATION_TYPES.COMBINED_CAP,
    VIOLATION_TYPES.TOTAL_TRANSFER,
    VIOLATION_TYPES.PROVIDER_CAP,
  ],
  POLICY: [
    VIOLATION_TYPES.POLICY_UNVERIFIED,
  ],
  REQUIREMENTS: [
    VIOLATION_TYPES.RESIDENCY,
    VIOLATION_TYPES.UPPER_DIVISION,
    VIOLATION_TYPES.GENED_INCOMPLETE,
    VIOLATION_TYPES.CAPSTONE_SUBSTITUTION,
  ],
  PLANNING: [
    VIOLATION_TYPES.BUDGET,
    VIOLATION_TYPES.WORKLOAD,
    VIOLATION_TYPES.DEADLINE,
    VIOLATION_TYPES.PREREQUISITE,
    VIOLATION_TYPES.CONFLICT,
  ],
} as const;

/**
 * Blocker ordering priority (lower = first).
 * Used for deterministic blocker lists in CreditDecisionOutput.
 * 
 * Order rationale:
 * 1. Policy issues first (can't evaluate anything without valid policy)
 * 2. Residency (fundamental requirement)
 * 3. Cap violations (transfer/alt limits)
 * 4. Upper-division (specific requirement)
 * 5. Gen-ed/capstone (specialized requirements)
 * 6. Planning (schedule/budget concerns)
 */
export const VIOLATION_PRIORITY: Record<ViolationType, number> = {
  // Policy first
  [VIOLATION_TYPES.POLICY_UNVERIFIED]: 0,
  // Residency second
  [VIOLATION_TYPES.RESIDENCY]: 10,
  // Caps third
  [VIOLATION_TYPES.ALT_CAP]: 20,
  [VIOLATION_TYPES.TRANSFER_CAP]: 21,
  [VIOLATION_TYPES.COMBINED_CAP]: 22,
  [VIOLATION_TYPES.TOTAL_TRANSFER]: 23,
  [VIOLATION_TYPES.PROVIDER_CAP]: 24,
  // Requirements fourth
  [VIOLATION_TYPES.UPPER_DIVISION]: 30,
  [VIOLATION_TYPES.GENED_INCOMPLETE]: 31,
  [VIOLATION_TYPES.CAPSTONE_SUBSTITUTION]: 32,
  // Planning last
  [VIOLATION_TYPES.BUDGET]: 40,
  [VIOLATION_TYPES.WORKLOAD]: 41,
  [VIOLATION_TYPES.DEADLINE]: 42,
  [VIOLATION_TYPES.PREREQUISITE]: 43,
  [VIOLATION_TYPES.CONFLICT]: 44,
};

/**
 * Sort violations by priority (for deterministic output).
 */
export function sortViolationsByPriority<T extends { type: ViolationType }>(
  violations: T[]
): T[] {
  return [...violations].sort((a, b) => {
    const priorityA = VIOLATION_PRIORITY[a.type] ?? 100;
    const priorityB = VIOLATION_PRIORITY[b.type] ?? 100;
    return priorityA - priorityB;
  });
}

/**
 * Check if a violation type is a blocker (error severity = blocks graduation).
 */
export function isBlockingViolationType(type: ViolationType): boolean {
  // All cap, policy, and requirement violations are blockers
  // Planning violations vary (budget is error, workload is warning)
  return ![
    VIOLATION_TYPES.WORKLOAD,
    VIOLATION_TYPES.CONFLICT,
  ].includes(type as any);
}
