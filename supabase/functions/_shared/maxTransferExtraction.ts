// -----------------------------------------------------------------------------
// Max-Transfer-Credits Anchored Regex Extractor (Type 2.5 fix)
// -----------------------------------------------------------------------------
// Purpose: when the LLM extractor latches onto a high-salience marketing number
// (e.g. ASUO BA Liberal Studies "up to 90 credits") and misses the standard
// institution-wide cap (e.g. "up to 64 transfer credits"), this module surfaces
// the correct numeric caps from raw page text using anchored phrase regex.
//
// Output is intentionally narrow: a list of candidate caps with classification:
//   - 'institution_max'   → standard undergrad transfer cap (e.g. 64)
//   - 'graduate_max'      → graduate-level cap (e.g. 12)
//   - 'minimum_required'  → minimum credits to transfer (e.g. 24)
//   - 'program_specific'  → program-scoped (e.g. 90 for BA Liberal Studies)
//
// Trust model:
//   - Returned values are written via merge with provenance source = 'ai_extraction'
//     (same as residency fallback) and recorded in notes for reviewer audit.
//   - The promotion gate continues to require ground_truth or human_override.

export type MaxTransferKind =
  | 'institution_max'
  | 'graduate_max'
  | 'minimum_required'
  | 'program_specific';

export interface MaxTransferCandidate {
  value: number;
  kind: MaxTransferKind;
  confidence: number;        // 0–95
  matchedPhrase: string;     // raw substring that triggered the match
  contextSnippet: string;    // ±80 chars around the match (original casing)
  patternId: string;         // for debugging / telemetry
}

interface PatternSpec {
  id: string;
  kind: MaxTransferKind;
  re: RegExp;
  baseConfidence: number;
}

// Escape regex specials in a literal phrase
function _esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---- Pattern catalogue ----
//
// Each pattern captures the numeric cap in group 1.
// We deliberately use \d{1,3} and reject implausible values later (range 6–150).
//
// Anchors are plural/flexible: "credit", "credits", "credit hours", "semester hours".
const PATTERNS: PatternSpec[] = [
  // ---- INSTITUTION-WIDE undergraduate transfer caps ----
  // "up to 64 transfer credits"
  // "up to 64 credits may transfer"
  // "may transfer up to 64 credits"
  // "accept up to 64 transfer credits"
  {
    id: 'inst_up_to_X_transfer',
    kind: 'institution_max',
    baseConfidence: 85,
    re: /\bup to\s+(\d{1,3})\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)(?:\s+(?:may\s+)?(?:transfer|be transferred|be applied))?/gi,
  },
  {
    id: 'inst_accept_up_to_X',
    kind: 'institution_max',
    baseConfidence: 85,
    re: /\b(?:accept|accepts|accepting|will accept|may accept)\s+up to\s+(\d{1,3})\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)/gi,
  },
  {
    id: 'inst_max_of_X',
    kind: 'institution_max',
    baseConfidence: 85,
    re: /\b(?:a\s+)?maximum (?:of\s+)?(\d{1,3})\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)(?:\s+(?:may|can|will)\s+(?:be\s+)?(?:transferred|applied|accepted))?/gi,
  },
  {
    id: 'inst_no_more_than_X',
    kind: 'institution_max',
    baseConfidence: 80,
    re: /\b(?:no more than|not more than)\s+(\d{1,3})\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)/gi,
  },
  {
    id: 'inst_X_max_transfer',
    kind: 'institution_max',
    baseConfidence: 78,
    re: /\b(\d{1,3})\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)\s+(?:is the\s+)?(?:maximum|max)\b/gi,
  },

  // ---- GRADUATE caps ----
  // "up to 12 graduate credits"
  // "maximum of 12 graduate credit hours"
  // "12 graduate transfer credits"
  {
    id: 'grad_up_to_X',
    kind: 'graduate_max',
    baseConfidence: 85,
    re: /\bup to\s+(\d{1,2})\s+graduate\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)/gi,
  },
  {
    id: 'grad_max_of_X',
    kind: 'graduate_max',
    baseConfidence: 85,
    re: /\b(?:a\s+)?maximum (?:of\s+)?(\d{1,2})\s+graduate\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)/gi,
  },
  {
    id: 'grad_X_credits',
    kind: 'graduate_max',
    baseConfidence: 75,
    re: /\b(\d{1,2})\s+graduate\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)\s+(?:may|can|will)\s+(?:be\s+)?(?:transferred|applied|accepted)/gi,
  },

  // ---- MINIMUM required ----
  // "minimum of 24 transfer credits"
  // "at least 24 credits must transfer"
  // "must transfer a minimum of 24 credits"
  {
    id: 'min_of_X_transfer',
    kind: 'minimum_required',
    baseConfidence: 80,
    re: /\b(?:a\s+)?minimum (?:of\s+)?(\d{1,3})\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)/gi,
  },
  {
    id: 'min_at_least_X',
    kind: 'minimum_required',
    baseConfidence: 75,
    re: /\bat least\s+(\d{1,3})\s+(?:transfer\s+)?(?:credits?|credit hours?|semester hours?)\s+(?:must\s+)?(?:transfer|be transferred|be applied)/gi,
  },

  // ---- PROGRAM-SPECIFIC (lower confidence; flagged so merge can demote) ----
  // "for the BA in Liberal Studies, up to 90 credits"
  // "Liberal Studies program accepts up to 90 credits"
  {
    id: 'prog_named_program_X',
    kind: 'program_specific',
    baseConfidence: 70,
    re: /\b(?:for the|in the|the)\s+(?:ba|bs|bachelor(?:'s)?(?: of)?(?: arts| science)?|master(?:'s)?|program)[^.]{0,80}?up to\s+(\d{1,3})\s+(?:credits?|credit hours?|semester hours?)/gi,
  },
];

// Keywords that, if present in the ±80 char window, BOOST institution_max confidence.
const INSTITUTION_BOOST_TERMS = [
  'university',
  'institution',
  'institutional',
  'undergraduate',
  'transfer policy',
  'transfer credit policy',
  'all transfer students',
  'all students',
];

// Keywords that, if present in the ±80 char window, DEMOTE institution_max
// to program_specific (the cap is talking about ONE program, not the school).
//
// NOTE: source-type scope (community college, two-year, etc.) is intentionally
// NOT included here. Schools commonly mention community-college sources while
// stating their institution-wide cap (e.g. "ASU Online accepts up to 64
// transfer credits from regionally accredited community colleges"). Treating
// "community college" as a window-level demoter would wrongly demote that 64.
// Source-type scope is enforced at the merge site via the URL-fragment filter
// (SCOPED_SOURCE_URL_FRAGMENTS in transfer-scraper-merge), which only fires
// when the page itself is dedicated to a 2-year/articulation pipeline.
const PROGRAM_SCOPE_TERMS = [
  'liberal studies',
  'ba in ',
  'bs in ',
  'b.a. in ',
  'b.s. in ',
  'bachelor of arts in ',
  'bachelor of science in ',
  'major in ',
  'concentration in ',
  'this program',
  'this degree',
  'the program requires',
];

// Keywords that mark the number as describing something OTHER than transfer
// credit caps (tuition discount %, scholarship $, course length weeks, etc.).
// If present, the candidate is dropped entirely.
const NEGATIVE_CONTEXT_TERMS = [
  'tuition',
  'scholarship',
  'discount',
  'per credit',
  'cost per',
  'price per',
  '$',
  'gpa',
  'grade point',
  'weeks long',
  'week course',
  'minute',
  'hour exam',
];

/**
 * Scan a single block of raw page text for transfer-cap candidates.
 *
 * @param text   Raw extracted page text (already lowercased internally).
 * @returns      Array of candidates (possibly empty). Caller picks the best.
 */
export function extractMaxTransferCandidates(text: string): MaxTransferCandidate[] {
  if (!text || typeof text !== 'string') return [];

  const haystack = text.toLowerCase();
  const out: MaxTransferCandidate[] = [];

  for (const spec of PATTERNS) {
    spec.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = spec.re.exec(haystack)) !== null) {
      const value = parseInt(m[1], 10);
      if (!Number.isFinite(value)) continue;

      // Plausibility filter: transfer caps are realistically 6–150 credits.
      // Below 6 is almost certainly a course count or weeks; above 150 is noise.
      if (value < 6 || value > 150) continue;

      const matchPos = m.index ?? 0;
      const matchedPhrase = m[0];

      // ±80 char window for context evaluation
      const ctxStart = Math.max(0, matchPos - 80);
      const ctxEnd = Math.min(haystack.length, matchPos + matchedPhrase.length + 80);
      const window = haystack.slice(ctxStart, ctxEnd);
      const snippet = text.slice(ctxStart, ctxEnd).trim();

      // Drop if window matches a known negative context (tuition $, weeks, etc.)
      if (NEGATIVE_CONTEXT_TERMS.some((t) => window.includes(t))) {
        continue;
      }

      // Score the match
      let kind: MaxTransferKind = spec.kind;
      let confidence = spec.baseConfidence;

      if (kind === 'institution_max') {
        // SOURCE-TYPE SCOPE DETECTION (Fix 1):
        // If the match is immediately followed by a "from <scoped-source>"
        // clause within ~40 chars, the cap applies ONLY to that source-type
        // (e.g. "70 semester hours may be transferred from approved two-year
        // community colleges"). Demote to program_specific so it cannot win
        // pickBestInstitutionMax.
        //
        // We require the source-type to appear AFTER a "from" preposition,
        // not just anywhere in the window — that's the real signal of a
        // restricted source. This avoids demoting institution-wide caps
        // that merely mention community colleges as one accepted source
        // (e.g. "ASU accepts up to 64 transfer credits from regionally
        // accredited community colleges toward your bachelor degree").
        const matchEnd = matchPos + matchedPhrase.length;
        const tail = haystack.slice(matchEnd, matchEnd + 60);
        const SOURCE_SCOPE_TAIL_RE =
          /^\s*(?:may\s+be\s+)?(?:transferred|accepted|applied|earned)?\s*from\s+(?:approved\s+|accredited\s+|regionally\s+accredited\s+)?(two-year|2-year|community college|community colleges|junior college|partner college|partner institution)/i;
        const hasScopedSourceTail = SOURCE_SCOPE_TAIL_RE.test(tail);

        if (hasScopedSourceTail) {
          kind = 'program_specific';
          confidence = Math.min(confidence, 70);
        } else {
          // If the window is dominated by program-scope language, demote.
          const isProgramScoped = PROGRAM_SCOPE_TERMS.some((t) => window.includes(t));
          if (isProgramScoped) {
            kind = 'program_specific';
            confidence = Math.min(confidence, 70);
          } else {
            // Boost when explicit institution-wide language is in the window
            const hasInstBoost = INSTITUTION_BOOST_TERMS.some((t) => window.includes(t));
            if (hasInstBoost) confidence = Math.min(confidence + 5, 95);
          }
        }
      }

      // Cap confidence at 95 — derived values must never exceed AI-explicit values.
      confidence = Math.min(confidence, 95);

      out.push({
        value,
        kind,
        confidence,
        matchedPhrase,
        contextSnippet: snippet,
        patternId: spec.id,
      });
    }
  }

  return out;
}

/**
 * Pick the single best institution-wide cap from a candidate list.
 * Prefers institution_max with highest confidence; ties broken by lowest value
 * (institution caps are typically lower than program caps, e.g. 64 < 90).
 */
export function pickBestInstitutionMax(
  candidates: MaxTransferCandidate[],
): MaxTransferCandidate | null {
  const inst = candidates.filter((c) => c.kind === 'institution_max');
  if (inst.length === 0) return null;
  inst.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.value - b.value;
  });
  return inst[0];
}

/**
 * Pick best graduate cap (highest confidence).
 */
export function pickBestGraduateMax(
  candidates: MaxTransferCandidate[],
): MaxTransferCandidate | null {
  const grad = candidates.filter((c) => c.kind === 'graduate_max');
  if (grad.length === 0) return null;
  grad.sort((a, b) => b.confidence - a.confidence);
  return grad[0];
}

/**
 * Pick best minimum-required (highest confidence).
 */
export function pickBestMinimumRequired(
  candidates: MaxTransferCandidate[],
): MaxTransferCandidate | null {
  const mins = candidates.filter((c) => c.kind === 'minimum_required');
  if (mins.length === 0) return null;
  mins.sort((a, b) => b.confidence - a.confidence);
  return mins[0];
}
