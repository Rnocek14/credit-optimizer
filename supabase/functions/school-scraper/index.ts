// School Policy Scraper - Rebuilt with proven patterns from restaurant scraper
// Deployment trigger: 2026-01-08 - fixes applied
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// User agents rotation for anti-bot evasion
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

// Helper to create clients inside handler (avoid cold-start crashes)
function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ============================================================================
// Robust Fetch with Retries, Timeout, and Anti-Bot Headers
// ============================================================================
async function fetchContent(
  url: string, 
  options: { timeout?: number } = {}
): Promise<{ html: string; error?: string }> {
  const { timeout = 10000 } = options;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Add delay between retries
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let referer = '';
      try { referer = new URL(url).origin; } catch {}

      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENTS[attempt % USER_AGENTS.length],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
          'Referer': referer,
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        if (html.length >= 1000) {
          return { html };
        }
        console.log(`Sparse content (${html.length} chars) from ${url}, retrying...`);
      } else if (res.status === 403 || res.status === 429) {
        console.log(`Got ${res.status} from ${url}, retrying with different UA...`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.log(`Attempt ${attempt + 1} failed for ${url}: ${e.message}`);
      if (attempt === 1) {
        return { html: '', error: e.message };
      }
    }
  }
  
  return { html: '', error: 'All fetch attempts failed' };
}

// ============================================================================
// DOM-based Content Extraction (replaces regex parsing)
// ============================================================================
function extractMainContent(html: string, maxLength = 50000): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return html.substring(0, maxLength);

  // Remove noise elements
  ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript', 'svg', 'form', 'button'].forEach(sel => {
    doc.querySelectorAll(sel).forEach((el: any) => el.parentNode?.removeChild(el));
  });

  // Try to find main content area
  const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.post', '.entry-content', '.catalog-content', '.page-content'];
  for (const selector of mainSelectors) {
    const main = doc.querySelector(selector);
    if (main?.textContent && main.textContent.length > 500) {
      return main.textContent.replace(/\s+/g, ' ').trim().substring(0, maxLength);
    }
  }

  return (doc.body?.textContent || "").replace(/\s+/g, ' ').trim().substring(0, maxLength);
}

// ============================================================================
// Batch Fetching with Rate Limiting
// ============================================================================
async function fetchPages(urls: string[]): Promise<{ url: string; text: string; error?: string }[]> {
  const results = [];
  
  for (const url of urls) {
    try {
      await new Promise(r => setTimeout(r, 500)); // 500ms between requests
      
      console.log(`Fetching: ${url}`);
      const { html, error } = await fetchContent(url);
      
      if (error) {
        results.push({ url, text: '', error });
        continue;
      }
      
      const text = extractMainContent(html);
      console.log(`Extracted ${text.length} chars from ${url}`);
      results.push({ url, text });
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      results.push({ url, text: '', error: (error as Error).message });
    }
  }
  
  return results;
}

// ============================================================================
// OpenAI Extraction Tool Schema
// ============================================================================
const extractionTool = {
  type: "function" as const,
  function: {
    name: "extract_institution_policy",
    description: "Extract institution transfer/graduation policies from scraped content",
    parameters: {
      type: "object",
      properties: {
        totalCreditsBachelor: {
          type: "object",
          properties: {
            value: { type: "integer" },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
            source_quote: { type: "string", maxLength: 300 },
            source_url: { type: "string" }
          },
          required: ["value", "confidence"]
        },
        totalCreditsAssociate: {
          type: "object",
          properties: {
            value: { type: "integer" },
            confidence: { type: "integer" },
            source_quote: { type: "string" },
            source_url: { type: "string" }
          },
          required: ["value", "confidence"]
        },
        maxCommunityCollege: {
          type: "object",
          properties: {
            value: { type: "integer" },
            confidence: { type: "integer" },
            source_quote: { type: "string" },
            source_url: { type: "string" }
          },
          required: ["value", "confidence"]
        },
        maxTransferTotal: {
          type: "object",
          properties: {
            value: { type: ["integer", "null"] },
            confidence: { type: "integer" },
            source_quote: { type: "string" },
            source_url: { type: "string" },
            reasoning: { type: "string" }
          },
          required: ["value", "confidence"]
        },
        noncollegiatePool: {
          type: "object",
          properties: {
            maxCreditsBachelor: {
              type: "object",
              properties: {
                value: { type: "integer" },
                confidence: { type: "integer" },
                source_quote: { type: "string" },
                verbatim_policy: { type: "string" }
              },
              required: ["value", "confidence"]
            },
            maxCreditsAssociate: {
              type: "object",
              properties: {
                value: { type: "integer" },
                confidence: { type: "integer" },
                source_quote: { type: "string" }
              },
              required: ["value", "confidence"]
            },
            includedProviders: {
              type: "object",
              properties: {
                value: { type: "array", items: { type: "string" } },
                confidence: { type: "integer" },
                source_quote: { type: "string" }
              },
              required: ["value", "confidence"]
            }
          },
          required: ["maxCreditsBachelor", "maxCreditsAssociate", "includedProviders"]
        },
        residencyOptions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              variant: { type: "string", enum: ["standard", "military", "accelerate"] },
              credits: { type: "integer" },
              fee: { type: ["integer", "null"] },
              notes: { type: "string" },
              confidence: { type: "integer" },
              source_quote: { type: "string" }
            },
            required: ["variant", "credits", "confidence"]
          }
        },
        upperDivisionAreaOfStudyMin: {
          type: "object",
          properties: {
            value: { type: "integer" },
            confidence: { type: "integer" },
            source_quote: { type: "string" }
          },
          required: ["value", "confidence"]
        },
        upperDivisionTotalMin: {
          type: "object",
          properties: {
            value: { type: ["integer", "null"] },
            confidence: { type: "integer" },
            source_quote: { type: "string" }
          },
          required: ["value", "confidence"]
        },
        genEdRequirements: {
          type: "object",
          properties: {
            WRITTEN_COMM: { type: "object", properties: { value: { type: "integer" }, confidence: { type: "integer" } } },
            ORAL_COMM: { type: "object", properties: { value: { type: "integer" }, confidence: { type: "integer" } } },
            QUANTITATIVE: { type: "object", properties: { value: { type: "integer" }, confidence: { type: "integer" } } },
            HUMANITIES: { type: "object", properties: { value: { type: "integer" }, confidence: { type: "integer" } } },
            SOCIAL_SCIENCE: { type: "object", properties: { value: { type: "integer" }, confidence: { type: "integer" } } },
            NATURAL_SCIENCE: { type: "object", properties: { value: { type: "integer" }, confidence: { type: "integer" } } },
            CIVIC_GLOBAL: { type: "object", properties: { value: { type: "integer" }, confidence: { type: "integer" } } }
          }
        },
        uncertainFields: {
          type: "array",
          items: { type: "string" },
          description: "List of fields where extraction was uncertain or conflicting"
        },
        overallConfidence: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description: "Overall confidence in the extraction quality"
        }
      },
      required: ["totalCreditsBachelor", "noncollegiatePool", "residencyOptions", "uncertainFields", "overallConfidence"]
    }
  }
};

const systemPrompt = `You are an expert at extracting academic institution transfer credit and graduation policies from official university documentation.

CRITICAL RULES:
1. Only extract values you find EXPLICITLY stated in the source text
2. If a value is implied but not explicit, set confidence 50-70 and explain in reasoning
3. If values conflict between sources, flag in uncertainFields and include both values in notes
4. Always include the exact source quote (max 300 chars) that supports your extraction
5. For numeric values, prefer catalog/official policy over marketing pages
6. Distinguish between "not mentioned" (confidence: 0) and "explicitly unlimited" (confidence: 95)

CONFIDENCE SCORING:
- 95-100: Explicit statement in official catalog/policy document
- 80-94: Explicit in FAQ or student resources page
- 60-79: Implied or calculated from other values
- 40-59: Mentioned but ambiguous or potentially outdated
- 0-39: Not found or highly uncertain

DOMAIN KNOWLEDGE:
- "Noncollegiate" typically means: ACE, NCCRS, CLEP, DSST, AP, Sophia, Study.com, TECEP, etc.
- "Residency" = credits that MUST be taken at the institution (not physical location)
- "Upper division" = typically 300-400 level courses
- Watch for different rules: Bachelor's vs Associate degrees
- "Standard" residency is the default path, "military" is for active duty/veterans, "accelerate" is for fast-track programs

INCLUDED PROVIDERS FORMAT:
When listing noncollegiate providers, use these exact codes: ACE, NCCRS, CLEP, DSST, AP, SOPHIA, STUDYCOM, TECEP, IB, DANTES

For each field, include the source_url from which you extracted the value if identifiable from the content.`;

// ============================================================================
// AI Extraction (Direct Fetch - No SDK)
// ============================================================================
async function extractWithAI(
  content: string, 
  institutionCode: string
): Promise<any> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');

  const apiKey = openaiKey || lovableKey;
  const apiUrl = openaiKey 
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://ai.gateway.lovable.dev/v1/chat/completions';

  if (!apiKey) {
    throw new Error('No AI API key configured (OPENAI_API_KEY or LOVABLE_API_KEY)');
  }

  console.log(`Calling AI for extraction (${content.length} chars, using ${openaiKey ? 'OpenAI' : 'Lovable AI'})`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openaiKey ? 'gpt-4o' : 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Extract the transfer credit and graduation policies for ${institutionCode} from the following scraped content:\n\n${content.slice(0, 100000)}` 
        },
      ],
      tools: [extractionTool],
      tool_choice: { type: 'function', function: { name: 'extract_institution_policy' } },
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    throw new Error('AI did not return structured extraction');
  }

  return JSON.parse(toolCall.function.arguments);
}

// ============================================================================
// Main Handler
// ============================================================================
serve(async (req) => {
  console.log(`[school-scraper] ${req.method} request received`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let currentJobId: string | null = null;
  let supabase: ReturnType<typeof getSupabaseClient> | null = null;

  try {
    // Parse request body first to check for ping
    let body: { action?: string; institutionCode?: string; customUrls?: string[]; jobId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is OK for ping
    }
    
    // Simple health check endpoint
    if (body.action === 'ping') {
      console.log('[school-scraper] Ping received - function is healthy');
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          message: 'school-scraper function is running'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize client inside handler to avoid cold-start crashes
    supabase = getSupabaseClient();
    
    const { institutionCode, customUrls, jobId } = body;

    if (!institutionCode) {
      return new Response(
        JSON.stringify({ error: 'institutionCode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting scrape for ${institutionCode}`);

    // Get URLs to scrape
    let urls: string[] = customUrls || [];
    
    if (urls.length === 0) {
      // Load from templates
      const { data: templates } = await supabase
        .from('scrape_url_templates')
        .select('url')
        .eq('institution_code', institutionCode)
        .order('priority', { ascending: true });
      
      urls = templates?.map((t: { url: string }) => t.url) || [];
    }

    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No URLs configured for this institution' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update job
    currentJobId = jobId || null;
    if (!currentJobId) {
      const { data: newJob, error: jobError } = await supabase
        .from('school_scrape_jobs')
        .insert({
          institution_code: institutionCode,
          target_urls: urls,
          status: 'scraping',
        })
        .select('id')
        .single();
      
      if (jobError) throw jobError;
      currentJobId = newJob.id;
    } else {
      await supabase
        .from('school_scrape_jobs')
        .update({ status: 'scraping' })
        .eq('id', currentJobId);
    }

    // Scrape pages
    const scrapedContent = await fetchPages(urls);
    
    // Update job with scraped content
    await supabase
      .from('school_scrape_jobs')
      .update({ 
        status: 'extracting',
        scraped_content: scrapedContent.map(s => ({
          url: s.url,
          text: s.text,
          error: s.error,
          fetchedAt: new Date().toISOString()
        }))
      })
      .eq('id', currentJobId);

    // Combine all text for AI extraction
    const combinedText = scrapedContent
      .filter(s => s.text)
      .map(s => `=== SOURCE: ${s.url} ===\n\n${s.text}`)
      .join('\n\n---\n\n');

    if (!combinedText) {
      await supabase
        .from('school_scrape_jobs')
        .update({ 
          status: 'failed',
          error_message: 'No content could be scraped from any URL'
        })
        .eq('id', currentJobId);
      
      return new Response(
        JSON.stringify({ error: 'No content scraped', jobId: currentJobId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI for extraction
    const extractedData = await extractWithAI(combinedText, institutionCode);
    const overallConfidence = extractedData.overallConfidence || 0;

    // Determine status based on confidence
    let status = 'review';
    if (overallConfidence >= 90) {
      status = 'completed'; // High confidence, ready for quick approval
    } else if (overallConfidence < 50) {
      status = 'failed'; // Too uncertain, needs manual research
    }

    // Update job with extraction
    await supabase
      .from('school_scrape_jobs')
      .update({ 
        status,
        extracted_data: extractedData,
        overall_confidence: overallConfidence,
      })
      .eq('id', currentJobId);

    // Store field-level extractions for review
    const fieldExtractions: Array<Record<string, unknown>> = [];
    
    // Helper to add field extraction
    const addField = (path: string, data: any, sourceUrl?: string) => {
      if (!data || typeof data !== 'object') return;
      fieldExtractions.push({
        job_id: currentJobId,
        field_path: path,
        extracted_value: data.value ?? data,
        confidence: data.confidence ?? 50,
        source_quote: data.source_quote || data.verbatim_policy || null,
        source_url: data.source_url || sourceUrl || null,
        review_status: (data.confidence ?? 50) >= 90 ? 'approved' : 'pending',
      });
    };

    // Extract all fields
    addField('totalCreditsBachelor', extractedData.totalCreditsBachelor);
    addField('totalCreditsAssociate', extractedData.totalCreditsAssociate);
    addField('maxCommunityCollege', extractedData.maxCommunityCollege);
    addField('maxTransferTotal', extractedData.maxTransferTotal);
    addField('noncollegiatePool.maxCreditsBachelor', extractedData.noncollegiatePool?.maxCreditsBachelor);
    addField('noncollegiatePool.maxCreditsAssociate', extractedData.noncollegiatePool?.maxCreditsAssociate);
    addField('noncollegiatePool.includedProviders', extractedData.noncollegiatePool?.includedProviders);
    addField('upperDivisionAreaOfStudyMin', extractedData.upperDivisionAreaOfStudyMin);
    addField('upperDivisionTotalMin', extractedData.upperDivisionTotalMin);
    
    // Residency options
    extractedData.residencyOptions?.forEach((opt: any, i: number) => {
      addField(`residencyOptions[${i}]`, {
        value: opt,
        confidence: opt.confidence,
        source_quote: opt.source_quote,
      });
    });

    // Gen ed requirements
    if (extractedData.genEdRequirements) {
      Object.entries(extractedData.genEdRequirements).forEach(([key, val]) => {
        addField(`genEdRequirements.${key}`, val);
      });
    }

    if (fieldExtractions.length > 0) {
      await supabase
        .from('policy_field_extractions')
        .insert(fieldExtractions);
    }

    console.log(`Extraction complete: ${overallConfidence}% confidence, ${extractedData.uncertainFields?.length || 0} uncertain fields`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: currentJobId,
        overallConfidence,
        status,
        uncertainFields: extractedData.uncertainFields,
        fieldCount: fieldExtractions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('School scraper error:', error);
    
    // Update job status if we have one
    if (currentJobId && supabase) {
      try {
        await supabase
          .from('school_scrape_jobs')
          .update({ 
            status: 'failed',
            error_message: (error as Error).message,
          })
          .eq('id', currentJobId);
      } catch (e) {
        console.error('Failed to update job status:', e);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message,
        jobId: currentJobId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
