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

Deno.test('gate: source_insufficient_shell when only error/shell pages', () => {
  const diagnostics: GateDiagnostic[] = [
    { url: 'https://x/a', text_length: 80, content_class: 'too_short', keyword_hits: 0, status: '200' },
    { url: 'https://x/b', text_length: 50, content_class: 'error_page', status: '200' },
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
