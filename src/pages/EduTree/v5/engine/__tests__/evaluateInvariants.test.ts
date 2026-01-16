/**
 * Invariant Evaluator Tests
 * 
 * Golden-file snapshot style tests for deterministic invariant evaluation.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateInvariants,
  getViolationCodes,
  hasViolation,
  DEFAULT_INVARIANT_CONFIG,
  type InvariantInputs,
} from '../evaluateInvariants';
import { INVARIANT, type InvariantConfig } from '../invariantCodes';

// ============================================
// Test Fixtures
// ============================================

const validCredits = {
  requiredTotal: 120,
  total: 120,
  resident: 30,
  transfer: 45,
  alt: 45,
  unknown: 0,
};

const validCaps = {
  bucketMode: 'separate' as const,
  maxTransferCredits: 60,
  maxAltCredits: 60,
  maxCombinedCredits: null,
  residencyRequired: 30,
};

const validTerms = Array.from({ length: 10 }, (_, i) => ({
  index: i,
  slots: Array.from({ length: 4 }, () => ({
    credits: 3,
    providerType: 'institution',
  })),
}));

const validInputs: InvariantInputs = {
  credits: validCredits,
  caps: validCaps,
  terms: validTerms,
  templateStatus: 'active',
  gateStatus: 'green',
};

// ============================================
// A) Credit Totals & Accounting Tests
// ============================================

describe('Credit Totals & Accounting Invariants', () => {
  it('passes with valid balanced credits', () => {
    const result = evaluateInvariants(validInputs, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('pass');
    expect(result.violations).toHaveLength(0);
  });

  it('fails on negative credits', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, transfer: -5 },
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.NEGATIVE_OR_NAN_CREDITS)).toBe(true);
  });

  it('fails on NaN credits', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, alt: NaN },
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.NEGATIVE_OR_NAN_CREDITS)).toBe(true);
  });

  it('fails on total credits mismatch', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, total: 118 }, // Wrong total
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.TOTAL_CREDITS_MISMATCH)).toBe(true);
  });

  it('fails on unbalanced credit categories', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: {
        requiredTotal: 120,
        total: 120,
        resident: 30,
        transfer: 40, // Doesn't sum to 120
        alt: 45,
        unknown: 0,
      },
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.CREDIT_ACCOUNTING_UNBALANCED)).toBe(true);
  });

  it('fails on unknown credits in active template', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, unknown: 3, alt: 42 }, // Shift 3 from alt to unknown
      templateStatus: 'active',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.UNKNOWN_CREDITS_NONZERO_ACTIVE)).toBe(true);
  });

  it('warns on unknown credits exceeding threshold in pending_review', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, unknown: 9, alt: 36 },
      templateStatus: 'pending_review',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(true); // Warn doesn't fail
    expect(result.severity).toBe('warn');
    expect(hasViolation(result, INVARIANT.UNKNOWN_CREDITS_EXCEEDS_THRESHOLD)).toBe(true);
  });
});

// ============================================
// B) Residency Tests
// ============================================

describe('Residency Invariants', () => {
  it('fails when residency below minimum', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, resident: 25, transfer: 50 }, // Below 30 required
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.RESIDENCY_BELOW_MINIMUM)).toBe(true);
  });
});

// ============================================
// C) Bucket Mode & Caps Tests
// ============================================

describe('Bucket Mode & Caps Invariants', () => {
  it('fails when bucket mode is missing', () => {
    const input: InvariantInputs = {
      ...validInputs,
      caps: { ...validCaps, bucketMode: null },
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.BUCKET_MODE_MISSING_OR_UNKNOWN)).toBe(true);
  });

  it('fails when bucket mode is unknown', () => {
    const input: InvariantInputs = {
      ...validInputs,
      caps: { ...validCaps, bucketMode: 'unknown' },
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.BUCKET_MODE_MISSING_OR_UNKNOWN)).toBe(true);
  });

  it('fails when separate mode missing required caps', () => {
    const input: InvariantInputs = {
      ...validInputs,
      caps: { ...validCaps, maxAltCredits: null },
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.REQUIRED_CAP_VALUE_MISSING)).toBe(true);
  });

  it('fails when combined mode missing combined cap', () => {
    const input: InvariantInputs = {
      ...validInputs,
      caps: {
        bucketMode: 'combined',
        maxTransferCredits: null,
        maxAltCredits: null,
        maxCombinedCredits: null, // Missing!
        residencyRequired: 30,
      },
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.REQUIRED_CAP_VALUE_MISSING)).toBe(true);
  });

  it('fails when transfer cap exceeded in active template', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, transfer: 65, alt: 25 }, // Transfer > 60 cap
      templateStatus: 'active',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.SEPARATE_TRANSFER_CAP_EXCEEDED)).toBe(true);
  });

  it('warns when transfer cap exceeded in pending_review with allowOverCapInPendingReview', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, transfer: 65, alt: 25 },
      templateStatus: 'pending_review',
    };
    const config: InvariantConfig = {
      ...DEFAULT_INVARIANT_CONFIG,
      allowOverCapInPendingReview: true,
    };
    const result = evaluateInvariants(input, config);
    expect(result.ok).toBe(true); // Warn doesn't fail
    expect(result.severity).toBe('warn');
    expect(hasViolation(result, INVARIANT.SEPARATE_TRANSFER_CAP_EXCEEDED)).toBe(true);
  });

  it('fails when combined cap exceeded', () => {
    const input: InvariantInputs = {
      ...validInputs,
      credits: { ...validCredits, transfer: 50, alt: 50, resident: 20 }, // Combined = 100
      caps: {
        bucketMode: 'combined',
        maxCombinedCredits: 90, // Cap = 90, combined = 100
        residencyRequired: 20,
      },
      templateStatus: 'active',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.COMBINED_CAP_EXCEEDED)).toBe(true);
  });
});

// ============================================
// D) Structural Sanity Tests
// ============================================

describe('Structural Sanity Invariants', () => {
  it('fails when term count is unexpected', () => {
    const input: InvariantInputs = {
      ...validInputs,
      terms: validTerms.slice(0, 8), // Only 8 terms, expected 10
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.TERM_COUNT_UNEXPECTED)).toBe(true);
  });

  it('fails when term slot count is unexpected', () => {
    const badTerms = [...validTerms];
    badTerms[0] = { index: 0, slots: badTerms[0].slots.slice(0, 3) }; // Only 3 slots
    const input: InvariantInputs = {
      ...validInputs,
      terms: badTerms,
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.TERM_SLOTS_COUNT_MISMATCH)).toBe(true);
  });

  it('fails when term credits mismatch', () => {
    const badTerms = [...validTerms];
    badTerms[0] = {
      index: 0,
      slots: [
        { credits: 3, providerType: 'institution' },
        { credits: 3, providerType: 'institution' },
        { credits: 3, providerType: 'institution' },
        { credits: 2, providerType: 'institution' }, // 11 credits, not 12
      ],
    };
    const input: InvariantInputs = {
      ...validInputs,
      terms: badTerms,
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.TERM_CREDITS_MISMATCH)).toBe(true);
  });

  it('fails when slot has invalid credits', () => {
    const badTerms = [...validTerms];
    badTerms[0] = {
      index: 0,
      slots: [
        { credits: 0, providerType: 'institution' }, // Invalid: 0
        { credits: 3, providerType: 'institution' },
        { credits: 3, providerType: 'institution' },
        { credits: 3, providerType: 'institution' },
      ],
    };
    const input: InvariantInputs = {
      ...validInputs,
      terms: badTerms,
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.SLOT_CREDITS_INVALID)).toBe(true);
  });

  it('fails when slot has missing providerType', () => {
    const badTerms = [...validTerms];
    badTerms[0] = {
      index: 0,
      slots: [
        { credits: 3, providerType: '' }, // Invalid: empty string
        { credits: 3, providerType: 'institution' },
        { credits: 3, providerType: 'institution' },
        { credits: 3, providerType: 'institution' },
      ],
    };
    const input: InvariantInputs = {
      ...validInputs,
      terms: badTerms,
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.SLOT_TYPE_OR_PROVIDER_INVALID)).toBe(true);
  });

  it('skips term checks when expectedTermCount is undefined', () => {
    const config: InvariantConfig = {
      ...DEFAULT_INVARIANT_CONFIG,
      expectedTermCount: undefined,
      expectedTermCredits: undefined,
      expectedSlotsPerTerm: undefined,
    };
    const input: InvariantInputs = {
      ...validInputs,
      terms: validTerms.slice(0, 5), // Fewer terms
    };
    const result = evaluateInvariants(input, config);
    // Should not fail on term count since expectation is undefined
    expect(hasViolation(result, INVARIANT.TERM_COUNT_UNEXPECTED)).toBe(false);
  });
});

// ============================================
// F) Gate/Status Consistency Tests
// ============================================

describe('Gate/Status Consistency Invariants', () => {
  it('fails when active template with yellow gate', () => {
    const input: InvariantInputs = {
      ...validInputs,
      templateStatus: 'active',
      gateStatus: 'yellow',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE)).toBe(true);
  });

  it('fails when active template with red gate', () => {
    const input: InvariantInputs = {
      ...validInputs,
      templateStatus: 'active',
      gateStatus: 'red',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE)).toBe(true);
  });

  it('fails when pending_review template with red gate', () => {
    const input: InvariantInputs = {
      ...validInputs,
      templateStatus: 'pending_review',
      gateStatus: 'red',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    expect(result.ok).toBe(false);
    expect(hasViolation(result, INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE)).toBe(true);
  });

  it('passes when pending_review with yellow gate', () => {
    const input: InvariantInputs = {
      ...validInputs,
      templateStatus: 'pending_review',
      gateStatus: 'yellow',
    };
    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    // Should not fail on gate consistency
    expect(hasViolation(result, INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE)).toBe(false);
  });
});

// ============================================
// Deterministic Ordering Tests
// ============================================

describe('Deterministic Ordering', () => {
  it('violations are always in canonical order', () => {
    // Create input that triggers multiple violations
    const input: InvariantInputs = {
      credits: {
        requiredTotal: 120,
        total: 100, // Mismatch
        resident: 20, // Below residency
        transfer: 70, // Over cap
        alt: 10,
        unknown: 0,
      },
      caps: validCaps,
      terms: validTerms.slice(0, 8), // Wrong term count
      templateStatus: 'active',
      gateStatus: 'yellow', // Inconsistent with active
    };

    const result = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    const codes = getViolationCodes(result);

    // Verify order matches canonical priority
    expect(codes.indexOf(INVARIANT.TOTAL_CREDITS_MISMATCH)).toBeLessThan(
      codes.indexOf(INVARIANT.RESIDENCY_BELOW_MINIMUM)
    );
    expect(codes.indexOf(INVARIANT.RESIDENCY_BELOW_MINIMUM)).toBeLessThan(
      codes.indexOf(INVARIANT.SEPARATE_TRANSFER_CAP_EXCEEDED)
    );
    expect(codes.indexOf(INVARIANT.SEPARATE_TRANSFER_CAP_EXCEEDED)).toBeLessThan(
      codes.indexOf(INVARIANT.TERM_COUNT_UNEXPECTED)
    );
    expect(codes.indexOf(INVARIANT.TERM_COUNT_UNEXPECTED)).toBeLessThan(
      codes.indexOf(INVARIANT.TEMPLATE_STATUS_INCONSISTENT_WITH_GATE)
    );
  });

  it('same input always produces same output (full snapshot comparison)', () => {
    const input: InvariantInputs = {
      credits: {
        requiredTotal: 120,
        total: 115,
        resident: 25,
        transfer: 50,
        alt: 35,
        unknown: 5,
      },
      caps: validCaps,
      terms: validTerms,
      templateStatus: 'pending_review',
      gateStatus: 'yellow',
    };

    const result1 = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);
    const result2 = evaluateInvariants(input, DEFAULT_INVARIANT_CONFIG);

    // Full violation comparison including codes, severity, and messages
    expect(result1.violations).toEqual(result2.violations);
    expect(result1.ok).toBe(result2.ok);
    expect(result1.severity).toBe(result2.severity);
    expect(result1.computed).toEqual(result2.computed);
  });

  it('uses default config when config parameter omitted', () => {
    const result = evaluateInvariants(validInputs);
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('pass');
  });
});
