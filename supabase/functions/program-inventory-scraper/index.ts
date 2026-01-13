import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  institution_code?: string;
  seed_url?: string;
  dry_run?: boolean;
  debug?: boolean;
}

interface ExtractedProgram {
  program_name: string;
  degree_type: string | null;
  degree_level: string;
  catalog_url: string | null;
  marketing_url: string | null;
  total_credits: number | null;
  is_licensure: boolean;
  has_clinical: boolean;
  delivery: string;
}

const EXTRACTION_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_programs",
    description: "Extract all bachelor's degree programs from a university catalog page",
    parameters: {
      type: "object",
      properties: {
        programs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              program_name: { 
                type: "string", 
                description: "Official program name (e.g., 'Bachelor of Science in Business Administration')" 
              },
              degree_type: { 
                type: "string", 
                enum: ["BA", "BS", "BSBA", "BPS", "BSN", "BAS", "BFA", "OTHER"],
                description: "Degree type abbreviation"
              },
              degree_level: { 
                type: "string", 
                enum: ["bachelor", "associate", "master", "certificate"],
                description: "Must be 'bachelor' for this extraction"
              },
              catalog_url: { 
                type: "string", 
                description: "Link to the program's detail/requirements page" 
              },
              marketing_url: {
                type: "string",
                description: "Link to program marketing page if different from catalog"
              },
              total_credits: { 
                type: "number", 
                description: "Total degree credits if explicitly stated" 
              },
              is_licensure: { 
                type: "boolean", 
                description: "True if program leads to professional licensure" 
              },
              has_clinical: { 
                type: "boolean", 
                description: "True if program requires clinical, practicum, or internship" 
              },
              delivery: { 
                type: "string", 
                enum: ["online", "campus", "hybrid", "unknown"],
                description: "Program delivery modality"
              }
            },
            required: ["program_name", "degree_level", "is_licensure", "has_clinical", "delivery"]
          }
        }
      },
      required: ["programs"]
    }
  }
};

const SYSTEM_PROMPT = `You are extracting bachelor's degree programs from a university catalog page.

Extract ALL bachelor's degree programs visible on the page. For each program:
1. program_name: Official program name (e.g., "Bachelor of Science in Business Administration")
2. degree_type: BA, BS, BSBA, BPS, BSN, BAS, BFA, or OTHER
3. degree_level: Must be "bachelor" for this extraction
4. catalog_url: Link to the program's detail/requirements page if visible
5. marketing_url: Separate marketing page URL if present
6. total_credits: Only if explicitly stated on this page
7. is_licensure: true if program mentions licensure, certification, or professional licensing
8. has_clinical: true if program mentions clinical hours, practicum, student teaching, internship requirements
9. delivery: online, campus, hybrid, or unknown

RULES:
- ONLY extract bachelor's degrees (skip associate, master's, certificates, minors)
- Include ALL majors and concentrations as separate entries
- If catalog_url is a relative path, include it as-is (we'll resolve it)
- Set is_licensure=true for: Nursing, Education, Social Work, Accounting (CPA track), Criminal Justice (law enforcement)
- Set has_clinical=true for: Nursing, Education (student teaching), any program mentioning practicum/clinical
- When unsure about is_licensure or has_clinical, default to false
- Extract as many programs as you can find on the page`;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateProgramSlug(institution: string, degreeType: string | null, programName: string): string {
  const cleanName = slugify(programName);
  const type = degreeType || 'OTHER';
  return `${institution}:${type}:${cleanName}`;
}

function computeContentHash(programs: ExtractedProgram[]): string {
  const sorted = [...programs].sort((a, b) => a.program_name.localeCompare(b.program_name));
  const content = JSON.stringify(sorted);
  // Simple hash - in production you'd use crypto.subtle
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeWithFirecrawl(
  url: string, 
  maxRetries = 3
): Promise<{ markdown: string; html: string; attempts: number }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  const effectiveMaxRetries = Math.min(maxRetries, 3);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < effectiveMaxRetries; attempt++) {
    const delay = attempt === 0 ? 0 : Math.min(8000, 1000 * Math.pow(2, attempt - 1));
    if (attempt > 0) {
      console.log(`Retry attempt ${attempt + 1}/${effectiveMaxRetries} after ${delay}ms delay`);
      await sleep(delay);
    }

    try {
      console.log(`Calling Firecrawl for: ${url} (attempt ${attempt + 1})`);

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html', 'links'],
          onlyMainContent: false, // Need full page for program listings
          waitFor: 3000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(data.error || `Firecrawl failed: ${response.status}`);
        }
        lastError = new Error(data.error || `Firecrawl failed: ${response.status}`);
        console.error(`Firecrawl error (attempt ${attempt + 1}):`, data);
        continue;
      }

      const markdown = data.data?.markdown || data.markdown || '';
      const html = data.data?.html || data.html || '';

      console.log(`Firecrawl success: ${markdown.length} chars markdown, ${html.length} chars html`);

      return { markdown, html, attempts: attempt + 1 };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`Network error (attempt ${attempt + 1}):`, error.message);
        continue;
      }
      
      throw lastError;
    }
  }

  throw new Error(`failed_transient: ${lastError?.message || 'Max retries exceeded'}`);
}

async function extractProgramsWithAI(
  markdown: string,
  baseUrl: string
): Promise<ExtractedProgram[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Truncate if too long
  const maxChars = 100000;
  const truncatedContent = markdown.length > maxChars 
    ? markdown.slice(0, maxChars) + '\n\n[Content truncated...]'
    : markdown;

  console.log(`Extracting programs from ${truncatedContent.length} chars of content`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract all bachelor's degree programs from this university catalog page:\n\nBase URL: ${baseUrl}\n\n${truncatedContent}` }
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'function', function: { name: 'extract_programs' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI extraction error:', response.status, errorText);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== 'extract_programs') {
    console.error('No tool call in response:', JSON.stringify(data));
    throw new Error('AI did not return expected tool call');
  }

  const args = JSON.parse(toolCall.function.arguments);
  const programs: ExtractedProgram[] = args.programs || [];

  // Filter to only bachelor's degrees and resolve relative URLs
  const bachelorPrograms = programs
    .filter(p => p.degree_level === 'bachelor')
    .map(p => ({
      ...p,
      catalog_url: p.catalog_url ? resolveUrl(p.catalog_url, baseUrl) : null,
      marketing_url: p.marketing_url ? resolveUrl(p.marketing_url, baseUrl) : null,
    }));

  console.log(`Extracted ${bachelorPrograms.length} bachelor's programs (filtered from ${programs.length} total)`);

  return bachelorPrograms;
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  let runId: string | null = null;

  try {
    const body: ScrapeRequest = await req.json();
    const { 
      institution_code,
      seed_url: providedSeedUrl,
      dry_run = false,
      debug = false
    } = body;

    if (!institution_code) {
      return new Response(
        JSON.stringify({ error: 'institution_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting program inventory scrape for ${institution_code}, dry_run=${dry_run}`);

    // Resolve seed URL from scrape_url_templates if not provided
    let seedUrl = providedSeedUrl;
    if (!seedUrl) {
      const { data: template, error: templateErr } = await supabase
        .from('scrape_url_templates')
        .select('url')
        .eq('institution_code', institution_code)
        .eq('page_type', 'program_catalog')
        .eq('status', 'active')
        .maybeSingle();

      if (templateErr) {
        console.error('Failed to fetch seed URL template:', templateErr);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch seed URL template', details: templateErr }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!template) {
        return new Response(
          JSON.stringify({ error: `No active program_catalog URL template found for ${institution_code}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      seedUrl = template.url;
    }

    // Type assertion - we've validated seedUrl exists
    const finalSeedUrl = seedUrl as string;

    // Validate URL
    try {
      new URL(finalSeedUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid seed URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create run record
    const { data: run, error: runErr } = await supabase
      .from('program_catalog_runs')
      .insert({
        institution_code,
        seed_url: seedUrl,
        status: 'running',
        crawler_version: '1.0.0',
        model_version: 'gemini-3-flash-preview',
      })
      .select('id')
      .single();

    if (runErr) {
      console.error('Failed to create run:', runErr);
      return new Response(
        JSON.stringify({ error: 'Failed to create run record', details: runErr }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    runId = run.id;
    console.log(`Created run ${runId}`);

    // Scrape the catalog page
    const { markdown, html, attempts } = await scrapeWithFirecrawl(finalSeedUrl);
    console.log(`Scraped in ${attempts} attempt(s): ${markdown.length} chars`);

    if (markdown.length < 200) {
      throw new Error(`Extracted content too short (${markdown.length} chars). Page may be blocked.`);
    }

    // Extract programs using AI
    const extractedPrograms = await extractProgramsWithAI(markdown, finalSeedUrl);

    if (extractedPrograms.length === 0) {
      throw new Error('No bachelor programs extracted from page');
    }

    // Compute content hash for diffing
    const contentHash = computeContentHash(extractedPrograms);

    // If dry_run, return results without writing to program_catalog
    if (dry_run) {
      await supabase
        .from('program_catalog_runs')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          programs_discovered: extractedPrograms.length,
          programs_new: 0,
          programs_updated: 0,
          programs_unchanged: 0,
          content_hash: contentHash,
          diff_summary: { dry_run: true, extracted_count: extractedPrograms.length },
        })
        .eq('id', runId);

      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
        run_id: runId,
        institution_code,
        seed_url: finalSeedUrl,
          programs_extracted: extractedPrograms.length,
          content_hash: contentHash,
          programs: debug ? extractedPrograms : undefined,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert programs and track stats
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const program of extractedPrograms) {
      const programSlug = generateProgramSlug(institution_code, program.degree_type, program.program_name);
      const programHash = computeContentHash([program]);

      // Check if program exists
      const { data: existing } = await supabase
        .from('program_catalog')
        .select('id, content_hash, program_slug')
        .eq('program_slug', programSlug)
        .maybeSingle();

      if (!existing) {
        // New program
        const { data: inserted, error: insertErr } = await supabase
          .from('program_catalog')
          .insert({
            institution_code,
            program_slug: programSlug,
            program_name_raw: program.program_name,
            program_name_normalized: program.program_name.toLowerCase(),
            degree_level: 'bachelor',
            degree_type: program.degree_type,
            catalog_url: program.catalog_url,
            marketing_url: program.marketing_url,
            degree_total_credits: program.total_credits,
            is_licensure_program: program.is_licensure,
            has_clinical_or_practicum: program.has_clinical,
            delivery_mode: program.delivery,
            status: 'active',
            first_seen_run_id: runId,
            last_seen_run_id: runId,
            content_hash: programHash,
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error(`Failed to insert program ${programSlug}:`, insertErr);
          continue;
        }

        // Queue for template generation
        await supabase
          .from('template_generation_queue')
          .upsert({
            program_catalog_id: inserted.id,
            eligibility_status: program.is_licensure || program.has_clinical 
              ? (program.is_licensure ? 'blocked_licensure' : 'blocked_clinical')
              : 'eligible',
            blocked_reasons: program.is_licensure 
              ? ['Requires professional licensure']
              : program.has_clinical 
                ? ['Requires clinical/practicum hours']
                : [],
            status: 'queued',
            desired_tracks: ['standard', 'alt_max'],
            priority_score: 50,
          }, { onConflict: 'program_catalog_id' });

        newCount++;
      } else if (existing.content_hash !== programHash) {
        // Updated program
        await supabase
          .from('program_catalog')
          .update({
            program_name_raw: program.program_name,
            program_name_normalized: program.program_name.toLowerCase(),
            degree_type: program.degree_type,
            catalog_url: program.catalog_url,
            marketing_url: program.marketing_url,
            degree_total_credits: program.total_credits,
            is_licensure_program: program.is_licensure,
            has_clinical_or_practicum: program.has_clinical,
            delivery_mode: program.delivery,
            last_seen_run_id: runId,
            content_hash: programHash,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        // Update queue status if eligibility changed
        const newEligibility = program.is_licensure || program.has_clinical 
          ? (program.is_licensure ? 'blocked_licensure' : 'blocked_clinical')
          : 'eligible';

        await supabase
          .from('template_generation_queue')
          .update({
            eligibility_status: newEligibility,
            blocked_reasons: program.is_licensure 
              ? ['Requires professional licensure']
              : program.has_clinical 
                ? ['Requires clinical/practicum hours']
                : [],
            status: 'queued',
          })
          .eq('program_catalog_id', existing.id);

        updatedCount++;
      } else {
        // Unchanged - just update last_seen_run_id
        await supabase
          .from('program_catalog')
          .update({
            last_seen_run_id: runId,
          })
          .eq('id', existing.id);

        unchangedCount++;
      }
    }

    // Update run with final stats
    await supabase
      .from('program_catalog_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        programs_discovered: extractedPrograms.length,
        programs_new: newCount,
        programs_updated: updatedCount,
        programs_unchanged: unchangedCount,
        content_hash: contentHash,
        diff_summary: {
          total: extractedPrograms.length,
          new: newCount,
          updated: updatedCount,
          unchanged: unchangedCount,
        },
      })
      .eq('id', runId);

    console.log(`Run ${runId} completed: ${newCount} new, ${updatedCount} updated, ${unchangedCount} unchanged`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        institution_code,
        seed_url: seedUrl,
        programs_discovered: extractedPrograms.length,
        programs_new: newCount,
        programs_updated: updatedCount,
        programs_unchanged: unchangedCount,
        content_hash: contentHash,
        programs: debug ? extractedPrograms : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Program inventory scrape error:', errorMessage);

    // Update run status if we have a run ID
    if (runId) {
      await supabase
        .from('program_catalog_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', runId);
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        run_id: runId,
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
