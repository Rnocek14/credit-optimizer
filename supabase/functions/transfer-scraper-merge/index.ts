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

interface MergeRequest {
  institution: string;
  scrape_job_ids: string[];
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
    final_value: unknown;
    overrode_value?: unknown;
    overrode_at?: string;
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
}

function selectBestValueWithVoting<T>(
  candidates: ValueCandidate<T>[],
  fieldPath: string,
  valueToString: (v: T) => string = (v) => String(v)
): SourcedValue<T> | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    return { value: candidates[0].value, sourceJobId: candidates[0].sourceJobId, confidence: candidates[0].confidence };
  }

  // Group by value and sum confidence scores with URL bonuses
  const valueScores = new Map<string, { value: T; total: number; count: number; bestSource: string; bestConfidence: number }>();
  
  for (const c of candidates) {
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
      }
    } else {
      valueScores.set(key, { 
        value: c.value, 
        total: adjustedConfidence, 
        count: 1, 
        bestSource: c.sourceJobId,
        bestConfidence: adjustedConfidence
      });
    }
  }

  // Pick value with highest weighted score (including consensus bonus)
  let best: { value: T; score: number; source: string } | null = null;
  
  for (const [, data] of valueScores) {
    // Consensus bonus: +15 per additional source agreeing (up to +45)
    const consensusBonus = Math.min(45, (data.count - 1) * 15);
    const finalScore = data.total + consensusBonus;
    
    if (!best || finalScore > best.score) {
      best = { value: data.value, score: finalScore, source: data.bestSource };
    }
  }

  return best ? { value: best.value, sourceJobId: best.source, confidence: best.score } : null;
}

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
  return selectBestValueWithVoting(candidates, fieldPath, valueToString);
}

// -----------------------------------------------------------------------------
// MERGE POLICY PACKS
// -----------------------------------------------------------------------------

function mergePolicyPacks(
  institution: string,
  extractions: { jobId: string; extraction: ExtractionResult; url: string }[]
): { mergedPack: PolicyPack | null; sources: string[]; notes: string[] } {
  const notes: string[] = [];
  const sources: string[] = [];
  
  const validExtractions = extractions.filter(e => e.extraction.policy_pack);
  if (validExtractions.length === 0) {
    return { mergedPack: null, sources, notes: ['No valid policy packs to merge'] };
  }

  // Pick best values for each field with field-specific URL bonuses
  const residencyCredits = pickBestValue(validExtractions, p => p.residency_policy?.min_institutional_credits, 'residency.min_institutional_credits');
  const residencyWaiver = pickBestValue(validExtractions, p => p.residency_policy?.residency_waiver_available, 'residency.waiver');
  const maxTransfer = pickBestValue(validExtractions, p => p.transfer_credit_limits?.max_total_transfer_credits, 'transfer.max_total');
  const maxAceNccrs = pickBestValue(validExtractions, p => p.transfer_credit_limits?.max_ace_nccrs_credits, 'transfer.ace_nccrs');
  const academicYear = pickBestValue(validExtractions, p => p.academic_year, 'academic_year');
  
  // Track sources used
  const usedSources = new Set<string>();
  [residencyCredits, residencyWaiver, maxTransfer, maxAceNccrs, academicYear]
    .filter(v => v)
    .forEach(v => v && usedSources.add(v.sourceJobId));
  
  sources.push(...usedSources);

  // Get first valid pack as base
  const basePack = validExtractions[0].extraction.policy_pack!;

  // Build merged pack
  const mergedPack: PolicyPack = {
    institution,
    academic_year: academicYear?.value || basePack.academic_year,
    residency_policy: {
      min_institutional_credits: residencyCredits?.value ?? basePack.residency_policy?.min_institutional_credits ?? null,
      residency_waiver_available: residencyWaiver?.value ?? basePack.residency_policy?.residency_waiver_available ?? false,
      waiver_name: basePack.residency_policy?.waiver_name,
      waiver_notes: basePack.residency_policy?.waiver_notes,
    },
    transfer_credit_limits: {
      max_total_transfer_credits: maxTransfer?.value ?? basePack.transfer_credit_limits?.max_total_transfer_credits ?? null,
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
    notes.push(`Residency: ${residencyCredits.value} credits (weighted score: ${residencyCredits.confidence})`);
  }

  return { mergedPack, sources, notes };
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
    const { institution, scrape_job_ids } = body;

    if (!institution || !scrape_job_ids?.length) {
      return new Response(
        JSON.stringify({ error: 'institution and scrape_job_ids are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[merge] Starting merge for ${institution} with ${scrape_job_ids.length} jobs`);

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

    console.log(`[merge] Found ${extractions.length} valid extractions`);

    // Merge policy packs
    const { mergedPack, sources, notes } = mergePolicyPacks(institution, extractions);
    
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
        
        // Mark all fields as AI extraction
        fieldProvenance['residency_policy.min_institutional_credits'] = {
          source: 'ai_extraction',
          final_value: mergedPack.residency_policy?.min_institutional_credits,
        };
        fieldProvenance['transfer_credit_limits.max_total_transfer_credits'] = {
          source: 'ai_extraction',
          final_value: mergedPack.transfer_credit_limits?.max_total_transfer_credits,
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

      // Check if we have required numeric fields (both required for program-scoped)
      const residency = policyData.residency_credits;
      const maxTransfer = policyData.max_transfer_credits;
      const residencyOk = residency != null && /^\d+$/.test(residency);
      const maxTransferOk = maxTransfer != null && /^\d+$/.test(maxTransfer);
      const hasBothNumericCaps = residencyOk && maxTransferOk;

      // Skip pack creation for program-scoped institutions without BOTH numeric caps
      if (scope === 'program' && !hasBothNumericCaps) {
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

        // Only set requires_verification if we have at least one extractable value WITH evidence
        // Otherwise it's not actionable and shouldn't clutter the verification queue
        const hasAnyCandidate = 
          policyData.residency_credits != null || 
          policyData.max_transfer_credits != null;

        const residencyEvidence = extractedValues['residency_credits'] as { evidence_url?: string; evidence_text?: string } | undefined;
        const maxTransferEvidence = extractedValues['max_transfer_credits'] as { evidence_url?: string; evidence_text?: string } | undefined;
        
        const hasAnyEvidence =
          !!residencyEvidence?.evidence_url ||
          !!residencyEvidence?.evidence_text ||
          !!maxTransferEvidence?.evidence_url ||
          !!maxTransferEvidence?.evidence_text;

        // Determine status based on what we have
        const findingStatus = hasAnyCandidate && !hasAnyEvidence 
          ? 'missing_evidence' 
          : 'insufficient_institution_level_policy';
        const findingReason = hasAnyCandidate && !hasAnyEvidence
          ? 'evidence_not_captured'
          : 'program_scoped_no_institution_wide_numeric_caps';

        // Log to policy_scan_findings for auditability with verification fields
        await supabase.from('policy_scan_findings').insert({
          institution,
          academic_year: mergedPack.academic_year,
          status: findingStatus,
          reason: findingReason,
          urls_scanned: scrapeJobs.map(j => j.url),
          confidence_score: totalScore,
          requires_verification: hasAnyCandidate && hasAnyEvidence,
          extracted_values: extractedValues,
          details: {
            extracted_policy_data: policyData,
            residency_ok: residencyOk,
            max_transfer_ok: maxTransferOk,
            trust_tier: trustTier,
            action,
            has_candidate: hasAnyCandidate,
            has_evidence: hasAnyEvidence,
          },
        });

        return new Response(
          JSON.stringify({
            ok: true,
            skipped_pack_creation: true,
            reason: 'program_scoped_no_institution_wide_numeric_caps',
            institution,
            academic_year: mergedPack.academic_year,
            confidence_score: totalScore,
            notes: [...notes, 'Pack creation skipped: program-scoped institution requires program-level URLs'],
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
      const canonicalProvenanceUrl = gt?.source_url || scrapeJobs[0]?.url || null;

      const { data: packData, error: policyError } = await supabase
        .from('institution_policy_packs')
        .insert({
          institution,
          academic_year: mergedPack.academic_year,
          degree_level: 'undergraduate',
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
        })
        .select('id')
        .single();

      if (policyError) {
        console.error('[merge] Error creating policy pack:', policyError);
      } else {
        policyPackId = packData.id;
        notes.push(`Created merged policy pack: ${packData.id}`);

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
