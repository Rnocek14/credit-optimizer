// =============================================================================
// TRANSFER-SCRAPER-AUTO-SCAN - One-Click Full Pipeline Orchestration
// =============================================================================
// This Edge Function runs the complete Crawl → Extract → Validate pipeline
// for all URLs in an institution's scrape_url_templates.
//
// Key behaviors:
// - Accepts { institution: 'TESU' }
// - Loads all URL templates for that institution
// - Creates/updates scrape_jobs for each URL
// - Runs pipeline sequentially (to avoid rate limits)
// - Returns summary with per-URL results
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import OpenAI from 'https://esm.sh/openai@4.67.3?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------

interface AutoScanRequest {
  institution: string;
}

interface UrlTemplate {
  id: string;
  institution_code: string;
  url: string;
  page_type: string;
  priority: number;
}

interface UrlResult {
  url: string;
  page_type: string;
  status: 'success' | 'crawl_failed' | 'extract_failed' | 'validate_failed';
  scrape_job_id: string | null;
  confidence_score: number | null;
  action: string | null;
  error: string | null;
}

interface AutoScanResult {
  institution: string;
  total: number;
  succeeded: number;
  failed: number;
  results: UrlResult[];
}

// -----------------------------------------------------------------------------
// INLINE CRAWL LOGIC (adapted from transfer-scraper-crawl)
// -----------------------------------------------------------------------------

function detectSourceType(url: string): 'catalog' | 'policy' | 'degree' | 'partner' | 'faq' | 'marketing' {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('smartcatalog') || urlLower.includes('catalog')) return 'catalog';
  if (urlLower.includes('policy') || urlLower.includes('transfer-credit') || urlLower.includes('admissions')) return 'policy';
  if (urlLower.includes('program') || urlLower.includes('degree') || urlLower.includes('major')) return 'degree';
  if (urlLower.includes('partner') || urlLower.includes('articulation')) return 'partner';
  if (urlLower.includes('faq') || urlLower.includes('help') || urlLower.includes('questions')) return 'faq';
  return 'marketing';
}

function extractTextFromHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) return '';
    
    const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'noscript'];
    for (const selector of removeSelectors) {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el: any) => el.parentNode?.removeChild(el));
    }
    
    const main = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('.content') || doc.body;
    if (!main) return '';
    
    let text = main.textContent || '';
    text = text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    const lines = text.split('\n').filter(line => line.trim().length > 20);
    return lines.join('\n');
  } catch {
    return '';
  }
}

// deno-lint-ignore no-explicit-any
async function crawlUrl(supabase: any, url: string, institution: string, pageType: string): Promise<{ jobId: string; success: boolean; error?: string }> {
  const sourceType = detectSourceType(url);
  
  // Upsert scrape job
  const { data: existingJob } = await supabase
    .from('scrape_jobs')
    .select('id')
    .eq('url', url)
    .eq('institution', institution)
    .maybeSingle();

  let jobId: string;

  if (existingJob?.id) {
    await supabase
      .from('scrape_jobs')
      .update({
        source_type: sourceType,
        status: 'processing',
        last_attempt_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', existingJob.id);
    jobId = existingJob.id;
  } else {
    const { data: newJob, error } = await supabase
      .from('scrape_jobs')
      .insert({
        url,
        institution,
        job_type: pageType === 'transfer_policy' ? 'policy' : pageType,
        source_type: sourceType,
        status: 'processing',
        priority: 5,
      })
      .select('id')
      .single();
    
    if (error) return { jobId: '', success: false, error: error.message };
    jobId = newJob.id;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const extractedText = extractTextFromHtml(html);

    if (extractedText.length < 100) {
      throw new Error(`Text too short (${extractedText.length} chars)`);
    }

    // Upsert content
    const { data: existingContent } = await supabase
      .from('scraped_content')
      .select('id')
      .eq('scrape_job_id', jobId)
      .maybeSingle();

    if (existingContent?.id) {
      await supabase
        .from('scraped_content')
        .update({
          url,
          raw_html: html.slice(0, 500000),
          extracted_text: extractedText,
          source_type: sourceType,
          scraped_at: new Date().toISOString(),
          ai_extracted_data: null,
          confidence_breakdown: null,
          total_confidence_score: null,
          extracted_at: null,
        })
        .eq('id', existingContent.id);
    } else {
      await supabase
        .from('scraped_content')
        .insert({
          scrape_job_id: jobId,
          url,
          raw_html: html.slice(0, 500000),
          extracted_text: extractedText,
          source_type: sourceType,
        });
    }

    await supabase
      .from('scrape_jobs')
      .update({ status: 'completed', last_attempt_at: new Date().toISOString() })
      .eq('id', jobId);

    return { jobId, success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    await supabase
      .from('scrape_jobs')
      .update({ status: 'failed', error_message: error, last_attempt_at: new Date().toISOString() })
      .eq('id', jobId);
    return { jobId, success: false, error };
  }
}

// -----------------------------------------------------------------------------
// INLINE EXTRACT LOGIC (adapted from transfer-scraper-extract)
// -----------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured transfer credit policies from university documentation.
Extract ONLY explicitly stated information. Use null for ambiguous or missing data. Be conservative.`;

const EXTRACTION_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_transfer_policies",
      description: "Extract structured transfer credit policies",
      parameters: {
        type: "object",
        properties: {
          policy_pack: {
            type: "object",
            properties: {
              institution: { type: "string" },
              academic_year: { type: "string" },
              residency_policy: {
                type: "object",
                properties: {
                  min_institutional_credits: { type: ["number", "null"] },
                  residency_waiver_available: { type: "boolean" },
                },
              },
              transfer_credit_limits: {
                type: "object",
                properties: {
                  max_total_transfer_credits: { type: ["number", "null"] },
                  max_ace_nccrs_credits: { type: ["number", "null"] },
                },
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
                  portfolio_assessment: { type: "boolean" },
                },
              },
              institutional_course_requirements: {
                type: "object",
                properties: {
                  cornerstone_required: { type: "boolean" },
                  capstone_required: { type: "boolean" },
                },
              },
              upper_level_requirements: {
                type: "object",
                properties: {
                  min_upper_level_credits: { type: ["number", "null"] },
                  applies_to: { type: "string" },
                },
              },
              policy_effective_dates: {
                type: "object",
                properties: {
                  effective_start: { type: ["string", "null"] },
                },
              },
            },
          },
          provider_rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                provider_name: { type: "string" },
                provider_type: { type: "string" },
                acceptance_status: { type: "string" },
              },
            },
          },
          extraction_notes: { type: "array", items: { type: "string" } },
          ai_confidence: { type: "number" },
        },
        required: ["policy_pack", "provider_rules", "ai_confidence"],
      },
    },
  },
];

function getSourceAuthorityScore(sourceType: string): number {
  const scores: Record<string, number> = {
    catalog: 30, policy: 26, partner: 22, degree: 18, faq: 12, marketing: 5,
  };
  return scores[sourceType] || 10;
}

function analyzeLanguageCertainty(text: string): number {
  if (/\b(will accept|required|must have|mandatory)\b/i.test(text)) return 20;
  if (/\b(accepts up to|limited to|maximum of)\b/i.test(text)) return 16;
  if (/\b(generally accepts|typically)\b/i.test(text)) return 12;
  if (/\b(may accept|subject to review)\b/i.test(text)) return 6;
  return 10;
}

// deno-lint-ignore no-explicit-any
async function extractFromJob(supabase: any, openai: OpenAI, jobId: string): Promise<{ success: boolean; totalScore: number; action: string; error?: string }> {
  const { data: content, error } = await supabase
    .from('scraped_content')
    .select('id, extracted_text, source_type, scrape_jobs: scrape_job_id ( institution )')
    .eq('scrape_job_id', jobId)
    .maybeSingle();

  if (error || !content?.extracted_text) {
    return { success: false, totalScore: 0, action: 'hold', error: 'No content found' };
  }

  const text = content.extracted_text.slice(0, 15000);
  const sourceType = content.source_type || 'policy';
  const scrapeJob = content.scrape_jobs as { institution?: string } | null;
  const institution = scrapeJob?.institution || 'UNKNOWN';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: `Extract transfer policies for: ${institution}\nSource type: ${sourceType}\n\nTEXT:\n${text}` },
      ],
      tools: EXTRACTION_TOOLS,
      tool_choice: { type: 'function', function: { name: 'extract_transfer_policies' } },
      temperature: 0.1,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No extraction response');

    const extracted = JSON.parse(toolCall.function.arguments);
    const aiConfidence = Math.min(5, extracted.ai_confidence || 3);

    const confidence = {
      source_authority: getSourceAuthorityScore(sourceType),
      language_certainty: analyzeLanguageCertainty(text),
      cross_source_agreement: 10,
      recency: 12,
      structural_consistency: extracted.policy_pack ? 8 : 4,
      ai_certainty: aiConfidence,
    };

    const totalScore = Object.values(confidence).reduce((a, b) => a + b, 0);
    const action = totalScore >= 85 ? 'auto_approve' : totalScore >= 60 ? 'human_review' : 'hold';

    const result = {
      policy_pack: extracted.policy_pack,
      provider_rules: extracted.provider_rules || [],
      confidence,
      total_score: totalScore,
      action,
      extraction_notes: extracted.extraction_notes || [],
    };

    await supabase
      .from('scraped_content')
      .update({
        ai_extracted_data: result,
        extraction_model: 'gpt-4o',
        extraction_prompt_version: 'v1.0',
        confidence_breakdown: confidence,
        total_confidence_score: totalScore,
        extracted_at: new Date().toISOString(),
      })
      .eq('scrape_job_id', jobId);

    await supabase
      .from('scrape_jobs')
      .update({ source_authority_score: confidence.source_authority })
      .eq('id', jobId);

    return { success: true, totalScore, action };
  } catch (e) {
    return { success: false, totalScore: 0, action: 'hold', error: e instanceof Error ? e.message : 'Extract failed' };
  }
}

// -----------------------------------------------------------------------------
// INLINE VALIDATE LOGIC (simplified from transfer-scraper-validate)
// -----------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
async function validateJob(supabase: any, jobId: string): Promise<{ success: boolean; action: string; error?: string }> {
  const { data: content } = await supabase
    .from('scraped_content')
    .select('ai_extracted_data')
    .eq('scrape_job_id', jobId)
    .maybeSingle();

  if (!content?.ai_extracted_data) {
    return { success: false, action: 'hold', error: 'No extraction data' };
  }

  // deno-lint-ignore no-explicit-any
  const result = content.ai_extracted_data as any;
  const action = result.action;

  if (action === 'auto_approve' && result.policy_pack) {
    // Publish policy pack
    await supabase
      .from('institution_policy_packs')
      .update({ status: 'superseded' })
      .eq('institution', result.policy_pack.institution)
      .eq('status', 'active');

    const { data: newPack } = await supabase
      .from('institution_policy_packs')
      .insert({
        institution: result.policy_pack.institution,
        academic_year: result.policy_pack.academic_year || '2024-2025',
        degree_level: 'undergraduate',
        policy_json: result.policy_pack,
        confidence_score: result.total_score,
        last_verified_at: new Date().toISOString(),
        verification_source: 'transfer-scraper-auto-scan',
        status: 'active',
        source_scrape_ids: [jobId],
      })
      .select('id')
      .single();

    // Publish provider rules
    for (const rule of result.provider_rules || []) {
      await supabase
        .from('credit_transfer_rules')
        .update({ status: 'deprecated' })
        .eq('target_institution', result.policy_pack.institution)
        .eq('source_institution', rule.provider_name)
        .eq('status', 'active');

      await supabase
        .from('credit_transfer_rules')
        .insert({
          source_institution: rule.provider_name,
          target_institution: result.policy_pack.institution,
          rule_type: 'provider_acceptance',
          acceptance_status: rule.acceptance_status === 'not_accepted' ? 'rejected' : 'accepted',
          rule_payload: rule,
          confidence: result.total_score / 100,
          last_verified_at: new Date().toISOString(),
          status: 'active',
        });
    }

    // Create evidence
    const { data: job } = await supabase.from('scrape_jobs').select('url').eq('id', jobId).single();
    if (newPack?.id) {
      await supabase.from('transfer_evidence').insert({
        policy_pack_id: newPack.id,
        evidence_type: 'url',
        evidence_url: job?.url,
        evidence_data: { scrape_job_id: jobId },
        captured_by: 'system',
      });
    }
  }

  return { success: true, action };
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

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

    const body: AutoScanRequest = await req.json();
    const { institution } = body;

    if (!institution) {
      return new Response(
        JSON.stringify({ error: 'institution is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load URL templates for this institution
    const { data: templates, error: templatesError } = await supabase
      .from('scrape_url_templates')
      .select('*')
      .eq('institution_code', institution)
      .order('priority', { ascending: false });

    if (templatesError || !templates?.length) {
      return new Response(
        JSON.stringify({ 
          error: 'No URL templates found', 
          institution,
          details: templatesError 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auto-scanning ${institution}: ${templates.length} URLs`);

    const results: UrlResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process each URL sequentially
    for (const template of templates as UrlTemplate[]) {
      const result: UrlResult = {
        url: template.url,
        page_type: template.page_type,
        status: 'success',
        scrape_job_id: null,
        confidence_score: null,
        action: null,
        error: null,
      };

      try {
        // Step 1: Crawl
        console.log(`Crawling: ${template.url}`);
        const crawlResult = await crawlUrl(supabase, template.url, institution, template.page_type);
        result.scrape_job_id = crawlResult.jobId;

        if (!crawlResult.success) {
          result.status = 'crawl_failed';
          result.error = crawlResult.error || 'Crawl failed';
          failed++;
          results.push(result);
          continue;
        }

        // Step 2: Extract
        console.log(`Extracting: ${template.url}`);
        const extractResult = await extractFromJob(supabase, openai, crawlResult.jobId);

        if (!extractResult.success) {
          result.status = 'extract_failed';
          result.error = extractResult.error || 'Extract failed';
          failed++;
          results.push(result);
          continue;
        }

        result.confidence_score = extractResult.totalScore;
        result.action = extractResult.action;

        // Step 3: Validate (only if score warrants it)
        if (extractResult.action !== 'hold') {
          console.log(`Validating: ${template.url}`);
          const validateResult = await validateJob(supabase, crawlResult.jobId);

          if (!validateResult.success) {
            result.status = 'validate_failed';
            result.error = validateResult.error || 'Validate failed';
            failed++;
            results.push(result);
            continue;
          }

          result.action = validateResult.action;
        }

        succeeded++;
        results.push(result);

        // Small delay between URLs to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (e) {
        result.status = 'crawl_failed';
        result.error = e instanceof Error ? e.message : 'Unknown error';
        failed++;
        results.push(result);
      }
    }

    const scanResult: AutoScanResult = {
      institution,
      total: templates.length,
      succeeded,
      failed,
      results,
    };

    console.log(`Auto-scan complete: ${succeeded}/${templates.length} succeeded`);

    return new Response(
      JSON.stringify(scanResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-scan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
