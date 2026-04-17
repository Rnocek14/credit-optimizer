// -----------------------------------------------------------------------------
// prePromotePolicyPack — D3 Phase 2 normalizer
// -----------------------------------------------------------------------------
// Final additive pass over a merged policy pack BEFORE it is inserted as a
// `draft` row in `institution_policy_packs`. Runs after extraction, residency
// %-derivation, and multi-cap scope binding.
//
// Trust posture (CRITICAL):
//   - NEVER overwrites a higher-confidence value that was set by the AI extractor
//     or by ground truth.
//   - NEVER changes provenance source from `ground_truth`/`human_override` to
//     anything else.
//   - DERIVED confidence is hard-capped at 90 so a normalized value can never
//     out-rank a directly extracted one.
//   - Idempotent: running twice produces the same output.
//
// What it does:
//   1. Clamps and standardizes confidence on each provenance entry.
//   2. Coerces stringified numeric caps (`"30"`, `"90"`) into clean digit
//      strings — drops malformed values (`"2024"` is fine, `"1-800"` becomes null).
//   3. Computes the combined transfer+alt cap when bucket_mode is `combined`
//      and the explicit field is missing.
//   4. Mirrors `max_ace_nccrs_credits` into `max_alt_credit` for `separate` mode
//      when the latter is missing.
//   5. Attaches `provenance_verified_at` and `verification_method` flags so the
//      activation gate / reviewers can see exactly which fields were touched.
//
// All actions are pushed into `normalization_applied` (machine readable) and
// `normalization_notes` (human readable, surfaced in merge_notes).

export type ProvenanceSource =
  | 'ai_extraction'
  | 'ground_truth'
  | 'human_override'
  | 'auto_normalized'
  | 'derived';

export interface FieldProvenanceEntry {
  source?: ProvenanceSource | string;
  source_url?: string | null;
  source_text?: string | null;
  confidence?: number;
  derivation_basis?: Record<string, unknown>;
  verification_method?: string;
  [key: string]: unknown;
}

export type FlatProvenance = Record<string, FieldProvenanceEntry>;

// Mirrors the flat structure built by transfer-scraper-merge before insert
export interface FlatPolicyData {
  residency_credits?: string | number | null;
  max_transfer_credits?: string | number | null;
  max_ace_nccrs_credits?: string | number | null;
  max_alt_credit?: number | null;
  max_transfer_alt_combined_credits?: number | null;
  transfer_alt_bucket_mode?: 'separate' | 'combined' | 'unknown';
  degree_credit_total?: number;
  total_credits?: number;
  [key: string]: unknown;
}

export interface PrePromoteInput {
  policyData: FlatPolicyData;
  fieldProvenance: FlatProvenance;
  totalScore: number;
  hasGroundTruth: boolean;
  canonicalProvenanceUrl?: string | null;
}

export interface NormalizationAction {
  field: string;
  type:
    | 'confidence_clamped'
    | 'numeric_string_coerced'
    | 'numeric_string_dropped'
    | 'combined_cap_derived'
    | 'alt_cap_mirrored'
    | 'provenance_verified_attached';
  before?: unknown;
  after?: unknown;
  note?: string;
}

export interface PrePromoteResult {
  policyData: FlatPolicyData;
  fieldProvenance: FlatProvenance;
  normalizationApplied: NormalizationAction[];
  normalizationNotes: string[];
  /** Bumped when the normalizer rules change so we can audit older packs. */
  normalizationVersion: '1.0.0';
}

const NORMALIZATION_VERSION = '1.0.0' as const;

// Hard cap for any value the normalizer derives (vs explicit extraction)
const DERIVED_CONFIDENCE_CAP = 90;

// Numeric cap fields the gate validates as digit strings via `->>`
const NUMERIC_STRING_FIELDS = [
  'residency_credits',
  'max_transfer_credits',
  'max_ace_nccrs_credits',
] as const;

/**
 * Idempotent additive normalizer. Called once at the end of merge,
 * immediately before inserting the draft pack.
 */
export function prePromotePolicyPack(input: PrePromoteInput): PrePromoteResult {
  const policyData: FlatPolicyData = { ...input.policyData };
  const fieldProvenance: FlatProvenance = deepCopyProvenance(input.fieldProvenance);
  const actions: NormalizationAction[] = [];
  const notes: string[] = [];

  // ---------------------------------------------------------------------------
  // Step 1: clamp confidence on every provenance entry to [0, 100]; cap any
  // entry whose source is `derived` or `auto_normalized` at DERIVED_CONFIDENCE_CAP.
  // ---------------------------------------------------------------------------
  for (const [field, entry] of Object.entries(fieldProvenance)) {
    if (!entry || typeof entry !== 'object') continue;
    const before = entry.confidence;
    if (typeof entry.confidence !== 'number' || !Number.isFinite(entry.confidence)) {
      entry.confidence = 0;
    } else {
      entry.confidence = Math.max(0, Math.min(100, entry.confidence));
    }
    const isDerived = entry.source === 'derived' || entry.source === 'auto_normalized';
    if (isDerived && entry.confidence > DERIVED_CONFIDENCE_CAP) {
      entry.confidence = DERIVED_CONFIDENCE_CAP;
    }
    if (before !== entry.confidence) {
      actions.push({
        field,
        type: 'confidence_clamped',
        before,
        after: entry.confidence,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Step 2: coerce numeric string fields. Trigger uses `->>` so the value must
  // be a digit string. Anything that isn't pure digits becomes null.
  // ---------------------------------------------------------------------------
  for (const field of NUMERIC_STRING_FIELDS) {
    const raw = policyData[field];
    if (raw === null || raw === undefined) continue;

    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      const coerced = String(Math.trunc(raw));
      if (coerced !== raw.toString()) {
        actions.push({
          field,
          type: 'numeric_string_coerced',
          before: raw,
          after: coerced,
        });
      }
      (policyData as Record<string, unknown>)[field] = coerced;
      continue;
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (/^\d+$/.test(trimmed) && Number(trimmed) > 0) {
        if (trimmed !== raw) {
          actions.push({
            field,
            type: 'numeric_string_coerced',
            before: raw,
            after: trimmed,
          });
          (policyData as Record<string, unknown>)[field] = trimmed;
        }
      } else {
        actions.push({
          field,
          type: 'numeric_string_dropped',
          before: raw,
          after: null,
          note: 'value did not match /^\\d+$/ or was not > 0',
        });
        (policyData as Record<string, unknown>)[field] = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Step 3: combined cap derivation.
  // If bucket_mode == 'combined' and max_transfer_alt_combined_credits is missing
  // but we have BOTH max_transfer_credits and max_alt_credit (or max_ace_nccrs_credits),
  // derive the combined cap as their sum, capped at degree_credit_total.
  // ---------------------------------------------------------------------------
  if (
    policyData.transfer_alt_bucket_mode === 'combined' &&
    (policyData.max_transfer_alt_combined_credits === null ||
      policyData.max_transfer_alt_combined_credits === undefined)
  ) {
    const transferNum = parseDigitField(policyData.max_transfer_credits);
    const altNum =
      typeof policyData.max_alt_credit === 'number' && policyData.max_alt_credit > 0
        ? policyData.max_alt_credit
        : parseDigitField(policyData.max_ace_nccrs_credits);

    if (transferNum && altNum) {
      const sum = transferNum + altNum;
      const total =
        typeof policyData.degree_credit_total === 'number' && policyData.degree_credit_total > 0
          ? policyData.degree_credit_total
          : 120;
      const capped = Math.min(sum, total);

      policyData.max_transfer_alt_combined_credits = capped;
      actions.push({
        field: 'max_transfer_alt_combined_credits',
        type: 'combined_cap_derived',
        before: null,
        after: capped,
        note: `derived from max_transfer (${transferNum}) + max_alt (${altNum}), capped at ${total}`,
      });
      notes.push(
        `🧮 Combined cap derived: ${capped} = min(${transferNum} + ${altNum}, ${total}) [confidence ≤ ${DERIVED_CONFIDENCE_CAP}]`,
      );

      fieldProvenance['max_transfer_alt_combined_credits'] = {
        source: 'derived',
        confidence: DERIVED_CONFIDENCE_CAP,
        verification_method: 'pre_promote_combined_sum',
        derivation_basis: {
          type: 'combined_cap_sum',
          transfer_component: transferNum,
          alt_component: altNum,
          degree_credit_total: total,
          computed_value: capped,
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Step 4: alt cap mirroring for `separate` mode.
  // If bucket_mode == 'separate' and max_alt_credit missing but
  // max_ace_nccrs_credits is present, mirror it.
  // ---------------------------------------------------------------------------
  if (
    policyData.transfer_alt_bucket_mode === 'separate' &&
    (policyData.max_alt_credit === null || policyData.max_alt_credit === undefined)
  ) {
    const aceNum = parseDigitField(policyData.max_ace_nccrs_credits);
    if (aceNum) {
      policyData.max_alt_credit = aceNum;
      actions.push({
        field: 'max_alt_credit',
        type: 'alt_cap_mirrored',
        before: null,
        after: aceNum,
        note: 'mirrored from max_ace_nccrs_credits (separate bucket mode)',
      });
      notes.push(`🪞 Alt cap mirrored from max_ace_nccrs_credits (${aceNum}) for separate bucket mode`);

      const sourceProv = fieldProvenance['max_ace_nccrs_credits'];
      fieldProvenance['max_alt_credit'] = {
        source: 'derived',
        confidence: Math.min(
          DERIVED_CONFIDENCE_CAP,
          typeof sourceProv?.confidence === 'number' ? sourceProv.confidence : DERIVED_CONFIDENCE_CAP,
        ),
        source_url: sourceProv?.source_url ?? null,
        verification_method: 'pre_promote_alt_mirror',
        derivation_basis: {
          type: 'alt_cap_mirror',
          mirrored_from: 'max_ace_nccrs_credits',
          value: aceNum,
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Step 5: attach provenance_verified_at to critical fields that have a
  // source URL but no explicit verification metadata yet. This makes the
  // reviewer queue surface "auto-verified" fields cleanly.
  // ---------------------------------------------------------------------------
  const nowIso = new Date().toISOString();
  const criticalFields = ['residency_credits', 'max_transfer_credits'];
  for (const field of criticalFields) {
    const entry = fieldProvenance[field];
    if (!entry) continue;
    const hasUrl = typeof entry.source_url === 'string' && entry.source_url.length > 0;
    const alreadyVerified =
      typeof entry['provenance_verified_at'] === 'string' &&
      (entry['provenance_verified_at'] as string).length > 0;
    // Only stamp ai_extraction / derived sources — never overwrite ground_truth
    // or human_override timestamps coming from the curator workflow.
    const eligibleSource =
      entry.source === 'ai_extraction' ||
      entry.source === 'derived' ||
      entry.source === 'auto_normalized' ||
      entry.source === undefined;
    if (hasUrl && !alreadyVerified && eligibleSource) {
      entry['provenance_verified_at'] = nowIso;
      actions.push({
        field,
        type: 'provenance_verified_attached',
        before: null,
        after: nowIso,
      });
    }
  }

  // Record the canonical provenance URL once on the pack-level if available
  if (input.canonicalProvenanceUrl) {
    (policyData as Record<string, unknown>)['provenance_url'] = input.canonicalProvenanceUrl;
  }

  if (actions.length > 0) {
    notes.unshift(
      `🛡️ prePromotePolicyPack v${NORMALIZATION_VERSION} applied ${actions.length} normalization step(s)`,
    );
  }

  return {
    policyData,
    fieldProvenance,
    normalizationApplied: actions,
    normalizationNotes: notes,
    normalizationVersion: NORMALIZATION_VERSION,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function parseDigitField(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.trunc(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return n > 0 ? n : null;
    }
  }
  return null;
}

function deepCopyProvenance(src: FlatProvenance): FlatProvenance {
  const out: FlatProvenance = {};
  for (const [k, v] of Object.entries(src || {})) {
    if (v && typeof v === 'object') {
      out[k] = { ...v };
      if (v.derivation_basis && typeof v.derivation_basis === 'object') {
        out[k].derivation_basis = { ...v.derivation_basis };
      }
    } else {
      out[k] = v as FieldProvenanceEntry;
    }
  }
  return out;
}
