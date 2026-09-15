/**
 * Compare-table tests.
 *
 * buildCompareRows produces the on-screen ordering of schools and the badges
 * ("Cheapest", "Fastest") users read as recommendations. It had no test file.
 *
 * The behaviours worth protecting are the quiet ones: that a tie does NOT
 * produce a badge (a badge on two schools is worse than none), and that the
 * "what choosing wrong costs you" penalties are never negative.
 */
import { describe, it, expect } from 'vitest';
import { buildCompareRows, formatCost, formatYears } from '../buildCompareRows';

/** Minimal template shaped the way scorePool + buildCompareRows read it. */
function tpl(over: Record<string, unknown> = {}) {
  return {
    programId: 'BSBA',
    anchorSchool: 'TESU',
    totals: { credits: 120, costUsd: 10_000, weeks: 104 },
    est: { credits: 120 },
    twoPhaseData: { altCredits: 90 },
    ...over,
  } as never;
}

const noPicker = {} as never;

describe('ordering', () => {
  it('returns an empty array for no templates', () => {
    expect(buildCompareRows([], noPicker, 'balanced')).toEqual([]);
  });

  it('marks exactly one row as best', () => {
    const rows = buildCompareRows(
      [
        tpl({ anchorSchool: 'TESU', totals: { credits: 120, costUsd: 10_000, weeks: 104 } }),
        tpl({ anchorSchool: 'COSC', totals: { credits: 120, costUsd: 20_000, weeks: 156 } }),
      ],
      noPicker,
      'balanced'
    );
    expect(rows.filter((r) => r.isBest)).toHaveLength(1);
    expect(rows[0].isBest).toBe(true);
  });

  it('sorts by composite score descending', () => {
    const rows = buildCompareRows(
      [
        tpl({ anchorSchool: 'EXPENSIVE', totals: { credits: 120, costUsd: 40_000, weeks: 208 } }),
        tpl({ anchorSchool: 'CHEAP', totals: { credits: 120, costUsd: 8_000, weeks: 104 } }),
      ],
      noPicker,
      'cheapest'
    );
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score);
    }
    expect(rows[0].school).toBe('CHEAP');
  });

  it('uppercases the school code for display', () => {
    const rows = buildCompareRows([tpl({ anchorSchool: 'tesu' })], noPicker, 'balanced');
    expect(rows[0].school).toBe('TESU');
  });
});

describe('superlative badges', () => {
  it('awards Cheapest to a strictly cheaper school', () => {
    const rows = buildCompareRows(
      [
        tpl({ anchorSchool: 'A', totals: { credits: 120, costUsd: 8_000, weeks: 104 } }),
        tpl({ anchorSchool: 'B', totals: { credits: 120, costUsd: 20_000, weeks: 104 } }),
      ],
      noPicker,
      'balanced'
    );
    expect(rows.find((r) => r.school === 'A')!.isCheapest).toBe(true);
    expect(rows.find((r) => r.school === 'B')!.isCheapest).toBe(false);
  });

  it('awards NO Cheapest badge when two schools tie', () => {
    // A badge on both reads as meaningless; a badge on one of two equals is a
    // lie. Neither gets it.
    const rows = buildCompareRows(
      [
        tpl({ anchorSchool: 'A', totals: { credits: 120, costUsd: 10_000, weeks: 104 } }),
        tpl({ anchorSchool: 'B', totals: { credits: 120, costUsd: 10_000, weeks: 130 } }),
      ],
      noPicker,
      'balanced'
    );
    expect(rows.filter((r) => r.isCheapest)).toHaveLength(0);
  });

  it('awards no badges at all for a single-row pool', () => {
    const rows = buildCompareRows([tpl()], noPicker, 'balanced');
    expect(rows[0].isCheapest).toBe(false);
    expect(rows[0].isFastest).toBe(false);
    expect(rows[0].isMostCreditFriendly).toBe(false);
  });

  it('awards Fastest to the strictly shorter plan', () => {
    const rows = buildCompareRows(
      [
        tpl({ anchorSchool: 'SLOW', totals: { credits: 120, costUsd: 10_000, weeks: 208 } }),
        tpl({ anchorSchool: 'FAST', totals: { credits: 120, costUsd: 10_000, weeks: 52 } }),
      ],
      noPicker,
      'balanced'
    );
    expect(rows.find((r) => r.school === 'FAST')!.isFastest).toBe(true);
  });
});

describe('wrong-choice penalties', () => {
  it('is always zero for the best row', () => {
    const rows = buildCompareRows(
      [
        tpl({ anchorSchool: 'A', totals: { credits: 120, costUsd: 8_000, weeks: 104 } }),
        tpl({ anchorSchool: 'B', totals: { credits: 120, costUsd: 20_000, weeks: 156 } }),
      ],
      noPicker,
      'cheapest'
    );
    expect(rows[0].costPenaltyVsBest).toBe(0);
    expect(rows[0].weeksPenaltyVsBest).toBe(0);
  });

  it('is never negative, even when a lower-ranked school is cheaper', () => {
    // Under 'fastest', the top row may cost more than a slower one. The penalty
    // must clamp at 0 rather than rendering as a negative "saving".
    const rows = buildCompareRows(
      [
        tpl({ anchorSchool: 'FAST_PRICEY', totals: { credits: 120, costUsd: 30_000, weeks: 52 } }),
        tpl({ anchorSchool: 'SLOW_CHEAP', totals: { credits: 120, costUsd: 5_000, weeks: 260 } }),
      ],
      noPicker,
      'fastest'
    );
    for (const r of rows) {
      expect(r.costPenaltyVsBest).toBeGreaterThanOrEqual(0);
      expect(r.weeksPenaltyVsBest).toBeGreaterThanOrEqual(0);
    }
  });

  it('labels every row with the best school so penalties read "vs X"', () => {
    const rows = buildCompareRows(
      [tpl({ anchorSchool: 'A' }), tpl({ anchorSchool: 'B', totals: { credits: 120, costUsd: 30_000, weeks: 200 } })],
      noPicker,
      'balanced'
    );
    expect(rows.every((r) => r.bestSchoolLabel === rows[0].school)).toBe(true);
  });
});

describe('credit accounting', () => {
  it('never reports negative remaining credits', () => {
    const rows = buildCompareRows(
      [tpl({ twoPhaseData: { altCredits: 500 } })],
      noPicker,
      'balanced'
    );
    expect(rows[0].remainingCredits).toBeGreaterThanOrEqual(0);
  });

  it('falls back to 120 total credits when a template omits them', () => {
    const rows = buildCompareRows(
      [tpl({ totals: undefined, est: undefined })],
      noPicker,
      'balanced'
    );
    expect(rows[0].totalCredits).toBe(120);
  });

  it('keeps transferPercent within 0-100', () => {
    const rows = buildCompareRows(
      [tpl(), tpl({ anchorSchool: 'B', twoPhaseData: { altCredits: 0 } })],
      noPicker,
      'balanced'
    );
    for (const r of rows) {
      expect(r.transferPercent).toBeGreaterThanOrEqual(0);
      expect(r.transferPercent).toBeLessThanOrEqual(100);
    }
  });
});

describe('formatters', () => {
  it('renders an em dash rather than $0 for missing cost', () => {
    expect(formatCost(0)).toBe('—');
    expect(formatCost(NaN)).toBe('—');
    expect(formatCost(-5)).toBe('—');
  });

  it('abbreviates thousands', () => {
    expect(formatCost(10_000)).toBe('$10.0k');
    expect(formatCost(950)).toBe('$950');
  });

  it('renders years to one decimal, and an em dash for nothing', () => {
    expect(formatYears(52)).toBe('1.0 yrs');
    expect(formatYears(104)).toBe('2.0 yrs');
    expect(formatYears(0)).toBe('—');
  });
});
