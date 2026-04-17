import { describe, it, expect } from 'vitest';
import { parsePercentageResidency } from '../../../supabase/functions/_shared/policyDerivation';

describe('parsePercentageResidency', () => {
  const url = 'https://example.edu/residency';

  it('returns null when text is empty or degree total is invalid', () => {
    expect(parsePercentageResidency('', 120, url)).toBeNull();
    expect(
      parsePercentageResidency('25% of degree must be earned at the institution', 0, url),
    ).toBeNull();
    expect(
      parsePercentageResidency('25% of degree must be earned at the institution', NaN, url),
    ).toBeNull();
  });

  it('parses "25% of degree must be completed at the institution" with bachelor total 120', () => {
    const text =
      'A minimum of 25% of the degree must be completed at the institution to earn a Liberty degree.';
    const result = parsePercentageResidency(text, 120, url);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(30);
    expect(result!.basis.percent).toBeCloseTo(0.25, 4);
    expect(result!.basis.degree_credit_total).toBe(120);
    expect(result!.basis.computed_value).toBe(30);
    expect(result!.basis.source_url).toBe(url);
    expect(result!.basis.type).toBe('percentage_of_degree');
    expect(result!.confidence).toBeGreaterThanOrEqual(85);
  });

  it('parses "25 percent" spelled form', () => {
    const text =
      'Students must complete at least 25 percent of credits in residence at the university.';
    const result = parsePercentageResidency(text, 120, url);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(30);
  });

  it('parses spelled fraction "one-fourth"', () => {
    const text =
      'A student must complete one-fourth of the bachelor degree at the institution.';
    const result = parsePercentageResidency(text, 120, url);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(30);
    expect(result!.basis.percent).toBeCloseTo(0.25, 4);
  });

  it('rejects percentages without residency anchor (e.g. tuition discount)', () => {
    const text =
      'Eligible students may receive a 25% tuition discount on graduate programs.';
    const result = parsePercentageResidency(text, 120, url);
    expect(result).toBeNull();
  });

  it('respects sane residency window (rejects 5% × 120 = 6 credits)', () => {
    const text = 'Only 5% of the degree must be completed at the institution.';
    const result = parsePercentageResidency(text, 120, url);
    // 5% of 120 = 6 credits → below 10 credit floor → rejected
    expect(result).toBeNull();
  });

  it('rejects 90% × 120 = 108 credits (above 80 cap)', () => {
    const text = '90% of the degree must be earned at the institution.';
    const result = parsePercentageResidency(text, 120, url);
    expect(result).toBeNull();
  });

  it('picks a residency-anchored candidate when both unrelated and residency phrases exist far apart', () => {
    // Pad with >250 chars between phrases so each candidate's ±120 window
    // is independent. This mirrors real catalog pages where unrelated %
    // language (tuition, etc.) appears far from the residency clause.
    const filler = ' '.repeat(300) + 'Unrelated paragraph about scholarships and aid programs offered to qualifying applicants throughout the year.' + ' '.repeat(300);
    const text =
      'Eligible students may receive a 50% tuition discount on graduate programs.' +
      filler +
      'At least 25% of the degree must be completed at the institution to graduate.';
    const result = parsePercentageResidency(text, 120, url);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(30);
    expect(result!.basis.percent).toBeCloseTo(0.25, 4);
  });

  it('uses provided degree_credit_total (e.g. 60 for associate) for the math', () => {
    const text = '25% of the degree must be completed at the institution.';
    const result = parsePercentageResidency(text, 60, url);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(15);
    expect(result!.basis.degree_credit_total).toBe(60);
  });

  it('captures a context_snippet for reviewer audit', () => {
    const text =
      'Per Liberty policy, 25% of the degree must be completed at the institution before graduation.';
    const result = parsePercentageResidency(text, 120, url);
    expect(result).not.toBeNull();
    expect(typeof result!.basis.context_snippet).toBe('string');
    expect(result!.basis.context_snippet.length).toBeGreaterThan(0);
    expect(result!.basis.context_snippet.toLowerCase()).toContain('25%');
  });
});
