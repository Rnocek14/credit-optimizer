// Vitest cases for the multi-cap scope binder.
// We re-import from the supabase _shared dir; the file is plain TS with no Deno deps.
import { describe, it, expect } from 'vitest';
import {
  detectMultiCapScope,
  isValueScopedByBinding,
} from '../../../supabase/functions/_shared/multiCapScopeBinder.ts';

describe('detectMultiCapScope', () => {
  it('binds associate=45 and bachelor=90 in a clean sentence', () => {
    const text =
      "Students may transfer up to 45 credits for an associate degree and up to 90 credits for a bachelor's degree.";
    const result = detectMultiCapScope(text, 'https://example.edu/transfer');
    expect(result).not.toBeNull();
    expect(result!.associate_value).toBe(45);
    expect(result!.bachelor_value).toBe(90);
    expect(result!.confidence).toBeGreaterThanOrEqual(85);
  });

  it('handles semicolon-separated clauses', () => {
    const text =
      "Transfer maximums: 30 credits for an associate's degree; 75 credits for a bachelor's degree.";
    const result = detectMultiCapScope(text);
    expect(result).not.toBeNull();
    expect(result!.associate_value).toBe(30);
    expect(result!.bachelor_value).toBe(75);
  });

  it('returns null when only one degree level is mentioned', () => {
    const text = "Up to 90 credits may transfer toward a bachelor's degree.";
    expect(detectMultiCapScope(text)).toBeNull();
  });

  it('returns null when associate value exceeds bachelor (sanity bound)', () => {
    const text =
      "Students may transfer 100 credits for an associate degree and 80 credits for a bachelor's degree.";
    expect(detectMultiCapScope(text)).toBeNull();
  });

  it('returns null when values are out of plausible range', () => {
    const text = "5 credits for an associate degree, 200 credits for a bachelor's degree.";
    expect(detectMultiCapScope(text)).toBeNull();
  });

  it('rejects ambiguous cross-contaminated phrasing', () => {
    // Both anchors appear within 30 chars of each value → ambiguous
    const text =
      "30 credits at the associate or bachelor level and 60 credits at the bachelor or associate level.";
    expect(detectMultiCapScope(text)).toBeNull();
  });

  it('isValueScopedByBinding marks associate as scoped, bachelor as institution-wide', () => {
    const text =
      "Up to 45 credits for an associate degree and up to 90 credits for a bachelor's degree.";
    const binding = detectMultiCapScope(text)!;
    expect(isValueScopedByBinding(binding, 45).isScoped).toBe(true);
    expect(isValueScopedByBinding(binding, 90).isScoped).toBe(false);
    expect(isValueScopedByBinding(binding, 60).isScoped).toBe(false);
  });

  it('handles AA / BS shorthand', () => {
    const text =
      "Maximum transfer credit: 60 credits for an AA degree and 90 credits for a BS degree.";
    const result = detectMultiCapScope(text);
    expect(result).not.toBeNull();
    expect(result!.associate_value).toBe(60);
    expect(result!.bachelor_value).toBe(90);
  });

  it('skips mega-paragraphs to avoid noise', () => {
    const long = 'lorem ipsum '.repeat(80);
    const text = `${long} 45 credits for an associate degree and 90 credits for a bachelor's degree. ${long}`;
    // Single mega-paragraph (>600 chars) should be skipped per binder rules
    expect(detectMultiCapScope(text)).toBeNull();
  });
});
