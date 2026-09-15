/**
 * Transfer-coverage regression tests.
 *
 * THE BUG THIS PINS DOWN
 * ----------------------
 * Coverage used to be computed as `status !== 'unknown'`, while the no-rule
 * path in useTransferVerification never returned 'unknown' — it ran a
 * provider-name heuristic that resolved TESU/COSC/EXCELSIOR to 'verified' and
 * Sophia/Study.com/StraighterLine/CLEP to 'elective'. The two together pinned
 * "Transfer Verification Coverage" at 100% by construction: no database state
 * could move the number, and the panel told users
 * "N of N transferable courses have verified rules" with an empty rule table.
 *
 * Coverage now keys on `hasRule`. The first test below fails against the old
 * implementation, which is the point.
 */
import { describe, it, expect } from 'vitest';
import { computeTransferCoverage } from '../transferCoverage';

type V = Parameters<typeof computeTransferCoverage>[0][number];

const v = (providerCode: string, status: V['status'], hasRule: boolean): V => ({
  providerCode,
  status,
  hasRule,
});

describe('computeTransferCoverage — the 100% regression', () => {
  it('reports 0% when no course has a backing rule', () => {
    // Exactly the old failure shape: statuses that are not 'unknown', but
    // nothing behind them.
    const coverage = computeTransferCoverage([
      v('SOPHIA', 'elective', false),
      v('STUDYCOM', 'elective', false),
      v('CLEP', 'elective', false),
    ]);

    expect(coverage.coveragePercent).toBe(0);
    expect(coverage.coveredPairs).toBe(0);
    expect(coverage.uncoveredPairs).toBe(3);
  });

  it('does not count an inferred "verified" status as coverage', () => {
    const coverage = computeTransferCoverage([v('TESU', 'verified', false)]);
    expect(coverage.coveragePercent).toBe(0);
  });

  it('counts only the courses that actually have a rule', () => {
    const coverage = computeTransferCoverage([
      v('SOPHIA', 'verified', true),
      v('SOPHIA', 'elective', false),
      v('CLEP', 'verified', true),
      v('DSST', 'unknown', false),
    ]);

    expect(coverage.totalPairs).toBe(4);
    expect(coverage.coveredPairs).toBe(2);
    expect(coverage.coveragePercent).toBe(50);
  });

  it('still counts a rule that exists but is stale — stale is not absent', () => {
    // Staleness downgrades the badge to 'review'; it does not erase the row.
    const coverage = computeTransferCoverage([v('SOPHIA', 'review', true)]);
    expect(coverage.coveragePercent).toBe(100);
  });

  it('counts a rejection as covered — knowing it does NOT transfer is data', () => {
    const coverage = computeTransferCoverage([v('SOPHIA', 'review', true)]);
    expect(coverage.coveredPairs).toBe(1);
  });
});

describe('computeTransferCoverage — bookkeeping', () => {
  it('excludes anchor-school residency courses from the denominator', () => {
    const coverage = computeTransferCoverage(
      [v('TESU', 'verified', false), v('SOPHIA', 'verified', true)],
      'TESU'
    );
    expect(coverage.totalPairs).toBe(1);
    expect(coverage.coveragePercent).toBe(100);
  });

  it('skips entries with no provider code', () => {
    const coverage = computeTransferCoverage([v('', 'unknown', false)]);
    expect(coverage.totalPairs).toBe(0);
    expect(coverage.coveragePercent).toBe(0);
  });

  it('breaks coverage down per provider using normalized names', () => {
    const coverage = computeTransferCoverage([
      v('SOPHIA', 'verified', true),
      v('SOPHIA', 'unknown', false),
      v('SDC', 'verified', true), // alias for STUDYCOM
    ]);

    expect(coverage.byProvider.SOPHIA).toEqual({ total: 2, covered: 1, percent: 50 });
    expect(coverage.byProvider.STUDYCOM).toEqual({ total: 1, covered: 1, percent: 100 });
  });

  it('reports 0% rather than dividing by zero on an empty plan', () => {
    const coverage = computeTransferCoverage([]);
    expect(coverage.coveragePercent).toBe(0);
    expect(coverage.totalPairs).toBe(0);
  });
});
