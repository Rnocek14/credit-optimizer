// -----------------------------------------------------------------------------
// sourceQualityGate — Pre-merge deterministic source classifier
// -----------------------------------------------------------------------------
// Purpose: BEFORE the merge pipeline tries to interpret a school's policy
// extractions, decide whether the bundle of sources is even viable. If not,
// emit a stable, machine-readable code so the rest of the system can:
//   - skip costly merge / normalization work
//   - tell operators *why* a school failed (template repair vs render vs
//     alternate source discovery)
//   - drive consistent diagnostics across UMGC / ASUO / GCU and beyond
//
// This module is INTENTIONALLY pure: no I/O, no DB, no fetch. It takes the
// `url_diagnostics` array (already produced by transfer-scraper-auto-scan)
// plus the loaded `extractions` and produces a verdict.
//
// Codes are the single source of truth for the operator dashboard. Keep them
// stable; never repurpose. Add new codes if a new failure mode emerges.
// -----------------------------------------------------------------------------

export const SOURCE_QUALITY_GATE_VERSION = 'v1.0.0';

export type SourceInsufficientCode =
  | 'source_insufficient_404'              // every candidate URL 404'd or status >= 400
  | 'source_insufficient_blocked'          // pages came back empty / 0 chars (bot wall, JS junk)
  | 'source_insufficient_shell'            // pages loaded but are cookie banners / error shells
  | 'source_insufficient_nav_only'         // pages loaded but are marketing / navigation only
  | 'source_insufficient_no_numeric_policy'// pages OK but no numeric policy signal extracted
  | 'source_insufficient_no_extractions';  // no AI extractions at all

export type SourceQualityVerdict =
  | { ok: true; notes: string[] }
  | {
      ok: false;
      code: SourceInsufficientCode;
      reason: string;
      notes: string[];
      // Machine-stable hint for the next operator action.
      recommended_action:
        | 'template_repair'        // URLs are broken / wrong → fix template
        | 'rendered_fetch'         // pages exist but need JS render / wait
        | 'alternate_source'       // pages are blocked → try official catalog/PDF
        | 'extraction_review'      // pages are real policy text but extractor missed numbers
        | 'no_op';
    };

// Diagnostic shape (mirrors UrlDiagnostic in transfer-scraper-merge)
export interface GateDiagnostic {
  url: string;
  page_type?: string;
  text_length: number | null;
  content_class: 'ok' | 'too_short' | 'js_junk' | 'error_page' | null;
  keyword_hits?: number;
  status?: string;
}

// Minimal extraction shape we need to detect numeric policy signal.
export interface GateExtraction {
  policy_pack?: {
    residency_policy?: { min_institutional_credits?: number | null } | null;
    transfer_credit_limits?: {
      max_total_transfer_credits?: number | null;
      max_ace_nccrs_credits?: number | null;
      min_regionally_accredited_credits?: number | null;
    } | null;
    upper_level_requirements?: { min_upper_level_credits?: number | null } | null;
  } | null;
}

export interface GateInput {
  url_diagnostics?: GateDiagnostic[];
  extractions: GateExtraction[];
  // Minimum fraction of usable pages required to even attempt merge.
  // Default 1 usable page is enough; we mostly care about *qualitative* signal.
  min_usable_pages?: number;
}

const NUMERIC_POLICY_KEYS = [
  'residency.min_institutional_credits',
  'transfer.max_total_transfer_credits',
  'transfer.max_ace_nccrs_credits',
  'transfer.min_regionally_accredited_credits',
  'upper_level.min_upper_level_credits',
];

function hasNumericPolicySignal(extractions: GateExtraction[]): boolean {
  for (const e of extractions) {
    const p = e.policy_pack;
    if (!p) continue;
    if (typeof p.residency_policy?.min_institutional_credits === 'number') return true;
    if (typeof p.transfer_credit_limits?.max_total_transfer_credits === 'number') return true;
    if (typeof p.transfer_credit_limits?.max_ace_nccrs_credits === 'number') return true;
    if (typeof p.transfer_credit_limits?.min_regionally_accredited_credits === 'number') return true;
    if (typeof p.upper_level_requirements?.min_upper_level_credits === 'number') return true;
  }
  return false;
}

function isHttpErrorStatus(status?: string): boolean {
  if (!status) return false;
  // status is free-form; look for common error markers
  if (/^4\d\d|^5\d\d/.test(status)) return true;
  if (/error|fail|timeout/i.test(status)) return true;
  return false;
}

/**
 * Classify the bundle of sources before merge.
 * Pure function — no I/O. Safe to call multiple times.
 */
export function evaluateSourceQuality(input: GateInput): SourceQualityVerdict {
  const notes: string[] = [];
  const minUsable = input.min_usable_pages ?? 1;
  const diagnostics = input.url_diagnostics ?? [];
  const extractions = input.extractions ?? [];

  notes.push(
    `🚦 sourceQualityGate ${SOURCE_QUALITY_GATE_VERSION}: ` +
      `${diagnostics.length} url(s), ${extractions.length} extraction(s)`,
  );

  // ---- Case 0: no extractions at all ----------------------------------------
  if (extractions.length === 0) {
    return {
      ok: false,
      code: 'source_insufficient_no_extractions',
      reason: 'No AI extractions were produced from any source URL.',
      notes,
      recommended_action: 'template_repair',
    };
  }

  // If we have no diagnostics, fall back to extraction-only signal check.
  // (Older runs may not pass diagnostics.)
  if (diagnostics.length === 0) {
    if (!hasNumericPolicySignal(extractions)) {
      return {
        ok: false,
        code: 'source_insufficient_no_numeric_policy',
        reason: 'Extractions produced no numeric policy signal (residency, max transfer, etc.).',
        notes,
        recommended_action: 'extraction_review',
      };
    }
    notes.push('No url_diagnostics provided; passing on extraction signal alone.');
    return { ok: true, notes };
  }

  // ---- Case 1: every URL 404'd / errored ------------------------------------
  const errorStatusCount = diagnostics.filter((d) => isHttpErrorStatus(d.status)).length;
  const errorPageCount = diagnostics.filter((d) => d.content_class === 'error_page').length;
  if (errorStatusCount === diagnostics.length && diagnostics.length > 0) {
    return {
      ok: false,
      code: 'source_insufficient_404',
      reason: `All ${diagnostics.length} candidate URL(s) returned an HTTP error status.`,
      notes,
      recommended_action: 'template_repair',
    };
  }

  // ---- Case 2: every page is empty / blocked --------------------------------
  // text_length null or 0, or content_class === 'js_junk'
  const blockedCount = diagnostics.filter((d) => {
    if (d.content_class === 'js_junk') return true;
    if (d.text_length == null || d.text_length === 0) return true;
    return false;
  }).length;
  if (blockedCount === diagnostics.length && diagnostics.length > 0) {
    return {
      ok: false,
      code: 'source_insufficient_blocked',
      reason: `All ${diagnostics.length} page(s) returned empty / JS-junk content (likely bot wall or render-required).`,
      notes,
      recommended_action: 'rendered_fetch',
    };
  }

  // ---- Case 3: shell / cookie / error pages dominate ------------------------
  // error_page class + tiny text but status was nominally 200
  const shellCount = diagnostics.filter((d) => {
    if (d.content_class === 'error_page') return true;
    // shell heuristic: text exists but is suspiciously small AND no keyword hits
    if (
      d.content_class === 'too_short' &&
      (d.keyword_hits ?? 0) === 0 &&
      (d.text_length ?? 0) > 0
    ) {
      return true;
    }
    return false;
  }).length;
  const okCount = diagnostics.filter((d) => d.content_class === 'ok').length;
  if (shellCount > 0 && okCount === 0 && errorPageCount + shellCount >= diagnostics.length - 0) {
    return {
      ok: false,
      code: 'source_insufficient_shell',
      reason:
        `${shellCount}/${diagnostics.length} page(s) are cookie banners / error shells; ` +
        `no usable policy page reached the extractor.`,
      notes,
      recommended_action: 'alternate_source',
    };
  }

  // ---- Case 4: nav / marketing only -----------------------------------------
  // Pages loaded fine ("ok"), but ZERO keyword hits anywhere → marketing pages.
  const totalKeywordHits = diagnostics.reduce(
    (sum, d) => sum + (d.keyword_hits ?? 0),
    0,
  );
  if (okCount >= minUsable && totalKeywordHits === 0) {
    return {
      ok: false,
      code: 'source_insufficient_nav_only',
      reason:
        `${okCount} page(s) loaded but contain zero policy keywords ` +
        `(transfer, residency, credit caps). Likely marketing / navigation pages.`,
      notes,
      recommended_action: 'template_repair',
    };
  }

  // ---- Case 5: pages were OK but extractor produced no numeric signal -------
  if (okCount >= minUsable && totalKeywordHits > 0 && !hasNumericPolicySignal(extractions)) {
    return {
      ok: false,
      code: 'source_insufficient_no_numeric_policy',
      reason:
        `Pages contained policy keywords but no numeric policy fields ` +
        `(residency, max transfer, etc.) were extracted.`,
      notes,
      recommended_action: 'extraction_review',
    };
  }

  // ---- Pass ----------------------------------------------------------------
  notes.push(
    `✅ source quality OK: ${okCount}/${diagnostics.length} usable page(s), ` +
      `${totalKeywordHits} policy keyword hit(s).`,
  );
  return { ok: true, notes };
}

/**
 * Convenience: human-readable summary of a verdict for merge_notes.
 */
export function formatGateVerdict(v: SourceQualityVerdict): string {
  if (v.ok) return v.notes.join(' | ');
  return (
    `🛑 ${v.code}: ${v.reason} ` +
    `(recommended: ${v.recommended_action}) ` +
    `[${SOURCE_QUALITY_GATE_VERSION}]`
  );
}
