/**
 * Template validator tests.
 *
 * validateTemplate decides whether a degree plan is publishable and whether the
 * user sees "Template may not lead to graduation". It had no test file.
 *
 * Two things pinned here that the 2026-09-15 audit cared about:
 *  - an unanchored template must not be silently validated against TESU
 *  - parseCreditsFromLabel's silent 3-credit default, which is a real source of
 *    quiet undercounting
 */
import { describe, it, expect } from 'vitest';
import { parseCreditsFromLabel, validateTemplate } from '../templateValidator';

/** Minimal template shaped the way validateTemplate walks it. */
function makeTemplate(over: Record<string, unknown> = {}) {
  return {
    anchorSchool: 'TESU',
    yearTemplates: [
      {
        moduleTemplates: [
          {
            moduleId: 'm1',
            label: 'Humanities (6cr)',
            creditsRequired: 6,
            requirementArea: 'HUMANITIES',
            options: [
              { courseId: 'SOPH-101', credits: 3, providerCode: 'SOPHIA', providerType: 'mooc', level: 100 },
              { courseId: 'SOPH-102', credits: 3, providerCode: 'SOPHIA', providerType: 'mooc', level: 100 },
            ],
          },
        ],
      },
    ],
    ...over,
  };
}

describe('parseCreditsFromLabel', () => {
  it('parses the documented "(6cr)" form', () => {
    expect(parseCreditsFromLabel('Humanities (6cr)')).toBe(6);
    expect(parseCreditsFromLabel('Capstone (3cr)')).toBe(3);
  });

  it('defaults to 3 for a missing label', () => {
    expect(parseCreditsFromLabel(undefined)).toBe(3);
    expect(parseCreditsFromLabel('')).toBe(3);
  });

  it('SILENTLY defaults to 3 when a space creeps in — a real undercount risk', () => {
    // The regex is /\((\d+)cr\)/, so "(6 cr)" does not match and a 6-credit
    // module is counted as 3. Documented here because it is invisible at
    // runtime: no throw, no warning, just a wrong credit total. Any new label
    // format must either match this regex or this test must change.
    expect(parseCreditsFromLabel('Humanities (6 cr)')).toBe(3);
    expect(parseCreditsFromLabel('Humanities (6 credits)')).toBe(3);
    expect(parseCreditsFromLabel('Humanities - 6cr')).toBe(3);
  });

  it('takes the first parenthesised credit figure it finds', () => {
    expect(parseCreditsFromLabel('Elective (3cr) or Lab (4cr)')).toBe(3);
  });
});

describe('anchor school is never assumed', () => {
  it('flags a template with no anchor school instead of assuming TESU', () => {
    const result = validateTemplate(makeTemplate({ anchorSchool: undefined }));
    const issue = result.issues.find((i) => i.code === 'MISSING_ANCHOR_SCHOOL');
    expect(issue).toBeDefined();
    expect(issue!.blocksPublish).toBe(true);
    expect(result.publishable).toBe(false);
  });

  it('flags an anchor school we hold no policy for', () => {
    const result = validateTemplate(makeTemplate({ anchorSchool: 'UNIVERSITY_OF_NOWHERE' }));
    const issue = result.issues.find((i) => i.code === 'UNKNOWN_ANCHOR_SCHOOL');
    expect(issue).toBeDefined();
    expect(result.publishable).toBe(false);
  });

  it('does not raise either issue for a known anchor school', () => {
    const result = validateTemplate(makeTemplate());
    expect(result.issues.some((i) => i.code === 'MISSING_ANCHOR_SCHOOL')).toBe(false);
    expect(result.issues.some((i) => i.code === 'UNKNOWN_ANCHOR_SCHOOL')).toBe(false);
  });
});

describe('credit accounting', () => {
  it('counts a module as filled when its options cover the requirement', () => {
    const result = validateTemplate(makeTemplate());
    expect(result.metrics.filledModules).toBe(1);
    expect(result.metrics.unfilledModules).toEqual([]);
    expect(result.metrics.totalCredits).toBe(6);
  });

  it('records a module as unfilled when its options fall short', () => {
    const t = makeTemplate({
      yearTemplates: [
        {
          moduleTemplates: [
            {
              moduleId: 'short',
              label: 'Humanities (6cr)',
              creditsRequired: 6,
              options: [{ courseId: 'X', credits: 3, providerCode: 'SOPHIA', providerType: 'mooc' }],
            },
          ],
        },
      ],
    });
    const result = validateTemplate(t);
    expect(result.metrics.unfilledModules).toContain('short');
  });

  it('attributes credits to the provider that supplied them', () => {
    const result = validateTemplate(makeTemplate());
    expect(result.metrics.creditsByProvider.SOPHIA).toBe(6);
  });

  it('counts 300-level coursework as upper division', () => {
    const t = makeTemplate({
      yearTemplates: [
        {
          moduleTemplates: [
            {
              moduleId: 'ud',
              creditsRequired: 3,
              options: [{ courseId: 'UD-301', credits: 3, providerCode: 'TESU', providerType: 'university', level: 300 }],
            },
          ],
        },
      ],
    });
    expect(validateTemplate(t).metrics.upperDivCredits).toBe(3);
  });

  it('flags a credit shortfall against the degree total', () => {
    const result = validateTemplate(makeTemplate());
    // 6 credits is nowhere near 120.
    const shortfall = result.issues.find((i) => i.code === 'CREDIT_SHORTFALL');
    expect(shortfall).toBeDefined();
    expect(shortfall!.blocksPublish).toBe(true);
  });
});

describe('degenerate input must not throw', () => {
  it('handles a template with no yearTemplates', () => {
    const result = validateTemplate({ anchorSchool: 'TESU' });
    expect(result.metrics.moduleCount).toBe(0);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('handles modules with no options', () => {
    const t = makeTemplate({
      yearTemplates: [{ moduleTemplates: [{ moduleId: 'empty', creditsRequired: 3 }] }],
    });
    expect(() => validateTemplate(t)).not.toThrow();
  });

  it('handles an entirely empty object', () => {
    expect(() => validateTemplate({})).not.toThrow();
  });
});
