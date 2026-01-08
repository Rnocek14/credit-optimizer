import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0?target=deno";
import OpenAI from "https://esm.sh/openai@4.67.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to create clients inside handler (avoid cold-start crashes)
function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function getOpenAIClient() {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY secret");
  }
  return new OpenAI({ apiKey });
}

// ============================================================================
// HTML → Clean Text Extractor (key cost saver)
// ============================================================================
function htmlToCleanText(html: string): string {
  // Remove script, style, nav, footer, header, aside tags
  let clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
  
  // Convert common elements to readable text
  clean = clean
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, '\n#### $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, ' $1 |')
    .replace(/<tr[^>]*>/gi, '\n|')
    .replace(/<\/tr>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  return clean;
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
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EduScraper/1.0; +https://pathfind.ai/bot)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const html = await response.text();
      const text = htmlToCleanText(html);
      
      console.log(`Extracted ${text.length} chars from ${url}`);
      results.push({ url, text: text.slice(0, 50000) }); // Cap at 50K chars
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
// Main Handler
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize clients inside handler to avoid cold-start crashes
    const supabase = getSupabaseClient();
    const openai = getOpenAIClient();
    
    const { institutionCode, customUrls, jobId } = await req.json();

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
    let currentJobId = jobId;
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

    // Call OpenAI for extraction
    console.log(`Calling OpenAI for extraction (${combinedText.length} chars)`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Extract the transfer credit and graduation policies for ${institutionCode} from the following scraped content:\n\n${combinedText.slice(0, 100000)}` 
        }
      ],
      tools: [extractionTool],
      tool_choice: { type: "function", function: { name: "extract_institution_policy" } },
      max_tokens: 4000,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_institution_policy') {
      throw new Error('AI did not return structured extraction');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
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
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
