/**
 * Source-quality gate unit tests
 * Run with: deno test tests/sourceQualityGate.test.ts --allow-env
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  evaluateSourceQuality,
  type GateDiagnostic,
  type GateExtraction,
} from '../supabase/functions/_shared/sourceQualityGate.ts';

const numericExtraction: GateExtraction = {
  policy_pack: {
    residency_policy: { min_institutional_credits: 30 },
    transfer_credit_limits: {
      max_total_transfer_credits: 90,
      max_ace_nccrs_credits: null,
      min_regionally_accredited_credits: null,
    },
    upper_level_requirements: { min_upper_level_credits: null },
  },
};

const emptyExtraction: GateExtraction = { policy_pack: null };

Deno.test('gate: passes when ok diagnostics + numeric policy signal', () => {
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/y', text_length: 5000, content_class: 'ok', keyword_hits: 8, status: '200' },
  ];
  const v = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [numericExtraction] });
  assertEquals(v.ok, true);
});

Deno.test('gate: source_insufficient_no_extractions when no extractions', () => {
  const v = evaluateSourceQuality({ url_diagnostics: [], extractions: [] });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_no_extractions');
    assertEquals(v.recommended_action, 'template_repair');
  }
});

Deno.test('gate: source_insufficient_404 when every URL is HTTP error', () => {
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/a', text_length: 0, content_class: 'error_page', status: '404' },
    { url: 'https://x/b', text_length: 0, content_class: 'error_page', status: '500' },
  ];
  const v = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [emptyExtraction] });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_404');
    assertEquals(v.recommended_action, 'template_repair');
  }
});

Deno.test('gate: source_insufficient_blocked when all pages empty/js_junk', () => {
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/a', text_length: 0, content_class: 'js_junk', status: '200' },
    { url: 'https://x/b', text_length: null, content_class: 'js_junk', status: '200' },
  ];
  const v = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [emptyExtraction] });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_blocked');
    assertEquals(v.recommended_action, 'rendered_fetch');
  }
});

Deno.test('gate: source_insufficient_shell when only too_short shell pages (no 404-equivalents)', () => {
  // Both pages are tiny shells (200 OK, no keywords, no not-found markers).
  // After v1.1 mixed-failure precedence, error_page entries are 404-equivalent,
  // so the pure shell case requires non-error_page diagnostics.
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/a', text_length: 80, content_class: 'too_short', keyword_hits: 0, status: '200', sample: 'Welcome to our site' },
    { url: 'https://x/b', text_length: 50, content_class: 'too_short', keyword_hits: 0, status: '200', sample: 'Cookie consent banner' },
  ];
  const v = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [emptyExtraction] });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_shell');
    assertEquals(v.recommended_action, 'alternate_source');
  }
});

Deno.test('gate: source_insufficient_nav_only when ok pages have zero keyword hits', () => {
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/marketing', text_length: 9000, content_class: 'ok', keyword_hits: 0, status: '200' },
    { url: 'https://x/about', text_length: 4000, content_class: 'ok', keyword_hits: 0, status: '200' },
  ];
  const v = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [emptyExtraction] });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_nav_only');
    assertEquals(v.recommended_action, 'template_repair');
  }
});

Deno.test('gate: source_insufficient_no_numeric_policy when policy text but no numbers extracted', () => {
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/policy', text_length: 5000, content_class: 'ok', keyword_hits: 12, status: '200' },
  ];
  const v = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [emptyExtraction] });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_no_numeric_policy');
    assertEquals(v.recommended_action, 'extraction_review');
  }
});

Deno.test('gate: pass-through when no diagnostics but extractions have numeric signal', () => {
  const v = evaluateSourceQuality({ url_diagnostics: [], extractions: [numericExtraction] });
  assertEquals(v.ok, true);
});

Deno.test('gate: idempotent — repeated calls produce identical verdicts', () => {
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/y', text_length: 5000, content_class: 'ok', keyword_hits: 8, status: '200' },
  ];
  const a = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [numericExtraction] });
  const b = evaluateSourceQuality({ url_diagnostics: diagnostics, extractions: [numericExtraction] });
  assertEquals(a.ok, b.ok);
});

// ============================================================================
// v1.1.0 hardening: soft-404 detection + mixed-failure precedence
// ============================================================================

Deno.test('gate v1.1: soft-404 on HTTP 200 is detected via sample text', () => {
  // ASU pattern: status=200 but sample says "Oops! Page not found"
  const diagnostics: GateDiagnostic[] = [
    {
      url: 'https://asuonline.asu.edu/admission/transfer-credit/',
      text_length: 6180,
      content_class: 'error_page',
      keyword_hits: 1,
      status: '200',
      sample: '# Oops! Page not found\n\nWe can\u2019t find the requested URL "/404"',
    },
    {
      url: 'https://asuonline.asu.edu/admission/transfer-credit/2',
      text_length: 1200,
      content_class: 'ok',
      keyword_hits: 0,
      status: '200',
      sample: 'Sorry, the page you requested cannot be found.',
    },
  ];
  const v = evaluateSourceQuality({
    url_diagnostics: diagnostics,
    extractions: [emptyExtraction],
  });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_404');
    assertEquals(v.recommended_action, 'template_repair');
  }
});

Deno.test('gate v1.1: ASUO mixed pattern → 404 + template_repair (NOT no_numeric_policy)', () => {
  // Real ASUO sweep: 1 soft-404 (status=200) + 2 marketing pages with a few keywords
  const diagnostics: GateDiagnostic[] = [
    {
      url: 'https://catalog.asu.edu/',
      text_length: 773,
      content_class: 'ok',
      keyword_hits: 1,
      status: '200',
      sample: '# Academic Catalog\n\nStudents can research majors',
    },
    {
      url: 'https://asuonline.asu.edu/admission/transfer-credit/',
      text_length: 6180,
      content_class: 'error_page',
      keyword_hits: 1,
      status: '200',
      sample: '# Oops! Page not found\n\nWe can\u2019t find the requested URL "/404"',
    },
    {
      url: 'https://admission.asu.edu/transfer',
      text_length: 5880,
      content_class: 'ok',
      keyword_hits: 2,
      status: '200',
      sample: '# Transfer to ASU\n\nWhy transfer to Arizona State University',
    },
  ];
  const v = evaluateSourceQuality({
    url_diagnostics: diagnostics,
    extractions: [emptyExtraction, emptyExtraction, emptyExtraction],
  });
  assertEquals(v.ok, false);
  if (!v.ok) {
    // The whole point of v1.1: this used to be no_numeric_policy → extraction_review,
    // which is the wrong operational signal. Now it correctly routes to template_repair.
    assertEquals(v.code, 'source_insufficient_404');
    assertEquals(v.recommended_action, 'template_repair');
  }
});

Deno.test('gate v1.1: mixed 404 but numeric signal present → still passes', () => {
  // If at least one page produced a real numeric signal, don't block on a
  // sibling 404. The merge can still proceed with the good page.
  const diagnostics: GateDiagnostic[] = [
    {
      url: 'https://x/dead',
      text_length: 100,
      content_class: 'error_page',
      keyword_hits: 0,
      status: '404',
    },
    {
      url: 'https://x/policy',
      text_length: 8000,
      content_class: 'ok',
      keyword_hits: 12,
      status: '200',
    },
  ];
  const v = evaluateSourceQuality({
    url_diagnostics: diagnostics,
    extractions: [numericExtraction],
  });
  assertEquals(v.ok, true);
});

Deno.test('gate v1.1: pure no_numeric_policy still routes to extraction_review (no 404s)', () => {
  // Regression: with zero 404-equivalents in the bundle, the existing
  // extraction_review code path must still fire.
  const diagnostics: GateDiagnostic[] = [
    {
      url: 'https://x/policy',
      text_length: 5000,
      content_class: 'ok',
      keyword_hits: 12,
      status: '200',
      sample: 'Transfer credit policy text without numbers',
    },
  ];
  const v = evaluateSourceQuality({
    url_diagnostics: diagnostics,
    extractions: [emptyExtraction],
  });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_no_numeric_policy');
    assertEquals(v.recommended_action, 'extraction_review');
  }
});

Deno.test('gate v1.1: soft-404 patterns — "this page doesn\'t exist"', () => {
  const diagnostics: GateDiagnostic[] = [
    {
      url: 'https://x/gone',
      text_length: 500,
      content_class: 'ok',
      keyword_hits: 0,
      status: '200',
      sample: 'This page doesn\u2019t exist anymore. Please try again.',
    },
  ];
  const v = evaluateSourceQuality({
    url_diagnostics: diagnostics,
    extractions: [emptyExtraction],
  });
  assertEquals(v.ok, false);
  if (!v.ok) {
    assertEquals(v.code, 'source_insufficient_404');
    assertEquals(v.recommended_action, 'template_repair');
  }
});
