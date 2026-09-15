/**
 * Tiered savings tests.
 *
 * This module produces the dollar figures a user sees before deciding to spend
 * thousands, and had no test file. The invariant that matters most is the
 * ordering: guaranteed <= possible <= maximum. If that ever inverts, the UI
 * promises more certainty than the evidence supports — which is exactly the
 * failure class the 2026-09-15 audit was about.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyTier,
  computeTierBreakdown,
  calculateTieredSavings,
  shouldShowSavings,
  type TieredTransferResult,
} from '../tieredSavingsCalculator';

const result = (over: Partial<TieredTransferResult> = {}): TieredTransferResult => ({
  courseCode: 'C1',
  providerCode: 'SOPHIA',
  status: 'verified',
  tier: 'A',
  confidence: 0.95,
  evidenceUrl: 'https://example.edu/evidence',
  ruleSource: 'ACE',
  credits: 3,
  costUsd: 100,
  ...over,
});

const template = (over: Record<string, unknown> = {}) =>
  ({
    programId: 'BSBA',
    anchorSchool: 'TESU',
    totals: { credits: 120, costUsd: 10_000 },
    singleSchoolBaseline: { costUsd: 40_000 },
    ...over,
  }) as never;

describe('classifyTier', () => {
  it('is Tier C when there is no rule at all', () => {
    expect(classifyTier(false, null, null)).toBe('C');
    expect(classifyTier(true, null, null)).toBe('C');
  });

  it('is Tier A only with BOTH an http evidence URL and high confidence', () => {
    expect(classifyTier(true, { evidence_url: 'https://x.edu/e', confidence: 0.95 }, null)).toBe('A');
  });

  it('drops to Tier B when confidence is below the Tier A threshold', () => {
    expect(classifyTier(true, { evidence_url: 'https://x.edu/e', confidence: 0.8 }, null)).toBe('B');
  });

  it('drops to Tier B when evidence is missing, however confident', () => {
    expect(classifyTier(true, { evidence_url: null, confidence: 1 }, null)).toBe('B');
  });

  it('does not accept a non-http string as evidence', () => {
    // "see the catalog" is not a document.
    expect(classifyTier(true, { evidence_url: 'see the catalog', confidence: 0.99 }, null)).toBe('B');
  });
});

describe('computeTierBreakdown', () => {
  it('sums credits and cost into the right buckets', () => {
    const breakdown = computeTierBreakdown([
      result({ tier: 'A', credits: 3, costUsd: 100 }),
      result({ tier: 'A', credits: 3, costUsd: 150 }),
      result({ tier: 'B', credits: 6, costUsd: 200 }),
      result({ tier: 'C', credits: 3, costUsd: 0 }),
    ]);

    expect(breakdown.tierA).toMatchObject({ credits: 6, costUsd: 250, count: 2 });
    expect(breakdown.tierB).toMatchObject({ credits: 6, costUsd: 200, count: 1 });
    expect(breakdown.tierC).toMatchObject({ credits: 3, count: 1 });
  });

  it('returns empty buckets for no results rather than throwing', () => {
    const breakdown = computeTierBreakdown([]);
    expect(breakdown.tierA.count).toBe(0);
    expect(breakdown.tierC.credits).toBe(0);
  });
});

describe('calculateTieredSavings — refuses to fabricate', () => {
  it('returns null when the template has no baseline to compare against', () => {
    expect(calculateTieredSavings(template({ singleSchoolBaseline: null }), [result()], null)).toBeNull();
  });

  it('returns null for an implausible sub-$1000 baseline', () => {
    // A whole degree cannot cost $900; that is bad data, not a bargain.
    expect(
      calculateTieredSavings(template({ singleSchoolBaseline: { costUsd: 900 } }), [result()], null)
    ).toBeNull();
  });

  it('returns null when the multi-school route costs MORE than the baseline', () => {
    const t = template({ totals: { credits: 120, costUsd: 50_000 } });
    expect(calculateTieredSavings(t, [result()], null)).toBeNull();
  });
});

describe('calculateTieredSavings — the ordering invariant', () => {
  const results = [
    result({ tier: 'A', credits: 30, costUsd: 1_000 }),
    result({ tier: 'B', credits: 30, costUsd: 1_000 }),
    result({ tier: 'C', credits: 30, costUsd: 1_000 }),
  ];

  it('never claims more guaranteed savings than possible savings', () => {
    const savings = calculateTieredSavings(template(), results, null)!;
    expect(savings.guaranteedSavings).toBeLessThanOrEqual(savings.possibleSavings);
  });

  it('never claims more possible savings than the plan actually saves', () => {
    const savings = calculateTieredSavings(template(), results, null)!;
    expect(savings.possibleSavings).toBeLessThanOrEqual(savings.maximumSavings);
  });

  it('holds the ordering when everything is unverified Tier C', () => {
    // With no Tier A evidence, the guaranteed figure must not inherit the
    // plan's headline savings.
    const cOnly = [result({ tier: 'C', credits: 90, costUsd: 3_000 })];
    const savings = calculateTieredSavings(template(), cOnly, null)!;
    expect(savings.guaranteedSavings).toBe(0);
    expect(savings.maximumSavings).toBeGreaterThan(0);
  });

  it('reports percentages consistent with the dollar figures', () => {
    const savings = calculateTieredSavings(template(), results, null)!;
    expect(savings.guaranteedPercent).toBeLessThanOrEqual(savings.possiblePercent);
    expect(savings.possiblePercent).toBeLessThanOrEqual(savings.maximumPercent);
  });

  it('counts verified courses as Tier A only', () => {
    const savings = calculateTieredSavings(template(), results, null)!;
    expect(savings.totalCourses).toBe(3);
    expect(savings.verifiedCourses).toBe(1);
  });

  it('reports policy as unverified when no policy was supplied', () => {
    const savings = calculateTieredSavings(template(), results, null)!;
    expect(savings.policyVerified).toBe(false);
    expect(savings.policyConfidence).toBe(0);
  });
});

describe('shouldShowSavings', () => {
  it('suppresses a null result', () => {
    expect(shouldShowSavings(null)).toBe(false);
  });

  it('suppresses savings below the display threshold', () => {
    expect(shouldShowSavings({ maximumSavings: 100 } as never)).toBe(false);
  });

  it('shows savings at or above the threshold', () => {
    expect(shouldShowSavings({ maximumSavings: 5_000 } as never)).toBe(true);
  });
});
