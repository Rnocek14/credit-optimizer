import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Types ───────────────────────────────────────────────────────

interface ExtractedCourse {
  code: string;
  title: string;
  credits: number;
  level: number; // 100-400
  is_placeholder: boolean; // e.g. "Any 3cr Humanities elective"
}

interface ExtractedBlock {
  slug: string;
  title: string;
  area: string; // gen_ed, major_core, concentration, capstone, elective, etc.
  rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
  k?: number;
  credits_needed: number;
  level_year: number; // 1-4
  is_residency_required: boolean;
  courses: ExtractedCourse[];
}

interface ExtractionResult {
  total_credits: number;
  blocks: ExtractedBlock[];
}

// ── UUIDv5 Implementation ───────────────────────────────────────

const NAMESPACE_EDU = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace as base

async function uuidv5(name: string): Promise<string> {
  // Parse namespace UUID to bytes
  const hex = NAMESPACE_EDU.replace(/-/g, '');
  const nsBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    nsBytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes);
  data.set(nameBytes, nsBytes.length);
  
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashBytes = new Uint8Array(hashBuffer);
  
  // Set version (5) and variant (RFC 4122)
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50;
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80;
  
  const hex2 = Array.from(hashBytes.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex2.slice(0, 8)}-${hex2.slice(8, 12)}-${hex2.slice(12, 16)}-${hex2.slice(16, 20)}-${hex2.slice(20, 32)}`;
}

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '');
}

// ── Validation ──────────────────────────────────────────────────

interface ValidationWarning {
  code: string;
  message: string;
  severity: 'warn' | 'error';
}

function validateExtraction(
  result: ExtractionResult,
  expectedCredits: number | null
): { ok: boolean; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];

  // Total credits sanity
  if (result.total_credits < 60 || result.total_credits > 200) {
    warnings.push({
      code: 'CREDIT_TOTAL_SUSPECT',
      message: `Total credits ${result.total_credits} outside expected range (60-200)`,
      severity: 'error',
    });
  }

  // Compare with expected if available
  if (expectedCredits && Math.abs(result.total_credits - expectedCredits) > expectedCredits * 0.15) {
    warnings.push({
      code: 'CREDIT_MISMATCH',
      message: `Extracted ${result.total_credits}cr vs catalog ${expectedCredits}cr (>15% diff)`,
      severity: 'warn',
    });
  }

  // Must have at least 2 blocks
  if (result.blocks.length < 2) {
    warnings.push({
      code: 'TOO_FEW_BLOCKS',
      message: `Only ${result.blocks.length} blocks extracted — likely incomplete`,
      severity: 'error',
    });
  }

  // Check for capstone
  const hasCapstone = result.blocks.some(
    b => b.area === 'capstone' || b.slug.toLowerCase().includes('capstone')
  );
  if (!hasCapstone) {
    warnings.push({
      code: 'NO_CAPSTONE',
      message: 'No capstone block detected',
      severity: 'warn',
    });
  }

  // Course level validation
  for (const block of result.blocks) {
    for (const course of block.courses) {
      if (!course.is_placeholder && (course.level < 100 || course.level > 499)) {
        warnings.push({
          code: 'INVALID_COURSE_LEVEL',
          message: `${course.code} has invalid level ${course.level}`,
          severity: 'warn',
        });
      }
    }
  }

  // Block credits should sum approximately to total
  const blockCreditsSum = result.blocks.reduce((s, b) => s + b.credits_needed, 0);
  if (blockCreditsSum > 0 && Math.abs(blockCreditsSum - result.total_credits) > result.total_credits * 0.2) {
    warnings.push({
      code: 'BLOCK_CREDITS_MISMATCH',
      message: `Block credits sum ${blockCreditsSum} vs total ${result.total_credits} (>20% diff)`,
      severity: 'warn',
    });
  }

  const hasHardError = warnings.some(w => w.severity === 'error');
  return { ok: !hasHardError, warnings };
}

// ── GPT Extraction ──────────────────────────────────────────────

const EXTRACTION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'extract_degree_requirements',
    description: 'Extract structured degree requirements from a university catalog page.',
    parameters: {
      type: 'object',
      properties: {
        total_credits: {
          type: 'number',
          description: 'Total credits required for the degree',
        },
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug: {
                type: 'string',
                description: 'Stable snake_case identifier, e.g. "written_comm", "major_core", "capstone"',
              },
              title: { type: 'string', description: 'Human-readable block name' },
              area: {
                type: 'string',
                enum: ['gen_ed', 'major_core', 'major_elective', 'concentration', 'capstone', 'free_elective', 'upper_level', 'other'],
              },
              rule_type: { type: 'string', enum: ['ALL', 'K_OF_N', 'CREDITS'] },
              k: { type: 'number', description: 'For K_OF_N: how many to choose' },
              credits_needed: { type: 'number', description: 'Credits required for this block' },
              level_year: { type: 'number', description: 'Target academic year 1-4' },
              is_residency_required: {
                type: 'boolean',
                description: 'True if this block must be completed at the home institution (e.g. capstone, cornerstone)',
              },
              courses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', description: 'Course code e.g. "ENG-101"' },
                    title: { type: 'string' },
                    credits: { type: 'number' },
                    level: { type: 'number', description: 'Course level: 100, 200, 300, or 400' },
                    is_placeholder: {
                      type: 'boolean',
                      description: 'True if this is a generic slot like "Any Humanities elective"',
                    },
                  },
                  required: ['code', 'title', 'credits', 'level', 'is_placeholder'],
                  additionalProperties: false,
                },
              },
            },
            required: ['slug', 'title', 'area', 'rule_type', 'credits_needed', 'level_year', 'is_residency_required', 'courses'],
            additionalProperties: false,
          },
        },
      },
      required: ['total_credits', 'blocks'],
      additionalProperties: false,
    },
  },
};

async function extractRequirements(
  markdown: string,
  institutionCode: string,
  programName: string,
  openaiKey: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an expert academic advisor and curriculum analyst. Extract the complete degree requirements from the provided catalog page.

Rules:
- Every course and requirement mentioned must be captured
- Use snake_case slugs (e.g., "written_comm", "quantitative_reasoning", "major_core")
- Course codes should use the format shown in the catalog (e.g., "ENG-101", "ACC 201")
- If a requirement says "choose N from list", use rule_type K_OF_N with k=N
- If a requirement says "complete all", use rule_type ALL
- If a requirement specifies a credit total with flexible options, use CREDITS
- Mark capstone, cornerstone, and institution-specific courses as is_residency_required: true
- For open elective slots (e.g., "Any 3cr humanities"), set is_placeholder: true and use a descriptive code like "HUMANITIES-ELEC"
- Course levels: infer from the course number (e.g., 101→100, 315→300, 490→400)
- If credit count is missing for a course, default to 3`;

  const userPrompt = `Extract the degree requirements for "${programName}" at ${institutionCode} from this catalog page:\n\n${markdown.slice(0, 30000)}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'function', function: { name: 'extract_degree_requirements' } },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error('GPT did not return tool call output');
  }

  return JSON.parse(toolCall.function.arguments) as ExtractionResult;
}

// ── DB Write ────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function writeRequirements(
  supabase: any,
  programCatalogId: string,
  institutionCode: string,
  programSlug: string,
  catalogUrl: string,
  extraction: ExtractionResult,
  runId: string
): Promise<{ coursesWritten: number; blocksWritten: number }> {
  let coursesWritten = 0;
  let blocksWritten = 0;

  for (const block of extraction.blocks) {
    // Deterministic block ID via UUIDv5
    const blockId = await uuidv5(`block:${programSlug}:${block.slug}`);

    // Upsert requirement_block
    const { error: blockError } = await supabase
      .from('requirement_blocks')
      .upsert({
        id: blockId,
        title: block.title,
        slug: block.slug,
        rule_type: block.rule_type,
        k: block.k || null,
        credits_needed: block.credits_needed,
        level_year: block.level_year,
        area: block.area,
        is_residency_required: block.is_residency_required,
        program_id: programSlug,
        is_virtual: false,
        hidden: false,
      }, { onConflict: 'id' });

    if (blockError) {
      console.error(`Block upsert error for ${block.slug}:`, blockError.message);
      continue;
    }
    blocksWritten++;

    // Upsert program_requirements link
    const reqId = await uuidv5(`req:${programSlug}:${block.slug}`);
    await supabase
      .from('program_requirements')
      .upsert({
        id: reqId,
        program_id: programSlug,
        requirement_block_id: blockId,
        category: block.area,
        name: block.title,
        credits_required: block.credits_needed,
        year: block.level_year,
        min_select: block.rule_type === 'K_OF_N' ? block.k : (block.rule_type === 'ALL' ? block.courses.length : null),
      }, { onConflict: 'id' });

    // Upsert courses and block_members
    for (const course of block.courses) {
      const codeNorm = normalizeCode(course.code);
      const courseId = await uuidv5(`course:${institutionCode}:${codeNorm}`);

      const { error: courseError } = await supabase
        .from('edu_courses')
        .upsert({
          id: courseId,
          code: course.code,
          code_norm: codeNorm,
          title: course.title,
          credits: course.credits,
          level_year: Math.ceil(course.level / 100),
          area: block.area,
          is_core: block.area === 'major_core',
          is_capstone: block.area === 'capstone',
          institution_code: institutionCode,
          source_url: catalogUrl,
          extracted_at: new Date().toISOString(),
        }, { 
          onConflict: 'id',
          // Don't overwrite title/credits if they already exist with real data
          ignoreDuplicates: false,
        });

      if (courseError) {
        console.error(`Course upsert error for ${course.code}:`, courseError.message);
        continue;
      }
      coursesWritten++;

      // Link block_member
      const memberId = await uuidv5(`member:${blockId}:${courseId}`);
      await supabase
        .from('block_members')
        .upsert({
          id: memberId,
          block_id: blockId,
          course_id: courseId,
        }, { onConflict: 'id' });
    }
  }

  // Update program_catalog pointer
  await supabase
    .from('program_catalog')
    .update({ current_requirements_version_id: runId })
    .eq('id', programCatalogId);

  return { coursesWritten, blocksWritten };
}

// ── Main Handler ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  const cronSecret = Deno.env.get('OPS_CRON_SECRET');

  // Auth: require either service_role JWT or cron secret
  const authHeader = req.headers.get('Authorization') || '';
  const providedCronSecret = req.headers.get('x-cron-secret');
  const isServiceRole = authHeader.includes(supabaseServiceKey);
  const isCronAuth = cronSecret && providedCronSecret === cronSecret;

  if (!isServiceRole && !isCronAuth) {
    // Check for admin JWT via getUser
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await adminSupabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Verify admin role
    const { data: roleData } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .in('role', ['admin', 'ops_admin'])
      .maybeSingle();
    
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  if (!openaiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json();
    const { program_catalog_id } = body;

    if (!program_catalog_id) {
      return new Response(JSON.stringify({ error: 'program_catalog_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load program
    const { data: program, error: programError } = await supabase
      .from('program_catalog')
      .select('*')
      .eq('id', program_catalog_id)
      .single();

    if (programError || !program) {
      return new Response(JSON.stringify({ error: 'Program not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!program.catalog_url) {
      return new Response(JSON.stringify({ error: 'No catalog_url for this program' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create scrape run record
    const { data: run, error: runError } = await supabase
      .from('requirements_scrape_runs')
      .insert({
        program_catalog_id,
        institution_code: program.institution_code,
        program_slug: program.program_slug,
        catalog_url: program.catalog_url,
        status: 'scraping',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (runError || !run) {
      throw new Error(`Failed to create scrape run: ${runError?.message}`);
    }

    const runId = run.id;
    console.log(`[REQ-SCRAPER] Run ${runId} started for ${program.program_slug} @ ${program.institution_code}`);

    // Step 1: Scrape the catalog URL with Firecrawl
    let markdown: string;
    try {
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: program.catalog_url,
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      if (!scrapeResponse.ok) {
        const errBody = await scrapeResponse.text();
        throw new Error(`Firecrawl ${scrapeResponse.status}: ${errBody}`);
      }

      const scrapeData = await scrapeResponse.json();
      markdown = scrapeData.data?.markdown || scrapeData.markdown || '';

      if (!markdown || markdown.length < 200) {
        throw new Error(`Scraped content too short (${markdown.length} chars)`);
      }
    } catch (scrapeErr) {
      const msg = scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr);
      await supabase
        .from('requirements_scrape_runs')
        .update({ status: 'failed', error_message: `Scrape failed: ${msg}`, completed_at: new Date().toISOString() })
        .eq('id', runId);

      return new Response(JSON.stringify({ error: `Scrape failed: ${msg}`, run_id: runId }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute page hash for change detection
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(markdown));
    const pageHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store markdown + hash
    await supabase
      .from('requirements_scrape_runs')
      .update({
        status: 'extracting',
        page_markdown: markdown,
        page_hash: pageHash,
        token_count: Math.ceil(markdown.length / 4), // rough estimate
      })
      .eq('id', runId);

    console.log(`[REQ-SCRAPER] Scraped ${markdown.length} chars, hash=${pageHash.slice(0, 12)}`);

    // Step 2: Extract with GPT
    let extraction: ExtractionResult;
    try {
      extraction = await extractRequirements(
        markdown,
        program.institution_code,
        program.program_name_raw,
        openaiKey
      );
    } catch (extractErr) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
      await supabase
        .from('requirements_scrape_runs')
        .update({ status: 'failed', error_message: `Extraction failed: ${msg}`, completed_at: new Date().toISOString() })
        .eq('id', runId);

      return new Response(JSON.stringify({ error: `Extraction failed: ${msg}`, run_id: runId }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store extracted JSON
    await supabase
      .from('requirements_scrape_runs')
      .update({ extracted_json: extraction })
      .eq('id', runId);

    console.log(`[REQ-SCRAPER] Extracted ${extraction.blocks.length} blocks, ${extraction.total_credits} total credits`);

    // Step 3: Validate
    const { ok, warnings } = validateExtraction(extraction, program.degree_total_credits);

    if (!ok) {
      // Quarantine: store data but don't write to DB
      await supabase
        .from('requirements_scrape_runs')
        .update({
          status: 'quarantined',
          warnings,
          error_message: `Validation failed: ${warnings.filter(w => w.severity === 'error').map(w => w.code).join(', ')}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);

      return new Response(JSON.stringify({
        success: false,
        run_id: runId,
        status: 'quarantined',
        warnings,
        extraction_preview: {
          total_credits: extraction.total_credits,
          blocks: extraction.blocks.length,
          courses: extraction.blocks.reduce((s, b) => s + b.courses.length, 0),
        },
      }), {
        status: 200, // 200 because it's not an error, just quarantined
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Write to DB
    await supabase
      .from('requirements_scrape_runs')
      .update({ status: 'writing' })
      .eq('id', runId);

    const { coursesWritten, blocksWritten } = await writeRequirements(
      supabase,
      program_catalog_id,
      program.institution_code,
      program.program_slug,
      program.catalog_url,
      extraction,
      runId
    );

    const finalStatus = warnings.length > 0 ? 'completed_with_warnings' : 'completed';
    await supabase
      .from('requirements_scrape_runs')
      .update({
        status: finalStatus,
        blocks_written: blocksWritten,
        courses_written: coursesWritten,
        warnings,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    console.log(`[REQ-SCRAPER] ✅ ${finalStatus}: ${blocksWritten} blocks, ${coursesWritten} courses written`);

    return new Response(JSON.stringify({
      success: true,
      run_id: runId,
      status: finalStatus,
      blocks_written: blocksWritten,
      courses_written: coursesWritten,
      total_credits: extraction.total_credits,
      warnings,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[REQ-SCRAPER] Fatal error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
