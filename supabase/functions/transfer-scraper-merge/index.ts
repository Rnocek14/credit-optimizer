// =============================================================================
// TRANSFER-SCRAPER-MERGE - Multi-Source Policy Aggregation
// =============================================================================
// This Edge Function aggregates extraction results from multiple scrape jobs
// into a single comprehensive policy pack with cross-source agreement scoring.
//
// Key behaviors:
// - Accepts an institution and list of scrape_job_ids
// - Loads all ai_extracted_data from scraped_content
// - For each policy field, picks the highest-confidence source
// - Calculates cross_source_agreement bonus based on actual agreement
// - Creates a merged policy pack with combined confidence
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------

interface UrlDiagnostic {
  url: string;
  page_type: string;
  text_length: number | null;
  content_class: 'ok' | 'too_short' | 'js_junk' | 'error_page' | null;
  keyword_hits?: number;  // Policy keyword hit count
  status: string;
  scrape_job_id: string | null;
  sample?: string | null;  // Content sample for debugging
}

interface DiagnosticSummary {
  total_urls: number;
  ok_count: number;
  too_short_count: number;
  js_junk_count: number;
  error_page_count: number;
  max_text_length: number;
  min_text_length: number;
  max_keyword_hits: number;
  best_policy_url: string | null;
}

interface MergeRequest {
  institution: string;
  scrape_job_ids: string[];
  url_diagnostics?: UrlDiagnostic[];
  diagnostic_summary?: DiagnosticSummary;  // Pre-computed summary from auto-scan
  best_policy_job_id?: string;  // Job ID of the best policy URL for extraction prioritization
  run_id?: string;  // Optional run_id for diff writing
}

interface ExtractionResult {
  policy_pack: PolicyPack | null;
  provider_rules: ProviderRule[];
  confidence: ConfidenceBreakdown;
  total_score: number;
  action: 'auto_approve' | 'human_review' | 'hold';
  extraction_notes: string[];
}

interface PolicyPack {
  institution: string;
  academic_year: string;
  residency_policy: ResidencyPolicy;
  transfer_credit_limits: TransferCreditLimits;
  credit_sources_accepted: CreditSourcesAccepted;
  institutional_course_requirements: InstitutionalCourseRequirements;
  upper_level_requirements: UpperLevelRequirements;
  policy_effective_dates: {
    effective_start: string | null;
    effective_end?: string | null;
  };
}

interface ResidencyPolicy {
  min_institutional_credits: number | null;
  residency_waiver_available: boolean;
  waiver_name?: string;
  waiver_notes?: string;
}

interface TransferCreditLimits {
  max_total_transfer_credits: number | null;
  max_ace_nccrs_credits: number | null;
  min_regionally_accredited_credits: number | null;
}

interface CreditSourcesAccepted {
  regionally_accredited: boolean;
  ace: boolean;
  nccrs: boolean;
  clep: boolean;
  dsst: boolean;
  ap: boolean;
  tecep: boolean;
  portfolio_assessment: boolean;
}

interface InstitutionalCourseRequirements {
  cornerstone_required: boolean;
  capstone_required: boolean;
  info_literacy_required?: boolean;
}

interface UpperLevelRequirements {
  min_upper_level_credits: number | null;
  applies_to: string;
}

interface ProviderRule {
  provider_name: string;
  provider_type: 'course' | 'exam' | 'portfolio';
  acceptance_status: 'accepted' | 'accepted_with_limits' | 'not_accepted';
  credit_constraints?: {
    max_credits?: number;
    counts_toward_ace_limit?: boolean;
    counts_as_ra_credit?: boolean;
  };
  conditions?: string[];
}

interface ConfidenceBreakdown {
  source_authority: number;
  language_certainty: number;
  cross_source_agreement: number;
  recency: number;
  structural_consistency: number;
  ai_certainty: number;
}

interface SourcedValue<T> {
  value: T;
  sourceJobId: string;
  confidence: number;
  sourceUrl?: string;  // For evidence capture
}

interface MergeResult {
  success: boolean;
  merged_policy_pack: PolicyPack | null;
  merged_provider_rules: ProviderRule[];
  confidence: ConfidenceBreakdown;
  total_score: number;
  action: 'auto_approve' | 'human_review' | 'hold';
  merge_notes: string[];
  sources_used: string[];
  field_provenance: FieldProvenance;
  trust_tier: 'verified' | 'partial' | 'unverified';
}

// Per-field provenance tracking
interface FieldProvenance {
  [fieldPath: string]: {
    source: 'ground_truth' | 'ai_extraction' | 'human_override';
    source_ref?: string;
    source_url?: string;     // Evidence URL for verification
    source_text?: string;    // Evidence text snippet
    final_value: unknown;
    overrode_value?: unknown;
    overrode_at?: string;
    confidence?: number;     // For verification queue
  };
}

// Diff record for audit logging
interface FieldDiff {
  field: string;
  extracted_value: unknown;
  ground_truth_value: unknown;
  final_value: unknown;
  did_override: boolean;
}

// Ground truth row type
interface GroundTruth {
  id: string;
  institution: string;
  residency_credits: number | null;
  max_transfer_credits: number | null;
  max_ace_nccrs_credits: number | null;
  accepts_clep: boolean | null;
  accepts_dsst: boolean | null;
  accepts_ap: boolean | null;
  accepts_tecep: boolean | null;
  accepts_portfolio: boolean | null;
  capstone_required: boolean | null;
  cornerstone_required: boolean | null;
  info_literacy_required: boolean | null;
  min_upper_level_credits: number | null;
  source_url: string | null;
}

// -----------------------------------------------------------------------------
// CROSS-SOURCE AGREEMENT CALCULATION
// -----------------------------------------------------------------------------

function calculateCrossSourceAgreement(
  extractions: { jobId: string; extraction: ExtractionResult }[]
): { score: number; agreements: string[]; conflicts: string[] } {
  const agreements: string[] = [];
  const conflicts: string[] = [];
  
  if (extractions.length < 2) {
    return { score: 10, agreements: ['Single source only'], conflicts: [] };
  }

  let agreementCount = 0;
  let comparisonCount = 0;

  // Check residency credits agreement
  const residencyValues = extractions
    .map(e => e.extraction.policy_pack?.residency_policy?.min_institutional_credits)
    .filter(v => v !== null && v !== undefined) as number[];
  
  if (residencyValues.length > 1) {
    comparisonCount++;
    const allMatch = new Set(residencyValues).size === 1;
    if (allMatch) {
      agreementCount++;
      agreements.push(`Residency credits: all sources agree on ${residencyValues[0]}`);
    } else {
      conflicts.push(`Residency credits: sources disagree (${residencyValues.join(', ')})`);
    }
  }

  // Check ACE/NCCRS limit agreement
  const aceLimits = extractions
    .map(e => e.extraction.policy_pack?.transfer_credit_limits?.max_ace_nccrs_credits)
    .filter(v => v !== null && v !== undefined) as number[];
  
  if (aceLimits.length > 1) {
    comparisonCount++;
    const allMatch = new Set(aceLimits).size === 1;
    if (allMatch) {
      agreementCount++;
      agreements.push(`ACE/NCCRS limit: all sources agree on ${aceLimits[0]}`);
    } else {
      conflicts.push(`ACE/NCCRS limit: sources disagree (${aceLimits.join(', ')})`);
    }
  }

  // Check credit sources agreement (CLEP, DSST, etc.)
  const creditSources = ['clep', 'dsst', 'ap', 'ace', 'nccrs', 'tecep'] as const;
  for (const source of creditSources) {
    const values = extractions
      .map(e => e.extraction.policy_pack?.credit_sources_accepted?.[source])
      .filter(v => v !== undefined) as boolean[];
    
    if (values.length > 1) {
      comparisonCount++;
      const allMatch = new Set(values).size === 1;
      if (allMatch) {
        agreementCount++;
      }
    }
  }

  // Calculate score: 20 points max
  // Full agreement = 20, partial = 10-19, no agreement = 5-9
  if (comparisonCount === 0) {
    return { score: 10, agreements, conflicts };
  }

  const agreementRatio = agreementCount / comparisonCount;
  const score = Math.round(5 + agreementRatio * 15); // 5-20 range

  if (agreementRatio >= 0.8) {
    agreements.push(`High cross-source agreement: ${Math.round(agreementRatio * 100)}%`);
  }

  return { score, agreements, conflicts };
}

// -----------------------------------------------------------------------------
// RECENCY SCORING
// -----------------------------------------------------------------------------

function calculateRecencyScore(text: string, url: string): number {
  // Check for academic year patterns
  const yearMatch = text.match(/20(\d{2})-20(\d{2})/);
  if (yearMatch) {
    const endYear = parseInt('20' + yearMatch[2]);
    const currentYear = new Date().getFullYear();
    if (endYear >= currentYear) return 15; // Current year
    if (endYear === currentYear - 1) return 12; // Last year
    return 8; // Older
  }
  
  // Check URL for catalog year
  if (url.includes('/current/') || url.includes('/2025-2026/') || url.includes('/2024-2025/')) return 15;
  if (url.includes('/2023-2024/')) return 10;
  
  return 10; // Default
}

// -----------------------------------------------------------------------------
// FIELD-SPECIFIC URL AUTHORITY BONUS
// -----------------------------------------------------------------------------
// Boost confidence for specific fields when URL contains relevant keywords

function getFieldSpecificUrlBonus(fieldPath: string, url: string): number {
  const urlLower = url.toLowerCase();
  
  // Residency-related fields get HIGH bonus from residency-specific URLs
  // This must overcome consensus voting where 2 wrong sources beat 1 correct source
  if (fieldPath.includes('residency') || fieldPath.includes('institutional_credits')) {
    if (urlLower.includes('residency')) return 60;  // Strong bonus for dedicated residency pages
    if (urlLower.includes('credit-hour')) return 50;
    if (urlLower.includes('institutional')) return 35;
    if (urlLower.includes('requirement')) return 20;
  }
  
  // Transfer credit fields get bonus from transfer-specific URLs
  if (fieldPath.includes('transfer')) {
    if (urlLower.includes('transfer')) return 20;
    if (urlLower.includes('credit')) return 10;
  }
  
  // Credit source acceptance fields get bonus from exam/credit URLs
  if (fieldPath.includes('clep') || fieldPath.includes('dsst') || fieldPath.includes('ap')) {
    if (urlLower.includes('exam') || urlLower.includes('clep') || urlLower.includes('testing')) return 20;
    if (urlLower.includes('credit-by-exam')) return 25;
    if (urlLower.includes('credit')) return 10;
  }
  
  return 0;
}

// -----------------------------------------------------------------------------
// VALUE SELECTION WITH WEIGHTED VOTING
// -----------------------------------------------------------------------------
// When multiple sources provide different values, use weighted voting to pick
// the best value based on confidence scores and consensus bonuses.

interface ValueCandidate<T> {
  value: T;
  sourceJobId: string;
  confidence: number;
  url: string;
  isScoped?: boolean;        // True if value appears near scope-limiting language
  scopeReason?: string;      // What scope phrase was detected
  contextSnippet?: string;   // Text context around the value for debugging
}

// Two-tier scope detection tokens
// HARD tokens: always indicate scoped cap if near the number
const SCOPE_TOKENS_HARD = [
  'associate degree', 'aa degree', 'as degree', 'aas degree',
  'pathway', 'articulation', 'transfer guarantee', 
  'community college', 'partner college', 'partner institution',
  'two-year', '2-year', 'from accredited',
];

// SOFT tokens: only indicate scoped if paired with qualifier phrases
const SCOPE_TOKENS_SOFT = [
  'graduate', 'master', 'doctoral', 'phd',
  'major', 'concentration', 'specialization', 'program',
];

// Qualifier phrases that make SOFT tokens become scoped
const SCOPE_QUALIFIERS = [
  'for students in', 'applies to', 'in this program', 
  'for the', 'toward the', 'for this degree',
  'students enrolled in', 'students pursuing',
];

// -----------------------------------------------------------------------------
// RESIDENCY CREDITS FALLBACK EXTRACTOR
// -----------------------------------------------------------------------------
// Residency is often expressed differently than transfer caps:
// - "Students must complete 31 credits at Empire State University"
// - "Minimum of 31 credits must be completed in residence"
// - "Credits in Residence: 31"

interface ResidencyExtractionResult {
  value: number;
  confidence: number;
  contextSnippet: string;
  matchedPattern: string;
}

/**
 * Extracts residency credits using phrase-anchored patterns.
 * Returns the best match if found, null otherwise.
 */
function extractResidencyFromText(text: string): ResidencyExtractionResult | null {
  const textLower = text.toLowerCase();
  
  // High-confidence patterns for residency credits
  // Ordered by specificity (most specific first)
  const residencyPatterns = [
    // EMPIRE exact: "Bachelor's degree requires a minimum of 124 credits, with at least 31 earned at SUNY Empire"
    /(?:requires|require|requiring)\s+(?:a\s+minimum\s+of\s+)?\d{1,3}\s+(?:credits?|credit hours?)[^.]{0,60}?(?:with\s+at\s+least|at\s+least)\s+(\d{1,3})\s+(?:credits?\s+)?(?:earned|completed)\s+at\s+(?:suny\s*empire|empire\s*state|the\s+university|the\s+institution)/gi,
    // General: "with at least X earned/completed at [university]"
    /with\s+at\s+least\s+(\d{1,3})\s+(?:credits?\s+)?(?:earned|completed)\s+at\s+(?:suny\s*empire|empire\s*state|the\s+university|the\s+institution)/gi,
    // EMPIRE-style: "at least X earned at [university]" / "a minimum of X earned at"
    /(?:at least|a minimum of)\s+(\d{1,3})\s+(?:credits?\s+)?(?:earned|completed)\s+at\s+(?:suny\s*empire|empire\s*state|the\s+university|the\s+institution)/gi,
    // "X credits must be earned/completed at [university]"
    /(\d{1,3})\s*(?:credits?|credit hours?)\s+(?:must be\s+)?(?:earned|completed)\s+at\s+(?:suny\s*empire|empire\s*state|the\s+university|the\s+institution)/gi,
    // "must complete X credits at [university/in residence]"
    /must\s+(?:successfully\s+)?complete\s+(?:at least\s+|a minimum of\s+)?(\d{1,3})\s*(?:credits?|credit hours?|semester hours?)\s+(?:at|in)\s+(?:the university|empire|suny|in residence|residence)/gi,
    // "minimum of X credits must be completed in residence"
    /(?:minimum of|at least)\s+(\d{1,3})\s*(?:credits?|credit hours?|semester hours?)\s+must be completed\s+(?:at|in)\s*(?:residence|the university)/gi,
    // "X credits in residence" / "in residence...X credits"
    /in residence[^.]{0,80}?(\d{1,3})\s*(?:credits?|credit hours?|semester hours?)/gi,
    /(\d{1,3})\s*(?:credits?|credit hours?|semester hours?)[^.]{0,40}in residence/gi,
    // "institutional credits: X" / "X institutional credits"
    /institutional\s*(?:credit|credits)[^.]{0,60}?(\d{1,3})\s*(?:credits?|credit hours?)?/gi,
    /(\d{1,3})\s*institutional\s*(?:credits?|credit hours?)/gi,
    // Table-style: "Credits in Residence" header followed by number
    /credits?\s+in\s+residence[:\s]*(\d{1,3})/gi,
    /residence\s+(?:credits?|requirements?)[:\s]*(\d{1,3})/gi,
    // "residency requirement of X credits"
    /residency\s+requirement[^.]{0,40}?(\d{1,3})\s*(?:credits?|credit hours?)/gi,
    // "minimum residency: X credits"
    /minimum\s+residency[:\s]*(\d{1,3})\s*(?:credits?|credit hours?)?/gi,
  ];
  
  let bestMatch: ResidencyExtractionResult | null = null;
  
  for (const pattern of residencyPatterns) {
    // Reset regex state
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(textLower)) !== null) {
      const creditValue = parseInt(match[1], 10);
      
      // Sanity check: residency is typically 20-50 credits (allow 10-80 range)
      if (creditValue < 10 || creditValue > 80) continue;
      
      // Get context around match
      const matchStart = Math.max(0, match.index - 50);
      const matchEnd = Math.min(text.length, match.index + match[0].length + 50);
      const snippet = text.slice(matchStart, matchEnd);
      
      // Higher confidence if specific "earned at" / "in residence" / "institutional" language
      const isHighConfidence = 
        match[0].includes('earned at') ||
        match[0].includes('completed at') ||
        match[0].includes('in residence') || 
        match[0].includes('institutional') ||
        match[0].includes('must complete');
      
      const confidence = isHighConfidence ? 90 : 70;
      
      // Keep best (highest confidence, or first if tie)
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          value: creditValue,
          confidence,
          contextSnippet: snippet,
          matchedPattern: pattern.source,
        };
      }
    }
  }
  
  if (bestMatch) {
    console.log(`[residency-fallback] Found residency: ${bestMatch.value} credits (confidence: ${bestMatch.confidence})`);
    console.log(`[residency-fallback] Context: ${bestMatch.contextSnippet}`);
  }
  
  return bestMatch;
}

/**
 * Detects if a numeric value appears near scope-limiting language
 * Uses TIGHT credit-phrase anchored detection with degree-level overrides
 * 
 * Key improvements:
 * - ±100 char window around the SPECIFIC credit phrase (not wide paragraph)
 * - Degree-level override: bachelor/baccalaureate context makes it unscoped
 * - Prevents false positives from multi-cap paragraphs (40 associate vs 93 bachelor)
 */
function detectValueScope(
  value: number | string,
  extractedText: string,
  _url: string
): { isScoped: boolean; scopeReason: string | null; contextSnippet: string | null; matchedPhrase?: string } {
  const valueStr = String(value);
  const textLower = extractedText.toLowerCase();
  
  // Escape regex special characters in value
  const escapedValue = valueStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Anchor to credit phrases to avoid false matches (years, phone numbers, etc.)
  // Patterns: "93 credits", "up to 93 credits", "93 credit hours", "93 semester hours"
  const creditPhraseRegex = new RegExp(
    `\\b${escapedValue}\\b\\s*(credits|credit hours|semester hours|credit(?!s))`,
    'gi'
  );
  
  // Find ALL occurrences of this value as a credit phrase
  const matches = [...textLower.matchAll(creditPhraseRegex)];
  if (matches.length === 0) {
    // No credit-anchored match found - can't determine scope reliably
    console.log(`[scope] Value ${valueStr}: No credit-phrase match found in text - returning unscoped`);
    return { isScoped: false, scopeReason: null, contextSnippet: null };
  }
  console.log(`[scope] Value ${valueStr}: Found ${matches.length} credit-phrase matches`);

  
  // Evaluate each occurrence - check TIGHT window around each specific phrase
  for (const match of matches) {
    const matchPos = match.index ?? 0;
    const matchedPhrase = match[0];
    
    // TIGHT window: ±100 chars around this specific credit phrase
    const contextStart = Math.max(0, matchPos - 100);
    const contextEnd = Math.min(textLower.length, matchPos + matchedPhrase.length + 100);
    const tightContext = textLower.slice(contextStart, contextEnd);
    const tightSnippet = extractedText.slice(contextStart, contextEnd);
    
    // DEGREE-LEVEL OVERRIDE: bachelor/baccalaureate context = unscoped (institution-wide)
    const hasBachelorContext = 
      tightContext.includes('baccalaureate') || 
      tightContext.includes('bachelor') ||
      tightContext.includes('undergraduate') ||
      tightContext.includes('four-year') ||
      tightContext.includes('4-year');
    
    const hasAssociateContext = 
      tightContext.includes('associate degree') ||
      tightContext.includes('aa degree') ||
      tightContext.includes('as degree') ||
      tightContext.includes('aas degree') ||
      tightContext.includes('two-year') ||
      tightContext.includes('2-year');
    
    // If bachelor context present WITHOUT associate in tight window, this is unscoped
    if (hasBachelorContext && !hasAssociateContext) {
      console.log(`[scope] Value ${valueStr}: Bachelor context detected, marking as UNSCOPED`);
      return { 
        isScoped: false, 
        scopeReason: null, 
        contextSnippet: tightSnippet,
        matchedPhrase 
      };
    }
    
    // Check HARD tokens in TIGHT window only
    for (const token of SCOPE_TOKENS_HARD) {
      if (tightContext.includes(token.toLowerCase())) {
        console.log(`[scope] Value ${valueStr}: Hard scope token "${token}" in tight window`);
        return {
          isScoped: true,
          scopeReason: `Hard scope near value: "${token}"`,
          contextSnippet: tightSnippet.slice(0, 200) + '...',
          matchedPhrase
        };
      }
    }
    
    // Check SOFT tokens in TIGHT window - only scoped if qualifier present
    for (const softToken of SCOPE_TOKENS_SOFT) {
      if (tightContext.includes(softToken.toLowerCase())) {
        // Special case: "graduate" is only scoped if NOT paired with "undergraduate"
        if (softToken === 'graduate' && tightContext.includes('undergraduate')) {
          continue;
        }
        
        // Check if any qualifier phrase is present in tight window
        for (const qualifier of SCOPE_QUALIFIERS) {
          if (tightContext.includes(qualifier.toLowerCase())) {
            console.log(`[scope] Value ${valueStr}: Soft scope "${softToken}" + qualifier "${qualifier}"`);
            return {
              isScoped: true,
              scopeReason: `Soft scope near value: "${softToken}" + "${qualifier}"`,
              contextSnippet: tightSnippet.slice(0, 200) + '...',
              matchedPhrase
            };
          }
        }
      }
    }
  }
  
  // No scope tokens found in any tight window around credit phrase matches
  return { isScoped: false, scopeReason: null, contextSnippet: null };
}

function selectBestValueWithVoting<T>(
  candidates: ValueCandidate<T>[],
  fieldPath: string,
  valueToString: (v: T) => string = (v) => String(v)
): { selected: SourcedValue<T> | null; scopedCaps: ValueCandidate<T>[] } {
  const scopedCaps: ValueCandidate<T>[] = [];
  
  if (candidates.length === 0) return { selected: null, scopedCaps };
  
  // Separate scoped vs unscoped candidates
  const unscopedCandidates = candidates.filter(c => !c.isScoped);
  const scopedOnly = candidates.filter(c => c.isScoped);
  scopedCaps.push(...scopedOnly);
  
  // If we have unscoped candidates, use only those
  const activeCandidates = unscopedCandidates.length > 0 ? unscopedCandidates : [];
  
  // If ALL candidates are scoped, don't select any as institution-wide
  if (activeCandidates.length === 0) {
    console.log(`[merge] All ${candidates.length} candidates for ${fieldPath} are scoped - not selecting as institution-wide`);
    return { selected: null, scopedCaps, conflicts: [] };
  }
  
  if (activeCandidates.length === 1) {
    return { 
      selected: { 
        value: activeCandidates[0].value, 
        sourceJobId: activeCandidates[0].sourceJobId, 
        confidence: activeCandidates[0].confidence,
        sourceUrl: activeCandidates[0].url
      },
      scopedCaps,
      conflicts: []  // Single candidate = no conflict possible
    };
  }

  // Group by value and sum confidence scores with URL bonuses
  const valueScores = new Map<string, { value: T; total: number; count: number; bestSource: string; bestConfidence: number; bestUrl: string }>();
  
  for (const c of activeCandidates) {
    const key = valueToString(c.value);
    const urlBonus = getFieldSpecificUrlBonus(fieldPath, c.url);
    const adjustedConfidence = c.confidence + urlBonus;
    
    const existing = valueScores.get(key);
    if (existing) {
      existing.total += adjustedConfidence;
      existing.count += 1;
      if (adjustedConfidence > existing.bestConfidence) {
        existing.bestSource = c.sourceJobId;
        existing.bestConfidence = adjustedConfidence;
        existing.bestUrl = c.url;
      }
    } else {
      valueScores.set(key, { 
        value: c.value, 
        total: adjustedConfidence, 
        count: 1, 
        bestSource: c.sourceJobId,
        bestConfidence: adjustedConfidence,
        bestUrl: c.url
      });
    }
  }

  // Pick value with highest weighted score (including consensus bonus)
  let best: { value: T; score: number; source: string; url: string } | null = null;
  
  for (const [, data] of valueScores) {
    // Consensus bonus: +15 per additional source agreeing (up to +45)
    const consensusBonus = Math.min(45, (data.count - 1) * 15);
    const finalScore = data.total + consensusBonus;
    
    if (!best || finalScore > best.score) {
      best = { value: data.value, score: finalScore, source: data.bestSource, url: data.bestUrl };
    }
  }

  // Detect cross-source conflicts: if multiple DIFFERENT unscoped values exist
  const conflicts: Array<{ value: T; url: string; confidence: number }> = [];
  if (valueScores.size > 1) {
    for (const [, data] of valueScores) {
      conflicts.push({ value: data.value, url: data.bestUrl, confidence: data.bestConfidence });
    }
  }

  return { 
    selected: best ? { value: best.value, sourceJobId: best.source, confidence: best.score, sourceUrl: best.url } : null,
    scopedCaps,
    conflicts, // NEW: track when multiple sources disagree on unscoped values
  };
}

// Extended pickBestValue that also loads extracted_text for scope detection
// Performance: only loads text for jobs that produced numeric candidates
async function pickBestValueWithScopeDetection<T>(
  supabase: ReturnType<typeof createClient>,
  extractions: { jobId: string; extraction: ExtractionResult; url: string }[],
  accessor: (pack: PolicyPack) => T | null | undefined,
  fieldPath: string,
  valueToString?: (v: T) => string
): Promise<{ selected: SourcedValue<T> | null; scopedCaps: ValueCandidate<T>[]; conflicts: Array<{ value: T; url: string; confidence: number }> }> {
  // First pass: identify which jobs have numeric candidates worth checking
  const candidateJobIds: string[] = [];
  const candidatesByJob = new Map<string, { value: T; extraction: ExtractionResult; url: string }>();
  
  for (const { jobId, extraction, url } of extractions) {
    if (!extraction.policy_pack) continue;
    const value = accessor(extraction.policy_pack);
    if (value === null || value === undefined) continue;
    
    // Only need scope detection for numeric values
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(numeric)) {
      candidateJobIds.push(jobId);
      candidatesByJob.set(jobId, { value, extraction, url });
    }
  }
  
  // Performance guardrail: only load extracted_text for jobs with candidates (max 10)
  const jobsToLoad = candidateJobIds.slice(0, 10);
  const textByJob = new Map<string, string>();
  
  if (jobsToLoad.length > 0) {
    const { data: contents } = await supabase
      .from('scraped_content')
      .select('scrape_job_id, extracted_text')
      .in('scrape_job_id', jobsToLoad);
    
    for (const c of contents || []) {
      if (c.extracted_text) {
        textByJob.set(c.scrape_job_id, c.extracted_text);
      }
    }
  }

  // Build candidates with scope detection
  const candidates: ValueCandidate<T>[] = [];
  
  console.log(`[merge] Building candidates for scope detection, ${extractions.length} extractions`);
  
  for (const { jobId, extraction, url } of extractions) {
    if (!extraction.policy_pack) continue;
    const value = accessor(extraction.policy_pack);
    if (value === null || value === undefined) continue;
    
    // Detect scope for numeric values (handle both number and numeric string)
    const numeric = typeof value === 'number' ? value : Number(value);
    const isNumeric = !Number.isNaN(numeric);
    const text = textByJob.get(jobId) || '';
    
    console.log(`[merge] Candidate: value=${value}, url=${url}, hasText=${text.length > 0}`);
    
    const scopeResult = isNumeric && text
      ? detectValueScope(numeric, text, url)
      : { isScoped: false, scopeReason: null, contextSnippet: null };
    
    console.log(`[merge] Scope result: isScoped=${scopeResult.isScoped}, reason=${scopeResult.scopeReason}`);
    
    candidates.push({ 
      value, 
      sourceJobId: jobId, 
      confidence: extraction.total_score, 
      url,
      isScoped: scopeResult.isScoped,
      scopeReason: scopeResult.scopeReason || undefined,
      contextSnippet: scopeResult.contextSnippet || undefined,
    });
  }

  // Use weighted voting to select best value, filtering out scoped candidates
  // Now also returns conflicts if multiple sources disagree
  return selectBestValueWithVoting(candidates, fieldPath, valueToString);
}

// Track conflicts detected during value selection
interface ValueSelectionResult<T> {
  selected: SourcedValue<T> | null;
  scopedCaps: ValueCandidate<T>[];
  conflicts?: Array<{ value: T; url: string; confidence: number }>;
}

// Original sync version for non-numeric fields (no scope detection needed)
function pickBestValue<T>(
  extractions: { jobId: string; extraction: ExtractionResult; url: string }[],
  accessor: (pack: PolicyPack) => T | null | undefined,
  fieldPath: string,
  valueToString?: (v: T) => string
): SourcedValue<T> | null {
  // Collect all candidates with their confidence scores and URLs
  const candidates: ValueCandidate<T>[] = [];

  for (const { jobId, extraction, url } of extractions) {
    if (!extraction.policy_pack) continue;
    const value = accessor(extraction.policy_pack);
    if (value === null || value === undefined) continue;
    
    candidates.push({ value, sourceJobId: jobId, confidence: extraction.total_score, url });
  }

  // Use weighted voting to select best value with field-specific URL bonus
  const { selected } = selectBestValueWithVoting(candidates, fieldPath, valueToString);
  return selected;
}

// -----------------------------------------------------------------------------
// MERGE POLICY PACKS
// -----------------------------------------------------------------------------

async function mergePolicyPacks(
  supabase: ReturnType<typeof createClient>,
  institution: string,
  extractions: { jobId: string; extraction: ExtractionResult; url: string }[]
): Promise<{ 
  mergedPack: PolicyPack | null; 
  sources: string[]; 
  notes: string[]; 
  pickedValues: {
    residencyCredits: SourcedValue<number> | null;
    maxTransfer: SourcedValue<number> | null;
    maxAceNccrs: SourcedValue<number> | null;
  };
  scopedCapsDetected: boolean;
  scopedCaps: Array<{ field: string; value: number; url: string; scopeReason: string; contextSnippet?: string }>;
  conflicts: Array<{ field: string; values: Array<{ value: unknown; url: string; confidence: number }> }>;
}> {
  const notes: string[] = [];
  const sources: string[] = [];
  const allScopedCaps: Array<{ field: string; value: number; url: string; scopeReason: string; contextSnippet?: string }> = [];
  const allConflicts: Array<{ field: string; values: Array<{ value: unknown; url: string; confidence: number }> }> = [];
  
  const validExtractions = extractions.filter(e => e.extraction.policy_pack);
  if (validExtractions.length === 0) {
    return { 
      mergedPack: null, 
      sources, 
      notes: ['No valid policy packs to merge'],
      pickedValues: { residencyCredits: null, maxTransfer: null, maxAceNccrs: null },
      scopedCapsDetected: false,
      scopedCaps: [],
      conflicts: [],
    };
  }

  // Pick best values for NUMERIC fields with SCOPE DETECTION
  const residencyResult = await pickBestValueWithScopeDetection(
    supabase, validExtractions, 
    p => p.residency_policy?.min_institutional_credits, 
    'residency.min_institutional_credits'
  );
  const maxTransferResult = await pickBestValueWithScopeDetection(
    supabase, validExtractions, 
    p => p.transfer_credit_limits?.max_total_transfer_credits, 
    'transfer.max_total'
  );
  const maxAceNccrsResult = await pickBestValueWithScopeDetection(
    supabase, validExtractions, 
    p => p.transfer_credit_limits?.max_ace_nccrs_credits, 
    'transfer.ace_nccrs'
  );
  
  // Track scoped caps for diagnostics
  for (const sc of residencyResult.scopedCaps) {
    allScopedCaps.push({
      field: 'residency_credits',
      value: sc.value as number,
      url: sc.url,
      scopeReason: sc.scopeReason || 'unknown scope',
      contextSnippet: sc.contextSnippet,
    });
  }
  for (const sc of maxTransferResult.scopedCaps) {
    allScopedCaps.push({
      field: 'max_transfer_credits',
      value: sc.value as number,
      url: sc.url,
      scopeReason: sc.scopeReason || 'unknown scope',
      contextSnippet: sc.contextSnippet,
    });
  }
  
  // Track cross-source conflicts (different unscoped values from different sources)
  console.log(`[merge] Conflict check - residency conflicts: ${residencyResult.conflicts?.length || 0}, maxTransfer conflicts: ${maxTransferResult.conflicts?.length || 0}`);
  if (residencyResult.conflicts && residencyResult.conflicts.length > 1) {
    allConflicts.push({ field: 'residency_credits', values: residencyResult.conflicts });
    notes.push(`⚠️ Cross-source conflict: residency_credits has ${residencyResult.conflicts.length} different values (${residencyResult.conflicts.map(c => c.value).join(' vs ')})`);
    console.log(`[merge] CONFLICT DETECTED: residency ${JSON.stringify(residencyResult.conflicts)}`);
  }
  if (maxTransferResult.conflicts && maxTransferResult.conflicts.length > 1) {
    allConflicts.push({ field: 'max_transfer_credits', values: maxTransferResult.conflicts });
    notes.push(`⚠️ Cross-source conflict: max_transfer_credits has ${maxTransferResult.conflicts.length} different values (${maxTransferResult.conflicts.map(c => c.value).join(' vs ')})`);
    console.log(`[merge] CONFLICT DETECTED: maxTransfer ${JSON.stringify(maxTransferResult.conflicts)}`);
  }
  
  let residencyCredits = residencyResult.selected;
  const maxTransfer = maxTransferResult.selected;
  const maxAceNccrs = maxAceNccrsResult.selected;
  
  // ==========================================================================
  // RESIDENCY FALLBACK: If AI extraction didn't find residency, try pattern matching
  // ==========================================================================
  if (!residencyCredits) {
    console.log('[merge] No AI-extracted residency found, attempting fallback extraction...');
    
    // Load extracted text from all job IDs (limit to 5 for performance)
    const jobIdsToCheck = validExtractions.slice(0, 5).map(e => e.jobId);
    const { data: textContents } = await supabase
      .from('scraped_content')
      .select('scrape_job_id, extracted_text, url')
      .in('scrape_job_id', jobIdsToCheck)
      .not('extracted_text', 'is', null);
    
    let bestFallback: { value: number; jobId: string; url: string; confidence: number; contextSnippet: string } | null = null;
    
    for (const content of textContents || []) {
      if (!content.extracted_text) continue;
      
      // Prioritize residency-specific URLs
      const urlBonus = content.url?.toLowerCase().includes('residency') ? 20 : 0;
      
      const result = extractResidencyFromText(content.extracted_text);
      if (result) {
        const adjustedConfidence = result.confidence + urlBonus;
        if (!bestFallback || adjustedConfidence > bestFallback.confidence) {
          bestFallback = {
            value: result.value,
            jobId: content.scrape_job_id,
            url: content.url || '',
            confidence: adjustedConfidence,
            contextSnippet: result.contextSnippet,
          };
        }
      }
    }
    
    if (bestFallback) {
      notes.push(`🔍 Residency fallback: found ${bestFallback.value} credits via pattern matching (confidence: ${bestFallback.confidence})`);
      notes.push(`   Context: "${bestFallback.contextSnippet}"`);
      residencyCredits = {
        value: bestFallback.value,
        sourceJobId: bestFallback.jobId,
        confidence: bestFallback.confidence,
        sourceUrl: bestFallback.url,
      };
    } else {
      notes.push('⚠️ Residency fallback: no patterns matched in available text');
    }
  }
  
  // Non-numeric fields don't need scope detection
  const residencyWaiver = pickBestValue(validExtractions, p => p.residency_policy?.residency_waiver_available, 'residency.waiver');
  const academicYear = pickBestValue(validExtractions, p => p.academic_year, 'academic_year');
  
  // Track sources used
  const usedSources = new Set<string>();
  [residencyCredits, residencyWaiver, maxTransfer, maxAceNccrs, academicYear]
    .filter(v => v)
    .forEach(v => v && usedSources.add(v.sourceJobId));
  
  sources.push(...usedSources);

  // Get first valid pack as base
  const basePack = validExtractions[0].extraction.policy_pack!;

  // CRITICAL: When scoped caps exist but no unscoped selection, DON'T fall back to basePack
  // because basePack values may be scoped. Only use null to indicate "no institution-wide cap found"
  const maxTransferScopedOnly = maxTransferResult.scopedCaps.length > 0 && !maxTransfer;
  const residencyScopedOnly = residencyResult.scopedCaps.length > 0 && !residencyCredits;

  // Build merged pack
  const mergedPack: PolicyPack = {
    institution,
    academic_year: academicYear?.value || basePack.academic_year,
    residency_policy: {
      // Don't fallback to basePack if we only found scoped values
      min_institutional_credits: residencyCredits?.value ?? (residencyScopedOnly ? null : basePack.residency_policy?.min_institutional_credits ?? null),
      residency_waiver_available: residencyWaiver?.value ?? basePack.residency_policy?.residency_waiver_available ?? false,
      waiver_name: basePack.residency_policy?.waiver_name,
      waiver_notes: basePack.residency_policy?.waiver_notes,
    },
    transfer_credit_limits: {
      // Don't fallback to basePack if we only found scoped values
      max_total_transfer_credits: maxTransfer?.value ?? (maxTransferScopedOnly ? null : basePack.transfer_credit_limits?.max_total_transfer_credits ?? null),
      max_ace_nccrs_credits: maxAceNccrs?.value ?? basePack.transfer_credit_limits?.max_ace_nccrs_credits ?? null,
      min_regionally_accredited_credits: basePack.transfer_credit_limits?.min_regionally_accredited_credits ?? null,
    },
    credit_sources_accepted: mergeCreditSources(validExtractions),
    institutional_course_requirements: basePack.institutional_course_requirements,
    upper_level_requirements: basePack.upper_level_requirements,
    policy_effective_dates: basePack.policy_effective_dates,
  };

  notes.push(`Merged ${validExtractions.length} sources into unified policy pack`);
  if (residencyCredits) {
    notes.push(`Residency: ${residencyCredits.value} credits (from ${residencyCredits.sourceUrl || 'unknown'})`);
  }
  if (maxTransfer) {
    notes.push(`Max transfer: ${maxTransfer.value} credits (from ${maxTransfer.sourceUrl || 'unknown'})`);
  }
  
  // Log scoped caps that were excluded
  if (allScopedCaps.length > 0) {
    notes.push(`⚠️ Found ${allScopedCaps.length} scoped cap(s) excluded from institution-wide selection`);
    for (const sc of allScopedCaps) {
      notes.push(`  - ${sc.field}: ${sc.value} (${sc.scopeReason})`);
    }
  }

  return { 
    mergedPack, 
    sources, 
    notes,
    pickedValues: { residencyCredits, maxTransfer, maxAceNccrs },
    scopedCapsDetected: allScopedCaps.length > 0,
    scopedCaps: allScopedCaps,
    conflicts: allConflicts, // NEW: cross-source disagreements
  };
}

function mergeCreditSources(
  extractions: { jobId: string; extraction: ExtractionResult }[]
): CreditSourcesAccepted {
  // For boolean fields, prefer true if any source says true (conservative)
  const merged: CreditSourcesAccepted = {
    regionally_accredited: false,
    ace: false,
    nccrs: false,
    clep: false,
    dsst: false,
    ap: false,
    tecep: false,
    portfolio_assessment: false,
  };

  for (const { extraction } of extractions) {
    const sources = extraction.policy_pack?.credit_sources_accepted;
    if (!sources) continue;
    
    for (const key of Object.keys(merged) as (keyof CreditSourcesAccepted)[]) {
      if (sources[key] === true) {
        merged[key] = true;
      }
    }
  }

  return merged;
}

// -----------------------------------------------------------------------------
// MERGE PROVIDER RULES
// -----------------------------------------------------------------------------

function mergeProviderRules(
  extractions: { jobId: string; extraction: ExtractionResult }[]
): ProviderRule[] {
  const rulesByProvider: Map<string, { rule: ProviderRule; confidence: number }> = new Map();

  for (const { extraction } of extractions) {
    for (const rule of extraction.provider_rules) {
      const existing = rulesByProvider.get(rule.provider_name);
      if (!existing || extraction.total_score > existing.confidence) {
        rulesByProvider.set(rule.provider_name, { rule, confidence: extraction.total_score });
      }
    }
  }

  return Array.from(rulesByProvider.values()).map(v => v.rule);
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const body: MergeRequest = await req.json();
    const { institution, scrape_job_ids, url_diagnostics, diagnostic_summary: precomputedSummary, best_policy_job_id, run_id } = body;

    if (!institution || !scrape_job_ids?.length) {
      return new Response(
        JSON.stringify({ error: 'institution and scrape_job_ids are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[merge] Starting merge for ${institution} with ${scrape_job_ids.length} jobs${best_policy_job_id ? ` (prioritizing ${best_policy_job_id})` : ''}`);

    // Load all extraction results
    const { data: contents, error } = await supabase
      .from('scraped_content')
      .select('scrape_job_id, ai_extracted_data, url')
      .in('scrape_job_id', scrape_job_ids);

    if (error) {
      console.error('[merge] Error loading content:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to load scraped content', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractions: { jobId: string; extraction: ExtractionResult; url: string }[] = [];
    for (const content of contents || []) {
      if (content.ai_extracted_data?.policy_pack || content.ai_extracted_data?.provider_rules?.length) {
        extractions.push({
          jobId: content.scrape_job_id,
          extraction: content.ai_extracted_data as ExtractionResult,
          url: content.url || '',
        });
      }
    }

    if (extractions.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          merged_policy_pack: null,
          merged_provider_rules: [],
          confidence: { source_authority: 0, language_certainty: 0, cross_source_agreement: 0, recency: 0, structural_consistency: 0, ai_certainty: 0 },
          total_score: 0,
          action: 'hold',
          merge_notes: ['No valid extractions found to merge'],
          sources_used: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRIORITIZE best_policy_job_id: reorder extractions so best policy comes first
    // This gives it preference in merge logic (first valid value wins for ties)
    if (best_policy_job_id) {
      const bestIdx = extractions.findIndex(e => e.jobId === best_policy_job_id);
      if (bestIdx > 0) {
        const [best] = extractions.splice(bestIdx, 1);
        extractions.unshift(best);
        console.log(`[merge] Reordered extractions to prioritize best_policy_job_id: ${best.url}`);
      }
    }

    console.log(`[merge] Found ${extractions.length} valid extractions`);

    // Merge policy packs (with best_policy_job_id as first for priority)
    const mergeResult = await mergePolicyPacks(supabase, institution, extractions);
    const { mergedPack, sources, notes, pickedValues, scopedCapsDetected, scopedCaps, conflicts } = mergeResult;
    
    // Merge provider rules
    const mergedRules = mergeProviderRules(extractions);

    // Calculate cross-source agreement
    const agreement = calculateCrossSourceAgreement(extractions);
    notes.push(...agreement.agreements);
    notes.push(...agreement.conflicts);

    // Calculate recency from best source
    const bestExtraction = extractions.reduce((best, curr) => 
      curr.extraction.total_score > best.extraction.total_score ? curr : best
    );
    const recencyScore = calculateRecencyScore(
      mergedPack?.academic_year || '',
      bestExtraction.url
    );

    // Build final confidence breakdown using MAX values from quality sources + multi-source bonus
    // Filter to quality sources only (score >= 60) for confidence calculation
    const qualitySources = extractions.filter(e => e.extraction.total_score >= 60);
    const sourcesForConfidence = qualitySources.length > 0 ? qualitySources : extractions;

    // Use MAX for each confidence component (not average!)
    const maxSourceAuthority = Math.max(
      ...sourcesForConfidence.map(e => e.extraction.confidence?.source_authority || 0)
    );
    const maxLanguageCertainty = Math.max(
      ...sourcesForConfidence.map(e => e.extraction.confidence?.language_certainty || 0)
    );
    const maxStructural = Math.max(
      ...sourcesForConfidence.map(e => e.extraction.confidence?.structural_consistency || 0)
    );
    const maxAiCertainty = Math.max(
      ...sourcesForConfidence.map(e => e.extraction.confidence?.ai_certainty || 0)
    );

    // Apply multi-source bonus: +1 per additional quality source (max +3)
    const multiSourceBonus = Math.min(3, Math.max(0, qualitySources.length - 1));
    notes.push(`Multi-source bonus: +${multiSourceBonus} (${qualitySources.length} quality sources)`);

    const confidence: ConfidenceBreakdown = {
      source_authority: maxSourceAuthority,
      language_certainty: maxLanguageCertainty,
      cross_source_agreement: agreement.score,
      recency: recencyScore,
      structural_consistency: Math.min(10, maxStructural + multiSourceBonus), // Cap at 10
      ai_certainty: maxAiCertainty,
    };

    let totalScore = Object.values(confidence).reduce((a, b) => a + b, 0);
    let action: 'auto_approve' | 'human_review' | 'hold' = totalScore >= 85 ? 'auto_approve' : totalScore >= 60 ? 'human_review' : 'hold';

    // ==========================================================================
    // BULLETPROOF GROUND TRUTH OVERRIDE WITH PROVENANCE TRACKING
    // ==========================================================================
    const fieldProvenance: FieldProvenance = {};
    const fieldDiffs: FieldDiff[] = [];
    let criticalFieldsVerified = true;
    let fieldsOverridden = 0;
    let fieldsMatched = 0;
    let fieldsMissingGroundTruth = 0;
    let gt: GroundTruth | null = null; // Declare at higher scope to avoid ReferenceError

    if (mergedPack) {
      const { data: groundTruth } = await supabase
        .from('institution_policy_ground_truth')
        .select('*')
        .eq('institution', institution)
        .maybeSingle();

      gt = groundTruth as GroundTruth | null;
      notes.push(`Ground truth validation for ${institution}:`);

      // Helper to track field override
      const trackField = (
        fieldPath: string,
        extractedValue: unknown,
        gtValue: unknown,
        isCritical: boolean
      ): { finalValue: unknown; wasOverridden: boolean } => {
        const hasGroundTruth = gtValue !== null && gtValue !== undefined;
        
        if (!hasGroundTruth) {
          fieldsMissingGroundTruth++;
          if (isCritical) {
            criticalFieldsVerified = false;
            notes.push(`⚠️ ${fieldPath}: No ground truth (critical field - blocking auto-approve)`);
          }
          fieldProvenance[fieldPath] = {
            source: 'ai_extraction',
            final_value: extractedValue,
          };
          fieldDiffs.push({
            field: fieldPath,
            extracted_value: extractedValue,
            ground_truth_value: null,
            final_value: extractedValue,
            did_override: false,
          });
          return { finalValue: extractedValue, wasOverridden: false };
        }

        const wasOverridden = extractedValue !== gtValue;
        if (wasOverridden) {
          fieldsOverridden++;
          notes.push(`🔄 ${fieldPath}: ${extractedValue} → ${gtValue} (ground truth override)`);
          fieldProvenance[fieldPath] = {
            source: 'ground_truth',
            source_ref: gt?.source_url || gt?.id,
            final_value: gtValue,
            overrode_value: extractedValue,
            overrode_at: new Date().toISOString(),
          };
        } else {
          fieldsMatched++;
          notes.push(`✓ ${fieldPath}: ${gtValue} (matches ground truth)`);
          fieldProvenance[fieldPath] = {
            source: 'ground_truth',
            source_ref: gt?.source_url || gt?.id,
            final_value: gtValue,
          };
        }

        fieldDiffs.push({
          field: fieldPath,
          extracted_value: extractedValue,
          ground_truth_value: gtValue,
          final_value: gtValue,
          did_override: wasOverridden,
        });

        return { finalValue: gtValue, wasOverridden };
      };

      // CRITICAL FIELDS - these block auto-approve if not ground-truth verified
      if (gt) {
        // Ensure nested objects exist before writing to them
        mergedPack.residency_policy ??= {};
        mergedPack.transfer_credit_limits ??= {};
        mergedPack.credit_sources_accepted ??= {};
        mergedPack.institutional_course_requirements ??= {};

        // Residency credits (CRITICAL)
        const residencyResult = trackField(
          'residency_policy.min_institutional_credits',
          mergedPack.residency_policy?.min_institutional_credits,
          gt.residency_credits,
          true
        );
        if (residencyResult.finalValue !== undefined) {
          mergedPack.residency_policy.min_institutional_credits = residencyResult.finalValue as number;
        }

        // Max transfer credits (CRITICAL)
        const maxTransferResult = trackField(
          'transfer_credit_limits.max_total_transfer_credits',
          mergedPack.transfer_credit_limits?.max_total_transfer_credits,
          gt.max_transfer_credits,
          true
        );
        if (maxTransferResult.finalValue !== undefined) {
          mergedPack.transfer_credit_limits.max_total_transfer_credits = maxTransferResult.finalValue as number;
        }

        // ACE/NCCRS limit (important but not critical)
        const aceResult = trackField(
          'transfer_credit_limits.max_ace_nccrs_credits',
          mergedPack.transfer_credit_limits?.max_ace_nccrs_credits,
          gt.max_ace_nccrs_credits,
          false
        );
        if (aceResult.finalValue !== undefined) {
          mergedPack.transfer_credit_limits.max_ace_nccrs_credits = aceResult.finalValue as number;
        }

        // Credit source acceptance fields
        const creditSources = [
          { path: 'credit_sources_accepted.clep', key: 'clep' as const, gtKey: 'accepts_clep' as const },
          { path: 'credit_sources_accepted.dsst', key: 'dsst' as const, gtKey: 'accepts_dsst' as const },
          { path: 'credit_sources_accepted.ap', key: 'ap' as const, gtKey: 'accepts_ap' as const },
          { path: 'credit_sources_accepted.tecep', key: 'tecep' as const, gtKey: 'accepts_tecep' as const },
          { path: 'credit_sources_accepted.portfolio_assessment', key: 'portfolio_assessment' as const, gtKey: 'accepts_portfolio' as const },
        ] as const;

        for (const { path, key, gtKey } of creditSources) {
          const gtVal = gt[gtKey];
          if (gtVal !== null) {
            const result = trackField(path, mergedPack.credit_sources_accepted[key], gtVal, false);
            if (result.finalValue !== undefined) {
              mergedPack.credit_sources_accepted[key] = result.finalValue as boolean;
            }
          }
        }

        // Institutional requirements
        if (gt.capstone_required !== null) {
          const result = trackField(
            'institutional_course_requirements.capstone_required',
            mergedPack.institutional_course_requirements?.capstone_required,
            gt.capstone_required,
            false
          );
          if (result.finalValue !== undefined && mergedPack.institutional_course_requirements) {
            mergedPack.institutional_course_requirements.capstone_required = result.finalValue as boolean;
          }
        }

        if (gt.cornerstone_required !== null) {
          const result = trackField(
            'institutional_course_requirements.cornerstone_required',
            mergedPack.institutional_course_requirements?.cornerstone_required,
            gt.cornerstone_required,
            false
          );
          if (result.finalValue !== undefined && mergedPack.institutional_course_requirements) {
            mergedPack.institutional_course_requirements.cornerstone_required = result.finalValue as boolean;
          }
        }

        // Boost confidence when ground truth is used
        if (fieldsOverridden > 0) {
          confidence.source_authority = Math.min(30, confidence.source_authority + 5);
          confidence.ai_certainty = 5; // Max when ground truth applied
          notes.push(`Ground truth applied to ${fieldsOverridden} field(s) - boosting confidence`);
        }
      } else {
        // No ground truth exists - all critical fields are unverified
        criticalFieldsVerified = false;
        notes.push(`⚠️ No ground truth found for ${institution} - critical fields unverified`);
        
        // Mark all fields as AI extraction with source URLs for evidence
        fieldProvenance['residency_policy.min_institutional_credits'] = {
          source: 'ai_extraction',
          final_value: mergedPack.residency_policy?.min_institutional_credits,
          source_url: pickedValues.residencyCredits?.sourceUrl || null,
          confidence: pickedValues.residencyCredits?.confidence || 0,
        };
        fieldProvenance['transfer_credit_limits.max_total_transfer_credits'] = {
          source: 'ai_extraction',
          final_value: mergedPack.transfer_credit_limits?.max_total_transfer_credits,
          source_url: pickedValues.maxTransfer?.sourceUrl || null,
          confidence: pickedValues.maxTransfer?.confidence || 0,
        };
        fieldProvenance['transfer_credit_limits.max_ace_nccrs_credits'] = {
          source: 'ai_extraction',
          final_value: mergedPack.transfer_credit_limits?.max_ace_nccrs_credits,
          source_url: pickedValues.maxAceNccrs?.sourceUrl || null,
          confidence: pickedValues.maxAceNccrs?.confidence || 0,
        };
      }

      // Recalculate score
      totalScore = Object.values(confidence).reduce((a, b) => a + b, 0);

      // TRUST TIER SCORING - block auto-approve if critical fields not verified
      if (!criticalFieldsVerified) {
        action = totalScore >= 60 ? 'human_review' : 'hold';
        notes.push(`🔒 Auto-approve blocked: critical fields not ground-truth verified`);
      } else {
        action = totalScore >= 85 ? 'auto_approve' : totalScore >= 60 ? 'human_review' : 'hold';
      }
    }

    // Determine trust tier
    const trustTier: 'verified' | 'partial' | 'unverified' = 
      criticalFieldsVerified ? 'verified' : 
      fieldsMatched + fieldsOverridden > 0 ? 'partial' : 'unverified';

    notes.push(`Final merged score: ${totalScore} (${action}) [trust: ${trustTier}]`);

    // Create merged policy pack in database with provenance tracking
    let policyPackId: string | null = null;
    if (mergedPack) {
      // Build flat policy_data structure that trigger expects
      const policyData = {
        residency_credits: mergedPack.residency_policy?.min_institutional_credits?.toString() ?? null,
        max_transfer_credits: mergedPack.transfer_credit_limits?.max_total_transfer_credits?.toString() ?? null,
        max_ace_nccrs_credits: mergedPack.transfer_credit_limits?.max_ace_nccrs_credits?.toString() ?? null,
        accepts_clep: mergedPack.credit_sources_accepted?.clep ?? null,
        accepts_dsst: mergedPack.credit_sources_accepted?.dsst ?? null,
        accepts_ap: mergedPack.credit_sources_accepted?.ap ?? null,
        accepts_tecep: mergedPack.credit_sources_accepted?.tecep ?? null,
        accepts_portfolio: mergedPack.credit_sources_accepted?.portfolio_assessment ?? null,
        capstone_required: mergedPack.institutional_course_requirements?.capstone_required ?? null,
        cornerstone_required: mergedPack.institutional_course_requirements?.cornerstone_required ?? null,
        min_upper_level_credits: mergedPack.upper_level_requirements?.min_upper_level_credits?.toString() ?? null,
      };

      // Check institution scope to determine if we should skip pack creation
      const { data: instData } = await supabase
        .from('institutions')
        .select('transfer_policy_scope')
        .eq('code', institution)
        .maybeSingle();

      const scope = instData?.transfer_policy_scope ?? 'institution';

      // Check if we have required numeric fields (BOTH required for any pack)
      // CRITICAL: Must check for actual numeric values, not just non-null
      // The policyData fields are strings from .toString(), so we need strict validation
      const residency = policyData.residency_credits;
      const maxTransfer = policyData.max_transfer_credits;
      
      // Strict validation: must be non-null, non-empty, and contain only digits
      const residencyOk = typeof residency === 'string' && residency.length > 0 && /^\d+$/.test(residency);
      const maxTransferOk = typeof maxTransfer === 'string' && maxTransfer.length > 0 && /^\d+$/.test(maxTransfer);
      const hasBothNumericCaps = residencyOk && maxTransferOk;
      
      console.log(`[merge] Caps validation: residency='${residency}' (${residencyOk}), maxTransfer='${maxTransfer}' (${maxTransferOk}), hasBoth=${hasBothNumericCaps}`);

      // === P1 FIX: WRITE DIFFS EARLY (before any early returns) ===
      // This ensures we always answer "What changed?" even if pack creation is skipped
      let earlyDiffsWritten = 0;
      if (run_id) {
        // Get current active pack for comparison
        const { data: currentPack } = await supabase
          .from('institution_policy_packs')
          .select('policy_data, confidence_score')
          .eq('institution', institution)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        const oldData = currentPack?.policy_data as Record<string, unknown> || {};
        const oldConfidence = currentPack?.confidence_score || 0;
        
        // Compare key fields and write diffs
        const fieldsToCompare = [
          'residency_credits',
          'max_transfer_credits', 
          'max_ace_nccrs_credits',
          'accepts_clep',
          'accepts_dsst',
          'accepts_ap',
          'accepts_ace',
          'accepts_nccrs',
        ];
        
        const earlyDiffRows: Array<{
          run_id: string;
          institution: string;
          field_name: string;
          old_value: unknown;
          new_value: unknown;
          old_confidence: number | null;
          new_confidence: number | null;
          action: string;
        }> = [];
        
        for (const field of fieldsToCompare) {
          const oldVal = oldData[field];
          const newVal = policyData[field as keyof typeof policyData];
          
          let action: string;
          if (oldVal === undefined && newVal !== undefined) {
            action = 'added';
          } else if (oldVal !== undefined && newVal === undefined) {
            action = 'removed';
          } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            action = 'updated';
          } else {
            action = 'unchanged';
          }
          
          earlyDiffRows.push({
            run_id,
            institution,
            field_name: field,
            old_value: oldVal ?? null,
            new_value: newVal ?? null,
            old_confidence: oldConfidence,
            new_confidence: totalScore,
            action,
          });
        }
        
        if (earlyDiffRows.length > 0) {
          const { error: diffError } = await supabase
            .from('policy_refresh_diffs')
            .insert(earlyDiffRows);
          
          if (diffError) {
            console.error('[merge] Error writing early diffs:', diffError);
          } else {
            earlyDiffsWritten = earlyDiffRows.length;
            console.log(`[merge] Wrote ${earlyDiffsWritten} early diffs for run ${run_id} (before pack creation check)`);
          }
        }
      }

      // HARD GUARDRAIL: Never create packs without BOTH numeric caps
      // This prevents "nil packs" that pollute data and confuse verification
      if (!hasBothNumericCaps) {
        console.log(`[merge] Skipping pack creation for program-scoped institution ${institution} (missing numeric caps)`);
        
        // Build extracted_values with evidence structure for verification queue
        const extractedValues: Record<string, unknown> = {};
        if (policyData.residency_credits) {
          extractedValues['residency_credits'] = {
            value: policyData.residency_credits,
            unit: 'credits',
            evidence_text: fieldProvenance['residency_policy.min_institutional_credits']?.source_text || null,
            evidence_url: fieldProvenance['residency_policy.min_institutional_credits']?.source_url || null,
            confidence: (fieldProvenance['residency_policy.min_institutional_credits']?.confidence || 0) / 100,
          };
        }
        if (policyData.max_transfer_credits) {
          extractedValues['max_transfer_credits'] = {
            value: policyData.max_transfer_credits,
            unit: 'credits',
            evidence_text: fieldProvenance['transfer_credit_limits.max_total_transfer_credits']?.source_text || null,
            evidence_url: fieldProvenance['transfer_credit_limits.max_total_transfer_credits']?.source_url || null,
            confidence: (fieldProvenance['transfer_credit_limits.max_total_transfer_credits']?.confidence || 0) / 100,
          };
        }

        // Only set requires_verification if we have at least one VALID numeric cap
        // Use the stricter residencyOk/maxTransferOk which validate numeric format
        // This prevents junk like "2024" or "1-800" from triggering false candidates
        const hasCapsCandidate = residencyOk || maxTransferOk;

        const residencyEvidence = extractedValues['residency_credits'] as { evidence_url?: string; evidence_text?: string } | undefined;
        const maxTransferEvidence = extractedValues['max_transfer_credits'] as { evidence_url?: string; evidence_text?: string } | undefined;
        
        const hasAnyEvidence =
          !!residencyEvidence?.evidence_url ||
          !!residencyEvidence?.evidence_text ||
          !!maxTransferEvidence?.evidence_url ||
          !!maxTransferEvidence?.evidence_text;

        // Determine status and reason based on what we have
        let findingStatus: string;
        let findingReason: string;
        
        // Check for partial caps scenario: max_transfer found with evidence, residency missing
        // This is the "likely_program_scoped" case - residency varies by program
        const hasMaxTransferWithEvidence = maxTransferOk && hasAnyEvidence && 
          !!(extractedValues['max_transfer_credits'] as { evidence_url?: string } | undefined)?.evidence_url;
        const hasResidencyWithEvidence = residencyOk && hasAnyEvidence &&
          !!(extractedValues['residency_credits'] as { evidence_url?: string } | undefined)?.evidence_url;
        
        // NEW: Check for policy-dense content (high keyword hits) without numeric caps
        // This indicates we're hitting the right pages but caps simply don't exist (program-scoped)
        const maxKeywordHits = precomputedSummary?.max_keyword_hits ?? 
          (url_diagnostics ? Math.max(0, ...url_diagnostics.map(d => d.keyword_hits || 0)) : 0);
        const okUrlsWithHighHits = (url_diagnostics || []).filter(
          d => d.content_class === 'ok' && (d.keyword_hits ?? 0) >= 10
        ).length;
        // Either: 2+ URLs with moderate hits (>=10) OR 1 URL with very high hits (>=20)
        const isPolicyDenseButNoCaps = !hasCapsCandidate && (
          (maxKeywordHits >= 10 && okUrlsWithHighHits >= 2) ||
          (maxKeywordHits >= 20)
        );
        
        // NEW: Check if we found scoped caps but no institution-wide caps
        // This is a distinct case: we DID extract numbers, but they're pathway/program-specific
        const hasOnlyScopedCaps = scopedCapsDetected && scopedCaps.length > 0 && !hasCapsCandidate;
        
        if (hasOnlyScopedCaps) {
          // Found numeric caps but they're all scoped (e.g., "79 credits for associate degree pathway")
          findingStatus = 'partial_verified';
          findingReason = 'only_scoped_caps_found';
        } else if (isPolicyDenseButNoCaps) {
          // High keyword density on 2+ OK pages, but no caps extracted = confirmed program-scoped
          findingStatus = 'partial_verified';
          findingReason = 'likely_program_scoped';
        } else if (!hasCapsCandidate) {
          findingStatus = 'skipped';
          findingReason = 'missing_numeric_caps';
        } else if (!hasAnyEvidence) {
          findingStatus = 'missing_evidence';
          findingReason = 'evidence_not_captured';
        } else if (hasMaxTransferWithEvidence && !residencyOk) {
          // Max transfer found + evidence, but no residency → likely program-scoped residency
          findingStatus = 'partial_verified';
          findingReason = 'likely_program_scoped';
        } else if (hasResidencyWithEvidence && !maxTransferOk) {
          // Residency found + evidence, but no max transfer → partial, needs template refinement
          findingStatus = 'partial_verified';
          findingReason = 'partial_caps_need_verification';
        } else if (scope === 'program') {
          findingStatus = 'insufficient_institution_level_policy';
          findingReason = 'program_scoped_no_institution_wide_numeric_caps';
        } else {
          findingStatus = 'pending_verification';
          findingReason = 'partial_caps_need_verification';
        }

        // Log to policy_scan_findings for auditability with verification fields
        const recommendation = findingReason === 'only_scoped_caps_found'
          ? 'scoped_caps_only_need_institution_wide_source'
          : findingReason === 'likely_program_scoped'
            ? (isPolicyDenseButNoCaps ? 'confirmed_program_scoped_no_institutional_caps' : 'residency_program_scoped')
            : findingReason === 'partial_caps_need_verification' && hasResidencyWithEvidence
              ? 'needs_transfer_template_refinement'
              : 'needs_catalog_or_program_selection';
        
        // Determine next step based on scenario
        const nextStep = findingReason === 'only_scoped_caps_found'
          ? 'add_institution_wide_policy_templates'
          : isPolicyDenseButNoCaps
            ? 'none_required_program_scoped_confirmed'
            : findingReason === 'likely_program_scoped'
              ? 'select_program_or_degree_catalog'
              : 'add_residency_specific_templates';

        await supabase.from('policy_scan_findings').insert({
          institution,
          academic_year: mergedPack.academic_year,
          status: findingStatus,
          reason: findingReason,
          urls_scanned: extractions.map(e => e.url),
          confidence_score: totalScore,
          requires_verification: hasCapsCandidate && hasAnyEvidence,
          extracted_values: extractedValues,
          details: {
            is_final: true, // CRITICAL: marks this as terminal merged finding, not intermediate
            extracted_policy_data: policyData,
            residency_ok: residencyOk,
            max_transfer_ok: maxTransferOk,
            has_max_transfer_evidence: hasMaxTransferWithEvidence,
            has_residency_evidence: hasResidencyWithEvidence,
            trust_tier: trustTier,
            action,
            has_caps_candidate: hasCapsCandidate,
            has_evidence: hasAnyEvidence,
            recommendation,
            next_step: nextStep,
            // Policy-dense detection metrics
            policy_dense_detection: {
              max_keyword_hits: maxKeywordHits,
              ok_urls_with_high_hits: okUrlsWithHighHits,
              is_policy_dense_but_no_caps: isPolicyDenseButNoCaps,
            },
            // Scoped caps detection (caps that apply to specific programs/pathways, not institution-wide)
            scoped_caps_detected: scopedCapsDetected,
            scoped_caps: scopedCaps,
            // Quick-access fields for debugging
            best_scoped_cap: scopedCaps.length > 0 ? scopedCaps[0] : null,
            scoped_caps_by_field: {
              max_transfer_credits: scopedCaps.filter(sc => sc.field === 'max_transfer_credits'),
              residency_credits: scopedCaps.filter(sc => sc.field === 'residency_credits'),
            },
            caps_found: {
              max_transfer_credits: maxTransferOk ? policyData.max_transfer_credits : null,
              residency_credits: residencyOk ? policyData.residency_credits : null,
            },
            caps_missing: [
              ...(residencyOk ? [] : ['residency_credits']),
              ...(maxTransferOk ? [] : ['max_transfer_credits']),
            ],
            // URL diagnostics for triage
            url_diagnostics: url_diagnostics || extractions.map(e => ({
              url: e.url,
              text_length: null,
              content_class: null,
              status: 'unknown',
            })),
            // Use precomputed summary if provided, otherwise compute from url_diagnostics
            diagnostic_summary: precomputedSummary || (url_diagnostics ? {
              total_urls: url_diagnostics.length,
              ok_count: url_diagnostics.filter(d => d.content_class === 'ok').length,
              too_short_count: url_diagnostics.filter(d => d.content_class === 'too_short').length,
              js_junk_count: url_diagnostics.filter(d => d.content_class === 'js_junk').length,
              error_page_count: url_diagnostics.filter(d => d.content_class === 'error_page').length,
              max_text_length: Math.max(0, ...url_diagnostics.filter(d => d.text_length).map(d => d.text_length || 0)),
              min_text_length: Math.min(...url_diagnostics.filter(d => d.text_length && d.text_length > 0).map(d => d.text_length || Infinity)) || 0,
              max_keyword_hits: Math.max(0, ...url_diagnostics.map(d => d.keyword_hits || 0)),
              best_policy_url: url_diagnostics
                .filter(d => d.content_class === 'ok' && (d.keyword_hits ?? 0) > 0)
                .sort((a, b) => (b.keyword_hits ?? 0) - (a.keyword_hits ?? 0))[0]?.url || null,
            } : null),
          },
        });

        console.log(`[merge] ${institution}: ${findingReason} - recommendation: ${recommendation}`);

        return new Response(
          JSON.stringify({
            ok: true,
            skipped_pack_creation: true,
            reason: findingReason,
            status: findingStatus,
            institution,
            academic_year: mergedPack.academic_year,
            confidence_score: totalScore,
            scope,
            caps_found: { residency: residencyOk, max_transfer: maxTransferOk },
            recommendation,
            diffs_written: earlyDiffsWritten, // P1 FIX: Include diffs even when pack skipped
            notes: [...notes, `Pack creation skipped: ${findingReason} (${recommendation})`],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build field_provenance with flat keys to match policy_data structure
      const flatProvenance: Record<string, unknown> = {};
      if (fieldProvenance['residency_policy.min_institutional_credits']) {
        flatProvenance['residency_credits'] = fieldProvenance['residency_policy.min_institutional_credits'];
      }
      if (fieldProvenance['transfer_credit_limits.max_total_transfer_credits']) {
        flatProvenance['max_transfer_credits'] = fieldProvenance['transfer_credit_limits.max_total_transfer_credits'];
      }
      // Copy other provenance entries with flattened keys
      for (const [key, value] of Object.entries(fieldProvenance)) {
        if (!key.includes('.')) {
          flatProvenance[key] = value;
        } else {
          // Flatten nested paths: credit_sources_accepted.clep -> accepts_clep
          const flatKey = key.replace('credit_sources_accepted.', 'accepts_')
                             .replace('institutional_course_requirements.', '')
                             .replace('transfer_credit_limits.max_ace_nccrs_credits', 'max_ace_nccrs_credits')
                             .replace('upper_level_requirements.min_upper_level_credits', 'min_upper_level_credits');
          if (!flatProvenance[flatKey]) {
            flatProvenance[flatKey] = value;
          }
        }
      }

      // Determine canonical provenance URL (GT source > first scrape URL)
      const canonicalProvenanceUrl = gt?.source_url || extractions[0]?.url || null;

      // Guardrail B: Explicit pack_scope based on institution scope
      // If institution is program-scoped, force pack_scope='program' to prevent false coverage
      const packScope = scope === 'program' ? 'program' : 'institution';
      
      // === DIFF WRITING FOR POLICY REFRESH PIPELINE ===
      // NOTE: Diffs already written early (before hasBothNumericCaps check)
      // Use earlyDiffsWritten for the count
      const diffsWritten = earlyDiffsWritten;

      const { data: packData, error: policyError } = await supabase
        .from('institution_policy_packs')
        .insert({
          institution,
          academic_year: mergedPack.academic_year,
          degree_level: 'undergraduate',
          pack_scope: packScope, // Guardrail B: explicit scope prevents WGU-style false coverage
          policy_json: mergedPack,  // Keep for back-compat / full structure
          policy_data: policyData,  // NEW: flat structure for trigger
          confidence_score: totalScore,
          last_verified_at: new Date().toISOString(),
          verification_source: 'transfer-scraper-merge',
          status: 'draft',  // ALWAYS draft - GATE -1 compliance
          effective_start: mergedPack.policy_effective_dates?.effective_start,
          merged_from_job_ids: scrape_job_ids,
          field_provenance: flatProvenance, // Flat keys for trigger
          provenance_url: canonicalProvenanceUrl, // NEW: canonical source URL
          last_run_id: run_id || null, // Track which run created this pack
        })
        .select('id')
        .single();

      if (policyError) {
        console.error('[merge] Error creating policy pack:', policyError);
      } else {
        policyPackId = packData.id;
        notes.push(`Created merged policy pack: ${packData.id}${diffsWritten > 0 ? ` (${diffsWritten} diffs written)` : ''}`);

        // Log merge audit for bulletproof provenance trail
        const { error: auditError } = await supabase
          .from('policy_merge_audit_log')
          .insert({
            policy_pack_id: policyData.id,
            institution,
            source_job_ids: scrape_job_ids,
            field_diffs: fieldDiffs,
            total_fields_checked: fieldDiffs.length,
            fields_overridden: fieldsOverridden,
            fields_matched: fieldsMatched,
            fields_missing_ground_truth: fieldsMissingGroundTruth,
            trust_tier: trustTier,
            critical_fields_verified: criticalFieldsVerified,
          });

        if (auditError) {
          console.error('[merge] Error logging audit:', auditError);
        } else {
          notes.push(`Audit log created: ${fieldsOverridden} overrides, ${fieldsMatched} matches`);
        }
        
        // === TERMINAL FINDING ON SUCCESS ===
        // Write terminal policy_scan_findings record for dashboard consistency
        const hasConflicts = (mergeResult.conflicts?.length ?? 0) > 0;
        const successStatus = hasConflicts ? 'partial_verified' : 'verified';
        const successReason = hasConflicts ? 'cross_source_disagreement' : 'caps_verified';
        
        const extractedValues: Record<string, unknown> = {
          max_transfer_credits: {
            value: policyData.max_transfer_credits,
            unit: 'credits',
            evidence_url: fieldProvenance['transfer_credit_limits.max_total_transfer_credits']?.source_url || null,
            confidence: (fieldProvenance['transfer_credit_limits.max_total_transfer_credits']?.confidence || 0) / 100,
          },
          residency_credits: {
            value: policyData.residency_credits,
            unit: 'credits',
            evidence_url: fieldProvenance['residency_policy.min_institutional_credits']?.source_url || null,
            confidence: (fieldProvenance['residency_policy.min_institutional_credits']?.confidence || 0) / 100,
          },
        };
        
        await supabase.from('policy_scan_findings').insert({
          institution,
          academic_year: mergedPack.academic_year,
          status: successStatus,
          reason: successReason,
          urls_scanned: extractions.map(e => e.url),
          confidence_score: totalScore,
          requires_verification: hasConflicts,
          extracted_values: extractedValues,
          details: {
            is_final: true, // CRITICAL: terminal finding
            policy_pack_id: packData.id,
            extracted_policy_data: policyData,
            residency_ok: true,
            max_transfer_ok: true,
            trust_tier: trustTier,
            action,
            // Conflicts for disagreement handling
            conflicts: mergeResult.conflicts || [],
            has_conflicts: hasConflicts,
            // Scoped caps (pathway-specific numbers)
            scoped_caps_detected: mergeResult.scopedCapsDetected,
            scoped_caps: mergeResult.scopedCaps,
            // URL diagnostics for triage
            url_diagnostics: url_diagnostics,
            diagnostic_summary: precomputedSummary,
          },
        });
        
        console.log(`[merge] Terminal finding written: ${successStatus}/${successReason}, conflicts=${hasConflicts}`);
      }
    }

    const result: MergeResult = {
      success: true,
      merged_policy_pack: mergedPack,
      merged_provider_rules: mergedRules,
      confidence,
      total_score: totalScore,
      action,
      merge_notes: notes,
      sources_used: sources,
      field_provenance: fieldProvenance,
      trust_tier: trustTier,
    };

    console.log(`[merge] Complete: score=${totalScore}, action=${action}, trust=${trustTier}, overrides=${fieldsOverridden}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[merge] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
