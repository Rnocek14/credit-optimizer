// -----------------------------------------------------------------------------
// Policy Derivation Helpers (D3 Phase 2)
// -----------------------------------------------------------------------------
// Inline interpretation helpers used by transfer-scraper-merge to derive policy
// values from raw scraped text when the LLM extractor + anchored regex fallbacks
// return null.
//
// Trust model:
//   - Derived values are written with provenance source = 'ai_extraction'.
//   - A `derivation_basis` object is attached so reviewers (and the trust gate)
//     can see EXACTLY how the value was computed: the raw phrase, the percent,
//     the degree_credit_total used, the computed value, and the source URL.
//   - The promotion gate continues to require ground_truth or human_override
//     for these critical fields. Derivation never auto-promotes.

export interface DerivationBasis {
  type: 'percentage_of_degree';
  raw_phrase: string;
  percent: number;              // e.g. 0.25 for "25%"
  degree_credit_total: number;  // e.g. 120
  computed_value: number;       // e.g. 30
  source_url?: string;
  context_snippet: string;
}

export interface PercentageResidencyResult {
  value: number;
  confidence: number;
  basis: DerivationBasis;
}

/**
 * Parses residency requirements expressed as a percentage of the degree.
 *
 * Examples it should match:
 *   - "at least 25% of the degree must be completed at Liberty University"
 *   - "a minimum of 25 percent of credits must be earned in residence"
 *   - "students must complete one-fourth of the degree at the institution"
 *   - "30% of the bachelor's degree must be taken through the university"
 *
 * Returns null when:
 *   - no percentage/fraction phrase tied to residency is present
 *   - degreeCreditTotal is not a positive number
 *   - the computed value falls outside the sane residency window (10–80)
 */
export function parsePercentageResidency(
  text: string,
  degreeCreditTotal: number,
  sourceUrl?: string,
): PercentageResidencyResult | null {
  if (!text || typeof text !== 'string') return null;
  if (!Number.isFinite(degreeCreditTotal) || degreeCreditTotal <= 0) return null;

  const haystack = text.toLowerCase();

  // Residency-anchor terms that must appear within ±120 chars of the percentage
  // phrase for us to treat it as a residency claim (vs e.g. tuition discount %).
  const residencyAnchors = [
    'residence',
    'residency',
    'in residence',
    'institutional credit',
    'institutional credits',
    'must be completed at',
    'must be earned at',
    'must be taken at',
    'must be taken through',
    'completed through',
    'earned at',
    'taken at',
    'at the university',
    'at the institution',
    'at liberty',
  ];

  // 1) Numeric percentage: "25%", "25 %", "25 percent", "twenty-five percent"
  //    Note: no \b after % because % is non-word; word-boundary fails there.
  const percentPattern =
    /(\d{1,2}(?:\.\d{1,2})?)\s*(?:%|percent\b)/gi;

  // 2) Common spelled fractions
  const fractionMap: Record<string, number> = {
    'one-fourth': 0.25,
    'one fourth': 0.25,
    'a quarter': 0.25,
    'one-quarter': 0.25,
    'one quarter': 0.25,
    'one-third': 1 / 3,
    'one third': 1 / 3,
    'a third': 1 / 3,
    'one-half': 0.5,
    'one half': 0.5,
    'half': 0.5,
    'two-thirds': 2 / 3,
    'two thirds': 2 / 3,
    'three-fourths': 0.75,
    'three fourths': 0.75,
    'three-quarters': 0.75,
    'three quarters': 0.75,
  };

  type Candidate = { percent: number; rawPhrase: string; index: number; matchLen: number };
  const candidates: Candidate[] = [];

  // Collect numeric percent matches
  for (const m of haystack.matchAll(percentPattern)) {
    const num = parseFloat(m[1]);
    if (!Number.isFinite(num) || num <= 0 || num >= 100) continue;
    candidates.push({
      percent: num / 100,
      rawPhrase: m[0],
      index: m.index ?? 0,
      matchLen: m[0].length,
    });
  }

  // Collect fraction matches (must use word boundaries so "halfway" isn't picked)
  for (const [phrase, value] of Object.entries(fractionMap)) {
    const escaped = phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
    for (const m of haystack.matchAll(pattern)) {
      candidates.push({
        percent: value,
        rawPhrase: m[0],
        index: m.index ?? 0,
        matchLen: m[0].length,
      });
    }
  }

  if (candidates.length === 0) return null;

  let best: PercentageResidencyResult | null = null;

  for (const c of candidates) {
    // Look at a tight ±120 char window around the percentage to confirm
    // residency context. Prevents false positives from tuition/financial-aid %.
    const windowStart = Math.max(0, c.index - 120);
    const windowEnd = Math.min(haystack.length, c.index + c.matchLen + 120);
    const window = haystack.slice(windowStart, windowEnd);

    const hasResidencyAnchor = residencyAnchors.some((a) => window.includes(a));
    if (!hasResidencyAnchor) continue;

    const computed = Math.round(c.percent * degreeCreditTotal);

    // Sanity bounds: residency is realistically 10–80 credits.
    if (computed < 10 || computed > 80) continue;

    // Confidence model:
    //   - explicit residency-language anchor in tight window: +base
    //   - "must be completed/earned" verbs: +bonus (stronger commitment)
    //   - degree-level word ("bachelor", "degree", "program") near phrase: +small
    let confidence = 75;
    if (window.includes('must be completed') || window.includes('must be earned') || window.includes('must be taken')) {
      confidence += 10;
    }
    if (window.includes('residence') || window.includes('residency')) {
      confidence += 5;
    }

    // Cap at 90 — derived values should never exceed AI-extracted explicit values.
    confidence = Math.min(confidence, 90);

    const snippetStart = Math.max(0, c.index - 60);
    const snippetEnd = Math.min(text.length, c.index + c.matchLen + 60);
    const contextSnippet = text.slice(snippetStart, snippetEnd).trim();

    if (!best || confidence > best.confidence) {
      best = {
        value: computed,
        confidence,
        basis: {
          type: 'percentage_of_degree',
          raw_phrase: text.slice(snippetStart, snippetEnd).trim(),
          percent: Number(c.percent.toFixed(4)),
          degree_credit_total: degreeCreditTotal,
          computed_value: computed,
          source_url: sourceUrl,
          context_snippet: contextSnippet,
        },
      };
    }
  }

  return best;
}
