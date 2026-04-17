// -----------------------------------------------------------------------------
// Multi-Cap Scope Binder (D3 Phase 2)
// -----------------------------------------------------------------------------
// Detects multi-degree cap sentences like:
//   "45 credits for an associate degree, 90 credits for a bachelor's degree"
//   "Up to 45 credits may transfer toward an associate's; up to 90 toward a bachelor's"
//   "AA: 45 credits / BS: 90 credits"
//
// Returns a structured binding so the merge writer can:
//   - select the BACHELOR value as the institution-wide cap (default for our packs)
//   - mark the ASSOCIATE value as scoped (excluded from institution-wide cap)
//   - skip ambiguous cases entirely (let existing detectValueScope handle them)
//
// Trust model:
//   - This is a HIGH-PRECISION, low-recall detector. It only fires when both
//     numeric caps appear in the SAME sentence/clause with explicit degree
//     anchors on both sides. Otherwise it returns null and the legacy
//     detectValueScope path is used.
//   - Result includes a `derivation_basis` snippet so reviewers can see exactly
//     which sentence produced the binding.

export interface MultiCapBinding {
  associate_value: number;
  bachelor_value: number;
  raw_sentence: string;
  source_url?: string;
  // Position info for downstream scope tagging
  associate_match: { value: number; index: number; phrase: string };
  bachelor_match: { value: number; index: number; phrase: string };
  confidence: number;
}

// Anchors that unambiguously bind a credit number to "associate"
const ASSOCIATE_ANCHORS = [
  'associate degree',
  "associate's degree",
  'associates degree',
  'associate of arts',
  'associate of science',
  'associate of applied science',
  'aa degree',
  'as degree',
  'aas degree',
  'two-year degree',
  '2-year degree',
];

// Anchors that unambiguously bind a credit number to "bachelor"
const BACHELOR_ANCHORS = [
  'bachelor degree',
  "bachelor's degree",
  'bachelors degree',
  'baccalaureate degree',
  'baccalaureate',
  'bachelor of arts',
  'bachelor of science',
  'four-year degree',
  '4-year degree',
  'undergraduate degree',
];

// Credit-phrase regex builder for a specific value
function creditPhraseRegex(value: number): RegExp {
  return new RegExp(
    `\\b${value}\\b\\s*(?:credit hours|semester hours|credits?|s\\.h\\.|sh)\\b`,
    'gi',
  );
}

// Generic numeric credit-phrase regex (any 2-3 digit value 10-200)
const ANY_CREDIT_PHRASE = /\b(\d{2,3})\s*(?:credit hours|semester hours|credits?|s\.h\.|sh)\b/gi;

interface CreditOccurrence {
  value: number;
  index: number;
  phrase: string;
}

/**
 * Splits text into sentence-like chunks. Uses periods, semicolons, and
 * newline boundaries — looser than a real NLP segmenter but sufficient
 * for the catalog/policy text patterns we see in scraped pages.
 */
/**
 * Splits text into sentence-like chunks. Uses periods, ! ? and newline
 * boundaries — but NOT semicolons (those are kept inside the sentence so
 * "30 credits for assoc; 75 for bachelor" stays a single chunk).
 */
function splitSentences(text: string): Array<{ sentence: string; offset: number }> {
  const out: Array<{ sentence: string; offset: number }> = [];
  const re = /[^.!?\n]+[.!?\n]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sentence = m[0];
    if (sentence.trim().length === 0) continue;
    out.push({ sentence, offset: m.index });
  }
  return out;
}

/**
 * Find every "<num> credits" occurrence inside a sentence with global indices.
 */
function findCreditOccurrences(sentence: string, sentenceOffset: number): CreditOccurrence[] {
  const occurrences: CreditOccurrence[] = [];
  const re = new RegExp(ANY_CREDIT_PHRASE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    const value = parseInt(m[1], 10);
    if (!Number.isFinite(value) || value < 10 || value > 200) continue;
    occurrences.push({
      value,
      index: sentenceOffset + (m.index ?? 0),
      phrase: m[0],
    });
  }
  return occurrences;
}

/**
 * Returns true if `anchor` appears within ±60 chars of `index` inside `text`.
 * Tight window prevents cross-clause contamination.
 */
function anchorNearby(text: string, anchors: string[], index: number, windowChars = 60): string | null {
  const start = Math.max(0, index - windowChars);
  const end = Math.min(text.length, index + windowChars);
  const window = text.slice(start, end).toLowerCase();
  for (const a of anchors) {
    if (window.includes(a)) return a;
  }
  return null;
}

/**
 * Returns the distance (in chars) from `index` to the nearest match of any
 * `anchor` in `text` within ±windowChars. Returns Infinity if none found.
 */
function nearestAnchorDistance(text: string, anchors: string[], index: number, windowChars = 80): number {
  const lower = text.toLowerCase();
  const start = Math.max(0, index - windowChars);
  const end = Math.min(text.length, index + windowChars);
  let best = Infinity;
  for (const a of anchors) {
    let pos = lower.indexOf(a, start);
    while (pos !== -1 && pos < end) {
      const dist = Math.abs(pos - index);
      if (dist < best) best = dist;
      pos = lower.indexOf(a, pos + 1);
    }
  }
  return best;
}

/**
 * Detect a multi-cap binding in the text.
 *
 * Returns the FIRST unambiguous binding found. "Unambiguous" means:
 *   - Two distinct credit values appear in the same sentence (or adjacent
 *     clauses separated by ; or , within ~250 chars).
 *   - One value has an associate anchor within ±60 chars.
 *   - The other value has a bachelor anchor within ±60 chars.
 *   - Sanity bounds: associate ≤ bachelor, associate in [20-90], bachelor in [40-150].
 *
 * Returns null if any of the above fails — caller falls back to detectValueScope.
 */
export function detectMultiCapScope(
  text: string,
  sourceUrl?: string,
): MultiCapBinding | null {
  if (!text || typeof text !== 'string') return null;
  if (text.length < 20) return null;

  const sentences = splitSentences(text);

  for (const { sentence, offset } of sentences) {
    if (sentence.length > 600) continue; // skip mega-paragraphs (too noisy)

    const lower = sentence.toLowerCase();
    // Quick filter: sentence must mention BOTH degree levels
    const hasAssociateWord = ASSOCIATE_ANCHORS.some((a) => lower.includes(a));
    const hasBachelorWord = BACHELOR_ANCHORS.some((a) => lower.includes(a));
    if (!hasAssociateWord || !hasBachelorWord) continue;

    const occurrences = findCreditOccurrences(sentence, offset);
    if (occurrences.length < 2) continue;

    // Try every pair (a, b) where a != b
    for (let i = 0; i < occurrences.length; i++) {
      for (let j = 0; j < occurrences.length; j++) {
        if (i === j) continue;
        const candidateAssoc = occurrences[i];
        const candidateBach = occurrences[j];
        if (candidateAssoc.value === candidateBach.value) continue;

        const assocAnchor = anchorNearby(text, ASSOCIATE_ANCHORS, candidateAssoc.index, 60);
        const bachAnchor = anchorNearby(text, BACHELOR_ANCHORS, candidateBach.index, 60);
        if (!assocAnchor || !bachAnchor) continue;

        // Sanity bounds
        if (candidateAssoc.value < 20 || candidateAssoc.value > 90) continue;
        if (candidateBach.value < 40 || candidateBach.value > 150) continue;
        if (candidateAssoc.value >= candidateBach.value) continue;

        // Nearest-anchor-wins: each value must be UNAMBIGUOUSLY closer to its
        // own degree-level anchor than to the other one. Rules out
        // "30 credits at the associate or bachelor level" where both anchors
        // sit at roughly equal distance from the value.
        const assocOwnDist = nearestAnchorDistance(text, ASSOCIATE_ANCHORS, candidateAssoc.index, 80);
        const assocOtherDist = nearestAnchorDistance(text, BACHELOR_ANCHORS, candidateAssoc.index, 80);
        const bachOwnDist = nearestAnchorDistance(text, BACHELOR_ANCHORS, candidateBach.index, 80);
        const bachOtherDist = nearestAnchorDistance(text, ASSOCIATE_ANCHORS, candidateBach.index, 80);
        // Each value's own anchor must be strictly closer (at least 5 chars) than the other.
        if (assocOwnDist >= assocOtherDist - 4) continue;
        if (bachOwnDist >= bachOtherDist - 4) continue;

        // Confidence model:
        //   base 80 — both anchors present, both in sane window
        //   +5 if explicit "for a/an" connector ("45 for an associate")
        //   +5 if values are conventional (≥60 bachelor and ≥30 associate)
        let confidence = 80;
        const connector = /\bfor (?:a|an|the)\s+(associate|bachelor)/i;
        if (connector.test(sentence)) confidence += 5;
        if (candidateBach.value >= 60 && candidateAssoc.value >= 30) confidence += 5;
        confidence = Math.min(confidence, 90);

        return {
          associate_value: candidateAssoc.value,
          bachelor_value: candidateBach.value,
          raw_sentence: sentence.trim(),
          source_url: sourceUrl,
          associate_match: candidateAssoc,
          bachelor_match: candidateBach,
          confidence,
        };
      }
    }
  }

  return null;
}

/**
 * Convenience helper: given a binding and a numeric value, returns whether
 * that value should be treated as scoped (associate-only) for institution-wide
 * cap selection. The bachelor value is treated as institution-wide (unscoped).
 */
export function isValueScopedByBinding(
  binding: MultiCapBinding,
  value: number,
): { isScoped: boolean; reason: string | null } {
  if (value === binding.associate_value) {
    return {
      isScoped: true,
      reason: `Multi-cap binding: ${value} bound to associate degree (bachelor cap = ${binding.bachelor_value})`,
    };
  }
  if (value === binding.bachelor_value) {
    return {
      isScoped: false,
      reason: `Multi-cap binding: ${value} bound to bachelor degree (institution-wide)`,
    };
  }
  return { isScoped: false, reason: null };
}
