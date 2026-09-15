/**
 * Degree Safety Score tests.
 *
 * This score drives the risk band a user sees before committing to a plan, and
 * had no test file at all. Its whole design claim is "capped by weakest link" —
 * that a plan cannot look safe because of bonuses when the thing underneath it
 * is missing. That claim is what these tests pin down.
 */
import { describe, it, expect } from 'vitest';
import { calculateDegreeSafetyScore, getRiskBandConfig } from '../degreeSafetyScore';

const base = {
  targetSchool: 'TESU',
  totalCourses: 40,
  coursesWithRules: 40,
  coursesWithEvidence: 40,
  providers: ['SOPHIA', 'CLEP'],
};

describe('weakest-link caps', () => {
  it('caps at 40 when no course has a transfer rule', () => {
    const result = calculateDegreeSafetyScore({ ...base, coursesWithRules: 0, coursesWithEvidence: 0 });
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.weakestLink).toMatch(/no transfer rules/i);
  });

  it('caps at 60 when fewer than half the courses have rules', () => {
    const result = calculateDegreeSafetyScore({ ...base, coursesWithRules: 10, coursesWithEvidence: 10 });
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it('caps at 75 when the school has no policy verification', () => {
    // SNHU is not in POLICY_VERIFIED_SCHOOLS.
    const result = calculateDegreeSafetyScore({ ...base, targetSchool: 'SNHU' });
    expect(result.score).toBeLessThanOrEqual(75);
    expect(result.weakestLink).toBeTruthy();
  });

  it('a cap beats the bonuses — full marks elsewhere cannot lift a no-rules plan', () => {
    // This is the design claim. If bonuses could outvote the cap, a plan with
    // zero transfer rules could still read "low risk".
    const result = calculateDegreeSafetyScore({
      targetSchool: 'TESU',
      totalCourses: 40,
      coursesWithRules: 0,
      coursesWithEvidence: 0,
      providers: ['SOPHIA'],
      hasAssociatePathway: true,
    });
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.riskBand).toBe('high');
  });

  it('exempts a genuine single-institution path from the rules caps', () => {
    // All coursework at WGU: there is nothing to transfer, so absent transfer
    // rules are not a weakness.
    const result = calculateDegreeSafetyScore({
      targetSchool: 'WGU',
      totalCourses: 30,
      coursesWithRules: 0,
      coursesWithEvidence: 0,
      providers: ['WGU'],
    });
    expect(result.score).toBeGreaterThan(40);
  });
});

describe('risk bands', () => {
  it('reports low risk only for a fully-evidenced verified school', () => {
    const result = calculateDegreeSafetyScore(base);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.riskBand).toBe('low');
  });

  it('reports high risk for an unknown school with nothing behind it', () => {
    const result = calculateDegreeSafetyScore({
      targetSchool: 'UNKNOWN_U',
      totalCourses: 40,
      coursesWithRules: 0,
      coursesWithEvidence: 0,
      providers: ['MYSTERY_PROVIDER'],
    });
    expect(result.riskBand).toBe('high');
  });

  it('never returns a score outside 0-100', () => {
    const inputs = [
      base,
      { ...base, coursesWithRules: 0, coursesWithEvidence: 0, providers: [] },
      { ...base, totalCourses: 0, coursesWithRules: 0, coursesWithEvidence: 0 },
    ];
    for (const input of inputs) {
      const { score } = calculateDegreeSafetyScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('always returns a recommendation the UI can render', () => {
    expect(calculateDegreeSafetyScore(base).recommendation).toBeTruthy();
  });
});

describe('edge cases that must not throw', () => {
  it('handles zero courses without dividing by zero', () => {
    const result = calculateDegreeSafetyScore({
      targetSchool: 'TESU',
      totalCourses: 0,
      coursesWithRules: 0,
      coursesWithEvidence: 0,
      providers: [],
    });
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('handles an empty school code', () => {
    const result = calculateDegreeSafetyScore({ ...base, targetSchool: '' });
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.riskBand).toBeTruthy();
  });

  it('gives no known-provider bonus for an empty provider list', () => {
    // `[].every(...)` is true, so an empty list must not earn the bonus.
    const withProviders = calculateDegreeSafetyScore(base);
    const withoutProviders = calculateDegreeSafetyScore({ ...base, providers: [] });
    expect(withoutProviders.components.knownProviderBonus).toBe(0);
    expect(withProviders.components.knownProviderBonus).toBe(5);
  });
});

describe('getRiskBandConfig', () => {
  it('returns display config for every band', () => {
    for (const band of ['low', 'medium', 'high'] as const) {
      expect(getRiskBandConfig(band)).toBeTruthy();
    }
  });
});
