/**
 * Fail-closed tests for the policy layer.
 *
 * Every case here was previously a silent pass. The pattern the audit found
 * repeatedly: a validator handed something it does not understand returns "no
 * issues", which downstream is indistinguishable from "checked and fine".
 *
 * An unknown institution or an unaccepted provider must produce a visible
 * problem, not an empty array.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateNoncollegiateCredits,
  validateUpperDivision,
  hasPolicy,
  getNoncollegiateCap,
  getResidencyCredits,
} from '../institutionPolicies';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('unknown institutions fail closed', () => {
  it('flags an unknown institution instead of reporting no issues', () => {
    const issues = validateNoncollegiateCredits('UNIVERSITY_OF_NOWHERE', { SOPHIA: 30 });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('UNKNOWN_INSTITUTION');
    expect(issues[0].type).toBe('error');
  });

  it('flags an unknown institution on upper-division validation too', () => {
    const issues = validateUpperDivision('UNIVERSITY_OF_NOWHERE', 0);
    expect(issues[0]?.code).toBe('UNKNOWN_INSTITUTION');
  });

  it('hasPolicy separates real institutions from guesses', () => {
    expect(hasPolicy('TESU')).toBe(true);
    expect(hasPolicy('WGU')).toBe(true);
    expect(hasPolicy('PHOENIX')).toBe(false);
    expect(hasPolicy('')).toBe(false);
  });

  it('warns loudly when a getter returns a placeholder for an unknown school', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getNoncollegiateCap('PHOENIX');
    getResidencyCredits('PHOENIX');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain('placeholder');
  });
});

describe('providers a school does not accept', () => {
  it('errors on Sophia credit aimed at WGU rather than silently scoring it 0', () => {
    // The audit's example: 90 Sophia credits at a school this codebase records
    // as not accepting Sophia. Previously produced zero issues.
    const issues = validateNoncollegiateCredits('WGU', { SOPHIA: 90 });
    const notAccepted = issues.find((i) => i.code === 'PROVIDER_NOT_ACCEPTED');
    expect(notAccepted).toBeDefined();
    expect(notAccepted!.type).toBe('error');
    expect(notAccepted!.message).toContain('SOPHIA');
  });

  it('errors on Study.com at WGU as well', () => {
    const issues = validateNoncollegiateCredits('WGU', { STUDYCOM: 30 });
    expect(issues.some((i) => i.code === 'PROVIDER_NOT_ACCEPTED')).toBe(true);
  });

  it('accepts Sophia at TESU, which does allow it', () => {
    const issues = validateNoncollegiateCredits('TESU', { SOPHIA: 30 });
    expect(issues.some((i) => i.code === 'PROVIDER_NOT_ACCEPTED')).toBe(false);
  });

  it('warns rather than errors for a provider with no record either way', () => {
    // StraighterLine is on no institution's allowlist, but no school on file
    // documents refusing it either. "We do not know" is the honest answer.
    const issues = validateNoncollegiateCredits('TESU', { STRAIGHTERLINE: 12 });
    const unmapped = issues.find((i) => i.code === 'PROVIDER_NOT_MAPPED');
    expect(unmapped).toBeDefined();
    expect(unmapped!.type).toBe('warning');
  });

  it('ignores collegiate sources, which this validator does not govern', () => {
    const issues = validateNoncollegiateCredits('TESU', { 'SOME_COMMUNITY_COLLEGE': 30 });
    expect(issues).toHaveLength(0);
  });

  it('ignores zero-credit entries', () => {
    const issues = validateNoncollegiateCredits('WGU', { SOPHIA: 0 });
    expect(issues).toHaveLength(0);
  });
});

describe('cap arithmetic still works after the reconciliation', () => {
  it('flags exceeding WGU\'s real 45-credit alt-credit cap', () => {
    const issues = validateNoncollegiateCredits('WGU', { CLEP: 30, DSST: 30 });
    const exceeded = issues.find((i) => i.code === 'NONCOLLEGIATE_CAP_EXCEEDED');
    expect(exceeded).toBeDefined();
    expect(exceeded!.message).toContain('45');
  });

  it('does not flag 45 credits at WGU, which is exactly the cap', () => {
    const issues = validateNoncollegiateCredits('WGU', { CLEP: 45 });
    expect(issues.some((i) => i.code === 'NONCOLLEGIATE_CAP_EXCEEDED')).toBe(false);
  });

  it('would NOT have flagged this under the old 78-credit cap', () => {
    // 60 credits sits between the old (wrong) 78 and the real 45. This is the
    // band where a student was told their plan worked and it did not.
    const issues = validateNoncollegiateCredits('WGU', { CLEP: 30, AP: 30 });
    expect(issues.some((i) => i.code === 'NONCOLLEGIATE_CAP_EXCEEDED')).toBe(true);
  });
});
