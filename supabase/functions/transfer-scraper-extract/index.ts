// =============================================================================
// TRANSFER-SCRAPER-EXTRACT - AI-Powered Policy Extraction
// =============================================================================
// This Edge Function uses OpenAI GPT-4o with structured outputs to extract
// institution policies and provider rules from scraped content.
//
// Key behaviors:
// - Accepts a scrape_job_id or raw text
// - Classifies source authority
// - Extracts policy packs and provider rules
// - Returns structured JSON with confidence breakdown
// - Does NOT write to final tables (validator does that)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';
import OpenAI from 'https://esm.sh/openai@4.67.3?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------

interface ExtractionRequest {
  scrape_job_id?: string;
  raw_text?: string;
  source_type?: 'catalog' | 'policy' | 'degree' | 'partner' | 'faq' | 'marketing';
  institution?: string;
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
  source_authority: number;      // 0-30
  language_certainty: number;    // 0-20
  cross_source_agreement: number; // 0-20
  recency: number;               // 0-15
  structural_consistency: number; // 0-10
  ai_certainty: number;          // 0-5
}

interface ExtractionResult {
  policy_pack: PolicyPack | null;
  provider_rules: ProviderRule[];
  confidence: ConfidenceBreakdown;
  total_score: number;
  action: 'auto_approve' | 'human_review' | 'hold';
  extraction_notes: string[];
  raw_ai_response?: string;
}

// -----------------------------------------------------------------------------
// SOURCE AUTHORITY SCORING
// -----------------------------------------------------------------------------

function getSourceAuthorityScore(sourceType: string): number {
  const scores: Record<string, number> = {
    'catalog': 30,
    'policy': 26,
    'partner': 22,
    'degree': 18,
    'faq': 12,
    'marketing': 5,
  };
  return scores[sourceType] || 10;
}

// -----------------------------------------------------------------------------
// LANGUAGE CERTAINTY ANALYSIS
// -----------------------------------------------------------------------------

function analyzeLanguageCertainty(text: string): number {
  const certainPatterns = [
    { pattern: /\b(will accept|required|must have|mandatory)\b/gi, score: 20 },
    { pattern: /\b(accepts up to|limited to|maximum of)\b/gi, score: 16 },
    { pattern: /\b(generally accepts|typically)\b/gi, score: 12 },
    { pattern: /\b(may accept|subject to review|at discretion)\b/gi, score: 6 },
    { pattern: /\b(encouraged|recommended)\b/gi, score: 3 },
  ];
  
  let maxScore = 0;
  for (const { pattern, score } of certainPatterns) {
    if (pattern.test(text)) {
      maxScore = Math.max(maxScore, score);
    }
  }
  
  // Default to middle score if no patterns found
  return maxScore || 10;
}

// -----------------------------------------------------------------------------
// RECENCY SCORING (Enhancement 5)
// -----------------------------------------------------------------------------

function calculateRecencyScore(text: string, url: string): number {
  const currentYear = new Date().getFullYear();
  
  // Check for academic year patterns in text (e.g., "2024-2025")
  const yearMatch = text.match(/20(\d{2})-20(\d{2})/);
  if (yearMatch) {
    const endYear = parseInt('20' + yearMatch[2]);
    if (endYear >= currentYear) return 15;      // Current or future year
    if (endYear === currentYear - 1) return 12; // Last year
    if (endYear === currentYear - 2) return 8;  // Two years ago
    return 5;                                    // Older
  }
  
  // Check URL for catalog/year indicators
  if (url.includes('/current/')) return 15;
  if (url.includes(`/${currentYear}-${currentYear + 1}/`) || url.includes(`/${currentYear + 1}/`)) return 15;
  if (url.includes(`/${currentYear - 1}-${currentYear}/`) || url.includes(`/${currentYear}/`)) return 12;
  
  // Check for "updated" or "effective" dates in text
  const dateMatch = text.match(/(?:updated|effective|revised).*?(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+(\d{4})/i);
  if (dateMatch) {
    const year = parseInt(dateMatch[2]);
    if (year >= currentYear) return 15;
    if (year === currentYear - 1) return 12;
    return 8;
  }
  
  return 10; // Default
}

// -----------------------------------------------------------------------------
// OPENAI EXTRACTION PROMPT
// -----------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured transfer credit policies from university documentation.

Your task is to extract ONLY information that is EXPLICITLY stated in the text. Do NOT infer or assume values.

CRITICAL EXTRACTION RULES:

1. CREDIT SOURCES (credit_sources_accepted):
   - Set to TRUE if the page mentions accepting that credit type
   - Set to FALSE ONLY if the text explicitly says they do NOT accept it (e.g., "CLEP is not accepted")
   - Set to NULL if the credit type is not mentioned at all (unknown)
   - Most adult-friendly schools accept CLEP, DSST, AP - look carefully before marking false

2. RESIDENCY REQUIREMENTS (min_institutional_credits) - CRITICAL FIELD:
   ==========================================================================
   This is the number of credits students MUST complete AT the institution itself.
   This is NOT maximum transfer credits - it's the OPPOSITE concept.
   
   CORRECT INTERPRETATION:
   - "Students must complete at least 15 credits at TESU" → min_institutional_credits = 15
   - "A minimum of 15 credit hours of TESU coursework" → min_institutional_credits = 15
   - "15-credit residency requirement" → min_institutional_credits = 15
   - "Credits earned in residence" refers to institutional credits, not home location
   
   DO NOT CONFUSE WITH:
   - "Minimum 6 credits per term" → This is enrollment load, NOT residency
   - "6-credit minimum for financial aid" → Financial aid requirement, NOT residency
   - "Take at least 6 credits at a time" → Enrollment pace, NOT residency
   - Maximum transfer credits → Different field entirely
   
   COMMON RESIDENCY VALUES BY SCHOOL TYPE:
   - Traditional universities: 30-60 credits
   - Adult-friendly (TESU, WGU, Excelsior): 6-24 credits
   - If you see BOTH a small number (6) in enrollment context AND larger number (15) in residency context, use the LARGER one for residency
   
   When uncertain, look for phrases like "residency requirement", "institutional credits", "credits earned at [school name]"
   ==========================================================================

3. TRANSFER CREDIT LIMITS:
   - max_total_transfer_credits: Maximum credits accepted from ALL transfer sources combined
   - max_ace_nccrs_credits: Maximum credits from ACE/NCCRS specifically (often 90 credits)
   - These are SEPARATE limits - read carefully

4. EXAM CREDIT RECOGNITION - Look for these phrases:
   - "CLEP", "College-Level Examination Program"
   - "DSST", "DANTES", "Defense Activity for Non-Traditional Education Support"
   - "AP", "Advanced Placement"
   - "TECEP", "Thomas Edison Credit-by-Exam"
   - "examination credit", "credit by exam", "standardized exams"
   - "prior learning assessment", "portfolio assessment"

5. PROVIDER-SPECIFIC MENTIONS:
   - ACE (American Council on Education) - "ACE-evaluated", "ACE credit recommendations"
   - NCCRS (National College Credit Recommendation Service) - often mentioned with ACE
   - StraighterLine, Sophia, Study.com, Coursera - online course providers

IMPORTANT: It is better to return NULL for unknown values than to guess FALSE. A false value means "explicitly rejected", which is different from "not mentioned".

Extract conservatively but thoroughly.`;


const EXTRACTION_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_transfer_policies",
      description: "Extract structured transfer credit policies from university documentation",
      parameters: {
        type: "object",
        properties: {
          policy_pack: {
            type: "object",
            properties: {
              institution: { type: "string", description: "Institution code (e.g., TESU, WGU)" },
              academic_year: { type: "string", description: "Academic year (e.g., 2024-2025)" },
              residency_policy: {
                type: "object",
                properties: {
                  min_institutional_credits: { type: ["number", "null"] },
                  residency_waiver_available: { type: "boolean" },
                  waiver_name: { type: ["string", "null"] },
                  waiver_notes: { type: ["string", "null"] }
                },
                required: ["min_institutional_credits", "residency_waiver_available"]
              },
              transfer_credit_limits: {
                type: "object",
                properties: {
                  max_total_transfer_credits: { type: ["number", "null"] },
                  max_ace_nccrs_credits: { type: ["number", "null"] },
                  min_regionally_accredited_credits: { type: ["number", "null"] }
                },
                required: ["max_total_transfer_credits", "max_ace_nccrs_credits", "min_regionally_accredited_credits"]
              },
              credit_sources_accepted: {
                type: "object",
                properties: {
                  regionally_accredited: { type: "boolean" },
                  ace: { type: "boolean" },
                  nccrs: { type: "boolean" },
                  clep: { type: "boolean" },
                  dsst: { type: "boolean" },
                  ap: { type: "boolean" },
                  tecep: { type: "boolean" },
                  portfolio_assessment: { type: "boolean" }
                },
                required: ["regionally_accredited", "ace", "nccrs", "clep", "dsst", "ap", "tecep", "portfolio_assessment"]
              },
              institutional_course_requirements: {
                type: "object",
                properties: {
                  cornerstone_required: { type: "boolean" },
                  capstone_required: { type: "boolean" },
                  info_literacy_required: { type: "boolean" }
                },
                required: ["cornerstone_required", "capstone_required"]
              },
              upper_level_requirements: {
                type: "object",
                properties: {
                  min_upper_level_credits: { type: ["number", "null"] },
                  applies_to: { type: "string" }
                },
                required: ["min_upper_level_credits", "applies_to"]
              },
              policy_effective_dates: {
                type: "object",
                properties: {
                  effective_start: { type: ["string", "null"] },
                  effective_end: { type: ["string", "null"] }
                },
                required: ["effective_start"]
              }
            },
            required: ["institution", "academic_year", "residency_policy", "transfer_credit_limits", 
                       "credit_sources_accepted", "institutional_course_requirements", 
                       "upper_level_requirements", "policy_effective_dates"]
          },
          provider_rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                provider_name: { type: "string" },
                provider_type: { type: "string", enum: ["course", "exam", "portfolio"] },
                acceptance_status: { type: "string", enum: ["accepted", "accepted_with_limits", "not_accepted"] },
                credit_constraints: {
                  type: "object",
                  properties: {
                    max_credits: { type: ["number", "null"] },
                    counts_toward_ace_limit: { type: "boolean" },
                    counts_as_ra_credit: { type: "boolean" }
                  }
                },
                conditions: { type: "array", items: { type: "string" } }
              },
              required: ["provider_name", "provider_type", "acceptance_status"]
            }
          },
          extraction_notes: {
            type: "array",
            items: { type: "string" },
            description: "Notes about ambiguous or uncertain extractions"
          },
          ai_confidence: {
            type: "number",
            description: "AI's self-assessed confidence in extraction accuracy (0-5)"
          }
        },
        required: ["policy_pack", "provider_rules", "extraction_notes", "ai_confidence"],
        additionalProperties: false
      }
    }
  }
];

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

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

    const body: ExtractionRequest = await req.json();
    const { scrape_job_id, raw_text, source_type = 'policy', institution } = body;

    // Get text to extract from
    let textToExtract: string;
    let jobSourceType = source_type;
    let jobInstitution = institution;

    if (scrape_job_id) {
      // Load from scraped_content with proper relationship syntax
      const { data: content, error } = await supabase
        .from('scraped_content')
        .select('id, extracted_text, source_type, scrape_jobs: scrape_job_id ( institution, url )')
        .eq('scrape_job_id', scrape_job_id)
        .maybeSingle();

      if (error || !content) {
        return new Response(
          JSON.stringify({ error: 'Scraped content not found', details: error }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      textToExtract = content.extracted_text || '';
      jobSourceType = content.source_type || source_type;
      // Access the joined scrape_jobs data
      const scrapeJob = content.scrape_jobs as { institution?: string; url?: string } | null;
      jobInstitution = scrapeJob?.institution || institution;
    } else if (raw_text) {
      textToExtract = raw_text;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either scrape_job_id or raw_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!textToExtract || textToExtract.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Text too short for meaningful extraction', length: textToExtract?.length || 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate to avoid token limits (roughly 15k chars = 4k tokens)
    const truncatedText = textToExtract.slice(0, 15000);

    // Calculate pre-extraction confidence components
    const sourceAuthority = getSourceAuthorityScore(jobSourceType);
    const languageCertainty = analyzeLanguageCertainty(truncatedText);

    // Call OpenAI with structured extraction
    console.log(`Extracting from ${truncatedText.length} chars for ${jobInstitution}`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Extract transfer credit policies for institution: ${jobInstitution || 'UNKNOWN'}

Source type: ${jobSourceType}
Academic year: Determine from content, default to 2024-2025

TEXT TO EXTRACT FROM:
${truncatedText}`
        }
      ],
      tools: EXTRACTION_TOOLS,
      tool_choice: { type: 'function', function: { name: 'extract_transfer_policies' } },
      temperature: 0.1, // Low temperature for consistent extraction
    });

    // Parse the tool call response
    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_transfer_policies') {
      return new Response(
        JSON.stringify({ error: 'AI did not return expected extraction', response }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const aiConfidence = Math.min(5, Math.max(0, extracted.ai_confidence || 3));

    // Get URL for recency scoring
    let sourceUrl = '';
    if (scrape_job_id) {
      const { data: jobData } = await supabase
        .from('scrape_jobs')
        .select('url')
        .eq('id', scrape_job_id)
        .single();
      sourceUrl = jobData?.url || '';
    }

    // Calculate dynamic recency score
    const recencyScore = calculateRecencyScore(truncatedText, sourceUrl);

    // Build confidence breakdown
    const confidenceBreakdown: ConfidenceBreakdown = {
      source_authority: sourceAuthority,
      language_certainty: languageCertainty,
      cross_source_agreement: 10, // Default - merge function will recalculate with multi-source
      recency: recencyScore,
      structural_consistency: extracted.policy_pack ? 8 : 4,
      ai_certainty: aiConfidence,
    };

    const totalScore = Object.values(confidenceBreakdown).reduce((a, b) => a + b, 0);
    const action = totalScore >= 85 ? 'auto_approve' : totalScore >= 60 ? 'human_review' : 'hold';

    const result: ExtractionResult = {
      policy_pack: extracted.policy_pack,
      provider_rules: extracted.provider_rules || [],
      confidence: confidenceBreakdown,
      total_score: totalScore,
      action,
      extraction_notes: extracted.extraction_notes || [],
      raw_ai_response: toolCall.function.arguments,
    };

    // Update scraped_content with extraction results if we have a job ID
    // NOTE: Don't change scrape_jobs.status here - crawl already set it to 'completed'
    if (scrape_job_id) {
      await supabase
        .from('scraped_content')
        .update({
          ai_extracted_data: result,
          extraction_model: 'gpt-4o',
          extraction_prompt_version: 'v1.0',
          confidence_breakdown: confidenceBreakdown,
          total_confidence_score: totalScore,
          extracted_at: new Date().toISOString(),
        })
        .eq('scrape_job_id', scrape_job_id);

      // Only update source_authority_score, don't overwrite status (crawl set it)
      await supabase
        .from('scrape_jobs')
        .update({ 
          source_authority_score: sourceAuthority,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', scrape_job_id);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
