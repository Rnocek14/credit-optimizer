// =============================================================================
// GENERATE-TRANSFER-RULES — AI-Powered Course-Level Equivalency Extraction
// =============================================================================
// Reads scraped equivalency page content (or raw text) and uses AI to generate
// structured transfer rules with confidence scores.
//
// Inputs:
//   - target_institution: e.g. "TESU"
//   - source_institution: e.g. "SOPHIA" (optional — AI will infer from text)
//   - scrape_job_id: fetch content from scraped_content table
//   - raw_text: alternative to scrape_job_id
//   - evidence_url: URL of the equivalency page
//   - auto_promote_threshold: confidence above which rules auto-promote (default 0.85)
//
// Output: { batch_id, candidates: [...], promoted_count, pending_count }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GenerateRequest {
  target_institution: string;
  source_institution?: string;
  scrape_job_id?: string;
  raw_text?: string;
  evidence_url?: string;
  auto_promote_threshold?: number;
}

interface ExtractedRule {
  source_institution: string;
  source_course_code: string;
  source_course_title: string;
  target_course_code: string | null;
  target_course_title: string | null;
  acceptance_status: 'accepted' | 'elective' | 'rejected';
  confidence: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// AI EXTRACTION PROMPT
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert at extracting course-level transfer equivalency rules from university documentation.

Your task: Given text from a university's transfer/equivalency page, extract EVERY course-to-course mapping you can find.

RULES:
1. Extract ONLY mappings explicitly stated in the text. Do NOT infer or guess.
2. Each mapping should include:
   - source_institution: The sending institution/provider (e.g., "SOPHIA", "STUDYCOM", "CLEP", "STRAIGHTERLINE")
   - source_course_code: The course code at the source (e.g., "CS1101", "BUS101", "CALCULUS")
   - source_course_title: The course title at the source
   - target_course_code: The equivalent course at the target university (null if "free elective")
   - target_course_title: The equivalent course title at the target (null if unknown)
   - acceptance_status: "accepted" (direct equivalent), "elective" (accepted as elective only), or "rejected"
   - confidence: 0.0-1.0 based on how clearly the mapping is stated
   - reasoning: Brief explanation of why you assigned this status and confidence

3. Normalize provider names:
   - "Sophia Learning" / "Sophia.org" → "SOPHIA"
   - "Study.com" → "STUDYCOM"  
   - "StraighterLine" → "STRAIGHTERLINE"
   - "CLEP" stays "CLEP"
   - "DSST" / "DANTES" → "DSST"
   - "AP" stays "AP"
   - "Saylor Academy" → "SAYLOR"

4. For course codes, use the provider's own code format (e.g., "CS1101" not "CS-1101").

5. Confidence scoring:
   - 0.95: Explicit table with clear 1:1 mapping
   - 0.85: Mentioned in text with clear equivalency language
   - 0.70: Implied but not in a formal table
   - 0.50: Ambiguous or conditional

Return a JSON array of extracted rules. If no rules found, return an empty array.`;

function buildUserPrompt(req: GenerateRequest, text: string): string {
  let prompt = `Extract all course-level transfer equivalency rules from the following content.\n\n`;
  prompt += `Target Institution: ${req.target_institution}\n`;
  if (req.source_institution) {
    prompt += `Expected Source Institution: ${req.source_institution}\n`;
  }
  if (req.evidence_url) {
    prompt += `Source URL: ${req.evidence_url}\n`;
  }
  prompt += `\n--- CONTENT ---\n${text.slice(0, 15000)}\n--- END ---`;
  return prompt;
}

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------

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

    // Auth: accept cron secret OR user JWT
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      // cron auth OK
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { error } = await supabase.auth.getUser(token);
      if (error) throw new Error('Unauthorized');
    } else {
      throw new Error('Missing authentication');
    }

    const body: GenerateRequest = await req.json();
    const { target_institution, source_institution, auto_promote_threshold = 0.85 } = body;

    if (!target_institution) {
      throw new Error('target_institution is required');
    }

    // Get text content
    let text = body.raw_text || '';
    let evidenceUrl = body.evidence_url || '';

    if (body.scrape_job_id && !text) {
      const { data: scrapeData, error: scrapeErr } = await supabase
        .from('scraped_content')
        .select('raw_text, url, ai_extracted_data')
        .eq('scrape_job_id', body.scrape_job_id)
        .limit(1)
        .maybeSingle();

      if (scrapeErr) throw scrapeErr;
      if (!scrapeData?.raw_text) throw new Error('No scraped content found for job');
      text = scrapeData.raw_text;
      evidenceUrl = evidenceUrl || scrapeData.url || '';
    }

    if (!text || text.length < 50) {
      throw new Error('Insufficient text content for extraction');
    }

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    let extractedRules: ExtractedRule[] = [];

    if (LOVABLE_API_KEY) {
      extractedRules = await callLovableAI(body, text, LOVABLE_API_KEY);
    } else if (OPENAI_API_KEY) {
      extractedRules = await callOpenAI(body, text, OPENAI_API_KEY);
    } else {
      throw new Error('No AI API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)');
    }

    console.log(`🤖 AI extracted ${extractedRules.length} rules for ${target_institution}`);

    if (extractedRules.length === 0) {
      return jsonOk({ batch_id: null, candidates: [], promoted_count: 0, pending_count: 0 });
    }

    // Generate batch ID
    const batchId = crypto.randomUUID();

    // Check for existing rules to avoid duplicates
    const { data: existingRules } = await supabase
      .from('credit_transfer_rules')
      .select('source_institution, source_course_code, target_institution')
      .eq('target_institution', target_institution.toUpperCase());

    const existingKeys = new Set(
      (existingRules || []).map((r: any) =>
        `${r.source_institution}|${r.source_course_code}|${r.target_institution}`
      )
    );

    // Also check existing candidates
    const { data: existingCandidates } = await supabase
      .from('transfer_rule_candidates')
      .select('source_institution, source_course_code, target_institution, status')
      .eq('target_institution', target_institution.toUpperCase())
      .not('status', 'in', '("rejected","duplicate")');

    const existingCandidateKeys = new Set(
      (existingCandidates || []).map((r: any) =>
        `${r.source_institution}|${r.source_course_code}|${r.target_institution}`
      )
    );

    // Prepare candidates
    const candidates = extractedRules.map(rule => {
      const src = (rule.source_institution || source_institution || 'UNKNOWN').toUpperCase();
      const key = `${src}|${rule.source_course_code}|${target_institution.toUpperCase()}`;
      let status = 'pending';
      if (existingKeys.has(key)) status = 'duplicate';
      else if (existingCandidateKeys.has(key)) status = 'duplicate';

      return {
        source_institution: src,
        source_course_code: rule.source_course_code,
        source_course_title: rule.source_course_title || null,
        target_institution: target_institution.toUpperCase(),
        target_course_code: rule.target_course_code || null,
        target_course_title: rule.target_course_title || null,
        acceptance_status: rule.acceptance_status,
        confidence_score: Math.round(rule.confidence * 1000) / 1000,
        evidence_url: evidenceUrl || null,
        evidence_text: rule.reasoning || null,
        rule_source: 'ai_extraction',
        ai_model: LOVABLE_API_KEY ? 'gemini-3-flash-preview' : 'gpt-4o',
        batch_id: batchId,
        status,
      };
    });

    // Insert candidates
    const { error: insertErr } = await supabase
      .from('transfer_rule_candidates')
      .insert(candidates);

    if (insertErr) {
      console.error('Insert error:', insertErr);
      throw new Error(`Failed to insert candidates: ${insertErr.message}`);
    }

    // V2: Instead of auto-promoting directly, trigger the validation layer
    // The validation layer will check catalog matches, format validity,
    // and only promote rules that pass all checks.
    const pendingCandidates = candidates.filter(c => c.status === 'pending');
    const duplicateCount = candidates.filter(c => c.status === 'duplicate').length;

    let validationResult: any = null;
    let promotedCount = 0;

    if (pendingCandidates.length > 0) {
      try {
        // Call validate-transfer-candidates internally
        const validateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-transfer-candidates`;
        const cronSecret = Deno.env.get('CRON_SECRET');

        const valResponse = await fetch(validateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cronSecret ? { 'x-cron-secret': cronSecret } : {}),
          },
          body: JSON.stringify({
            batch_id: batchId,
            auto_promote_threshold,
          }),
        });

        if (valResponse.ok) {
          validationResult = await valResponse.json();
          promotedCount = validationResult.promoted || 0;
          console.log(`✅ Validation layer: ${validationResult.validated} validated, ${promotedCount} promoted, ${validationResult.flagged} flagged`);
        } else {
          const errText = await valResponse.text();
          console.warn(`⚠️ Validation layer returned ${valResponse.status}: ${errText}`);
          console.log('Candidates remain pending for manual validation.');
        }
      } catch (valErr) {
        console.warn('⚠️ Validation layer call failed, candidates remain pending:', valErr);
      }
    }

    const pendingCount = pendingCandidates.length - promotedCount;

    console.log(`📊 Batch ${batchId}: ${candidates.length} total, ${promotedCount} promoted, ${pendingCount} pending, ${duplicateCount} duplicates`);

    return jsonOk({
      batch_id: batchId,
      candidates: candidates.map(c => ({
        source: `${c.source_institution} ${c.source_course_code}`,
        target: c.target_course_code || '(elective)',
        status: c.status,
        confidence: c.confidence_score,
        acceptance: c.acceptance_status,
      })),
      promoted_count: promotedCount,
      pending_count: pendingCount,
      duplicate_count: duplicateCount,
      total: candidates.length,
    });

  } catch (error) {
    console.error('generate-transfer-rules error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ---------------------------------------------------------------------------
// AI CALLERS
// ---------------------------------------------------------------------------

async function callLovableAI(req: GenerateRequest, text: string, apiKey: string): Promise<ExtractedRule[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(req, text) },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'extract_transfer_rules',
          description: 'Extract course-level transfer equivalency rules from university documentation',
          parameters: {
            type: 'object',
            properties: {
              rules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source_institution: { type: 'string' },
                    source_course_code: { type: 'string' },
                    source_course_title: { type: 'string' },
                    target_course_code: { type: 'string', nullable: true },
                    target_course_title: { type: 'string', nullable: true },
                    acceptance_status: { type: 'string', enum: ['accepted', 'elective', 'rejected'] },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    reasoning: { type: 'string' },
                  },
                  required: ['source_institution', 'source_course_code', 'source_course_title', 'acceptance_status', 'confidence', 'reasoning'],
                },
              },
            },
            required: ['rules'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'extract_transfer_rules' } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Lovable AI error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.warn('No tool call in AI response, trying message content');
    return parseJsonFromContent(data.choices?.[0]?.message?.content || '');
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.rules || [];
}

async function callOpenAI(req: GenerateRequest, text: string, apiKey: string): Promise<ExtractedRule[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(req, text) },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'extract_transfer_rules',
          description: 'Extract course-level transfer equivalency rules',
          parameters: {
            type: 'object',
            properties: {
              rules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source_institution: { type: 'string' },
                    source_course_code: { type: 'string' },
                    source_course_title: { type: 'string' },
                    target_course_code: { type: 'string' },
                    target_course_title: { type: 'string' },
                    acceptance_status: { type: 'string', enum: ['accepted', 'elective', 'rejected'] },
                    confidence: { type: 'number' },
                    reasoning: { type: 'string' },
                  },
                  required: ['source_institution', 'source_course_code', 'source_course_title', 'acceptance_status', 'confidence', 'reasoning'],
                },
              },
            },
            required: ['rules'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'extract_transfer_rules' } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return [];

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.rules || [];
}

function parseJsonFromContent(content: string): ExtractedRule[] {
  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch { /* ignore */ }
  return [];
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
