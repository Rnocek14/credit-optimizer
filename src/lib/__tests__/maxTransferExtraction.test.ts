// Vitest coverage for the max-transfer-credits anchored regex extractor.
// Re-imports the supabase _shared module (plain TS, no Deno deps).
import { describe, it, expect } from 'vitest';
import {
  extractMaxTransferCandidates,
  pickBestInstitutionMax,
  pickBestGraduateMax,
  pickBestMinimumRequired,
} from '../../../supabase/functions/_shared/maxTransferExtraction';

describe('extractMaxTransferCandidates', () => {
  it('returns [] for empty / non-string input', () => {
    expect(extractMaxTransferCandidates('')).toEqual([]);
    expect(extractMaxTransferCandidates(null as unknown as string)).toEqual([]);
  });

  it('captures ASUO institution-wide cap "up to 64 transfer credits"', () => {
    // Institution-wide phrasing: no "from <scoped-source>" restriction.
    const text =
      'ASU Online accepts up to 64 transfer credits toward your bachelor degree.';
    const cands = extractMaxTransferCandidates(text);
    const best = pickBestInstitutionMax(cands);
    expect(best).not.toBeNull();
    expect(best!.value).toBe(64);
    expect(best!.kind).toBe('institution_max');
    expect(best!.confidence).toBeGreaterThanOrEqual(85);
  });

  it('captures graduate cap "up to 12 graduate credits"', () => {
    const text =
      'Graduate students may transfer up to 12 graduate credits from another regionally accredited institution.';
    const cands = extractMaxTransferCandidates(text);
    const grad = pickBestGraduateMax(cands);
    expect(grad).not.toBeNull();
    expect(grad!.value).toBe(12);
    expect(grad!.kind).toBe('graduate_max');
  });

  it('captures minimum required "minimum of 24 transfer credits"', () => {
    const text =
      'A minimum of 24 transfer credits is required for admission to the program.';
    const cands = extractMaxTransferCandidates(text);
    const min = pickBestMinimumRequired(cands);
    expect(min).not.toBeNull();
    expect(min!.value).toBe(24);
    expect(min!.kind).toBe('minimum_required');
  });

  it('demotes program-scoped cap to program_specific (BA Liberal Studies → 90)', () => {
    const text =
      'For the BA in Liberal Studies, students may transfer up to 90 credits toward the degree.';
    const cands = extractMaxTransferCandidates(text);
    // The "up to 90 credits" pattern fires; window contains "ba in liberal studies"
    const inst = pickBestInstitutionMax(cands);
    // Either no institution_max picked, OR the only inst-match got demoted
    expect(inst === null || inst.value !== 90).toBe(true);
    const programs = cands.filter((c) => c.kind === 'program_specific');
    expect(programs.some((c) => c.value === 90)).toBe(true);
  });

  it('drops tuition $ context (e.g. "$64 per credit")', () => {
    const text = 'Online undergraduate tuition is $64 per credit hour for in-state students.';
    const cands = extractMaxTransferCandidates(text);
    // $64 should NOT be picked up as a transfer cap
    expect(cands.find((c) => c.value === 64)).toBeUndefined();
  });

  it('drops scholarship/discount % context', () => {
    const text =
      'Eligible transfer students may receive up to 30 credits matched against scholarship awards.';
    const cands = extractMaxTransferCandidates(text);
    // "scholarship" in window → should drop
    expect(cands.length).toBe(0);
  });

  it('rejects implausibly small (<6) and large (>150) values', () => {
    const text =
      'You may transfer up to 3 credits in this category, or up to 200 transfer credits in total.';
    const cands = extractMaxTransferCandidates(text);
    expect(cands.find((c) => c.value === 3)).toBeUndefined();
    expect(cands.find((c) => c.value === 200)).toBeUndefined();
  });

  it('handles "maximum of 64 transfer credits" phrasing', () => {
    const text =
      'The university will accept a maximum of 64 transfer credits toward an undergraduate degree.';
    const best = pickBestInstitutionMax(extractMaxTransferCandidates(text));
    expect(best).not.toBeNull();
    expect(best!.value).toBe(64);
  });

  it('boosts institution_max confidence when "university" / "institution" in window', () => {
    const text = 'The university accepts up to 64 transfer credits.';
    const best = pickBestInstitutionMax(extractMaxTransferCandidates(text));
    expect(best).not.toBeNull();
    // base 85 + boost 5 → 90
    expect(best!.confidence).toBeGreaterThanOrEqual(90);
  });

  it('returns multiple candidates from a mixed paragraph (64 inst + 12 grad)', () => {
    const text =
      "ASU Online accepts up to 64 transfer credits from community colleges. " +
      "Graduate programs allow up to 12 graduate credits to transfer.";
    const cands = extractMaxTransferCandidates(text);
    expect(pickBestInstitutionMax(cands)?.value).toBe(64);
    expect(pickBestGraduateMax(cands)?.value).toBe(12);
  });

  it('captures contextSnippet with original casing for reviewer audit', () => {
    const text = 'ASU Online accepts up to 64 transfer credits.';
    const best = pickBestInstitutionMax(extractMaxTransferCandidates(text));
    expect(best!.contextSnippet).toContain('64');
    expect(best!.contextSnippet).toMatch(/ASU Online|accepts/);
  });
});
