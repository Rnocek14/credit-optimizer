import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const MAX_RUNTIME_MS = 25000; // Exit cleanly before 30s timeout
const BATCH_SIZE = 3; // Jobs per invocation
const MAX_ATTEMPTS = 3;

interface QueueJob {
  id: string;
  program_catalog_id: string;
  program_slug: string;
  eligibility_status: string;
  desired_tracks: string[];
  priority_score: number;
  attempt_count: number;
}

interface ProgramCatalog {
  id: string;
  institution_code: string;
  program_slug: string;
  program_name_raw: string;
  degree_type: string;
  degree_total_credits: number | null;
  catalog_url: string | null;
}

interface GenerationResult {
  success: boolean;
  track: string;
  error_code?: string;
  error_message?: string;
  tokens_used?: number;
  generation_time_ms?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      institution_code,
      batch_size = BATCH_SIZE,
      dry_run = false,
    } = body;

    console.log(`[${workerId}] Starting template generation worker`, {
      institution_code,
      batch_size,
      dry_run,
    });

    // Build the claim query with optional institution filter
    let claimQuery = supabase
      .from('template_generation_queue')
      .select('id, program_catalog_id, program_slug, eligibility_status, desired_tracks, priority_score, attempt_count')
      .eq('status', 'queued')
      .eq('eligibility_status', 'needs_review') // Only process eligible programs
      .order('priority_score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(batch_size);

    if (institution_code) {
      // Filter by institution via join - need to use a different approach
      // We'll claim broadly and filter in code for now
    }

    const { data: jobs, error: claimError } = await claimQuery;

    if (claimError) {
      throw new Error(`CLAIM_FAILED: ${claimError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log(`[${workerId}] No jobs available`);
      return new Response(
        JSON.stringify({ success: true, jobs_processed: 0, message: 'No jobs available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter by institution if specified (post-claim filtering)
    let filteredJobs = jobs as QueueJob[];
    if (institution_code) {
      const slugPrefix = `${institution_code}:`;
      filteredJobs = jobs.filter((j: QueueJob) => j.program_slug.startsWith(slugPrefix));
      if (filteredJobs.length === 0) {
        console.log(`[${workerId}] No jobs for institution ${institution_code}`);
        return new Response(
          JSON.stringify({ success: true, jobs_processed: 0, message: `No jobs for ${institution_code}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Lock claimed jobs
    const jobIds = filteredJobs.map(j => j.id);
    const { error: lockError } = await supabase
      .from('template_generation_queue')
      .update({
        status: 'processing',
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        last_attempt_at: new Date().toISOString(),
      })
      .in('id', jobIds);

    if (lockError) {
      throw new Error(`LOCK_FAILED: ${lockError.message}`);
    }

    console.log(`[${workerId}] Claimed ${filteredJobs.length} jobs:`, jobIds);

    // Process each job
    const results: { job_id: string; program_slug: string; tracks: GenerationResult[] }[] = [];
    let completed = 0;
    let failed = 0;

    for (const job of filteredJobs) {
      // Check runtime limit
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`[${workerId}] Approaching time limit, stopping`);
        // Release remaining jobs back to queue
        const remainingIds = filteredJobs.slice(filteredJobs.indexOf(job)).map(j => j.id);
        await supabase
          .from('template_generation_queue')
          .update({
            status: 'queued',
            locked_at: null,
            locked_by: null,
          })
          .in('id', remainingIds);
        break;
      }

      try {
        // Load program data
        const { data: program, error: programError } = await supabase
          .from('program_catalog')
          .select('*')
          .eq('id', job.program_catalog_id)
          .single();

        if (programError || !program) {
          throw new Error(`PROGRAM_NOT_FOUND: ${job.program_catalog_id}`);
        }

        const programData = program as ProgramCatalog;
        const trackResults: GenerationResult[] = [];

        // Generate template for each desired track
        for (const track of job.desired_tracks || ['standard']) {
          if (dry_run) {
            console.log(`[${workerId}] DRY RUN: Would generate ${track} template for ${job.program_slug}`);
            trackResults.push({ success: true, track });
            continue;
          }

          const result = await generateTemplate(
            openaiKey,
            programData,
            track,
            supabase,
            workerId
          );
          trackResults.push(result);

          if (!result.success) {
            console.error(`[${workerId}] Template generation failed for ${job.program_slug}/${track}:`, result.error_message);
          }
        }

        // Check if all tracks succeeded
        const allSucceeded = trackResults.every(r => r.success);

        if (allSucceeded) {
          // Mark job completed
          await supabase
            .from('template_generation_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              locked_at: null,
              locked_by: null,
              attempt_count: job.attempt_count + 1,
            })
            .eq('id', job.id);
          completed++;
        } else {
          // Mark job failed or requeue
          const newAttemptCount = job.attempt_count + 1;
          const shouldRetry = newAttemptCount < MAX_ATTEMPTS;
          const firstError = trackResults.find(r => !r.success);

          await supabase
            .from('template_generation_queue')
            .update({
              status: shouldRetry ? 'queued' : 'failed',
              locked_at: null,
              locked_by: null,
              attempt_count: newAttemptCount,
              error_code: firstError?.error_code || 'UNKNOWN',
              error_message: firstError?.error_message || 'Unknown error',
            })
            .eq('id', job.id);
          
          if (!shouldRetry) failed++;
        }

        results.push({
          job_id: job.id,
          program_slug: job.program_slug,
          tracks: trackResults,
        });

      } catch (jobError) {
        const errorMessage = jobError instanceof Error ? jobError.message : 'Unknown error';
        console.error(`[${workerId}] Job ${job.id} failed:`, errorMessage);

        const newAttemptCount = job.attempt_count + 1;
        const shouldRetry = newAttemptCount < MAX_ATTEMPTS;

        await supabase
          .from('template_generation_queue')
          .update({
            status: shouldRetry ? 'queued' : 'failed',
            locked_at: null,
            locked_by: null,
            attempt_count: newAttemptCount,
            error_code: errorMessage.split(':')[0] || 'JOB_ERROR',
            error_message: errorMessage,
          })
          .eq('id', job.id);

        if (!shouldRetry) failed++;

        results.push({
          job_id: job.id,
          program_slug: job.program_slug,
          tracks: [{ success: false, track: 'unknown', error_code: 'JOB_ERROR', error_message: errorMessage }],
        });
      }
    }

    const runtime = Date.now() - startTime;
    console.log(`[${workerId}] Completed in ${runtime}ms: ${completed} succeeded, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        worker_id: workerId,
        jobs_claimed: filteredJobs.length,
        jobs_completed: completed,
        jobs_failed: failed,
        runtime_ms: runtime,
        dry_run,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${workerId}] Worker error:`, errorMessage);

    return new Response(
      JSON.stringify({ success: false, worker_id: workerId, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateTemplate(
  openaiKey: string,
  program: ProgramCatalog,
  track: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workerId: string
): Promise<GenerationResult> {
  const startTime = Date.now();

  try {
    const prompt = buildTemplatePrompt(program, track);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an academic advisor AI that creates degree completion templates. Output valid JSON only, no markdown.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        track,
        error_code: 'OPENAI_API_ERROR',
        error_message: `${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const tokensUsed = data.usage?.total_tokens || 0;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        track,
        error_code: 'MODEL_EMPTY',
        error_message: 'OpenAI returned empty content',
        tokens_used: tokensUsed,
      };
    }

    // Parse the template JSON
    let templateJson: unknown;
    try {
      // Clean up potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      templateJson = JSON.parse(cleaned);
    } catch (parseError) {
      return {
        success: false,
        track,
        error_code: 'PARSE_FAIL',
        error_message: `Failed to parse template JSON: ${parseError}`,
        tokens_used: tokensUsed,
      };
    }

    const generationTimeMs = Date.now() - startTime;

    // Upsert into program_templates (idempotent)
    const { error: upsertError } = await supabase
      .from('program_templates')
      .upsert({
        program_catalog_id: program.id,
        institution_code: program.institution_code,
        program_slug: program.program_slug,
        track,
        template_json: templateJson,
        prompt_version: 'v1',
        model: 'gpt-4o-mini',
        tokens_used: tokensUsed,
        generation_time_ms: generationTimeMs,
        generated_at: new Date().toISOString(),
        source_snapshot: {
          program_name: program.program_name_raw,
          degree_type: program.degree_type,
          total_credits: program.degree_total_credits,
          catalog_url: program.catalog_url,
        },
      }, { onConflict: 'program_catalog_id,track' });

    if (upsertError) {
      return {
        success: false,
        track,
        error_code: 'DB_CONSTRAINT',
        error_message: upsertError.message,
        tokens_used: tokensUsed,
        generation_time_ms: generationTimeMs,
      };
    }

    console.log(`[${workerId}] Generated ${track} template for ${program.program_slug} (${tokensUsed} tokens, ${generationTimeMs}ms)`);

    return {
      success: true,
      track,
      tokens_used: tokensUsed,
      generation_time_ms: generationTimeMs,
    };

  } catch (error) {
    return {
      success: false,
      track,
      error_code: 'GENERATION_ERROR',
      error_message: error instanceof Error ? error.message : 'Unknown generation error',
    };
  }
}

function buildTemplatePrompt(program: ProgramCatalog, track: string): string {
  const trackDescriptions: Record<string, string> = {
    standard: 'A balanced approach using a mix of institutional courses and alternative credits where appropriate.',
    alt_max: 'Maximize alternative credit usage (CLEP, DSST, Sophia, Study.com) to reduce costs and accelerate completion.',
    fastest: 'Optimize for fastest completion time, using the quickest assessment methods available.',
    cheapest: 'Minimize total cost while maintaining degree requirements.',
    hybrid: 'A hybrid approach balancing cost, time, and quality.',
  };

  return `Create a degree completion template for the following program:

Institution: ${program.institution_code}
Program: ${program.program_name_raw}
Degree Type: ${program.degree_type}
Total Credits Required: ${program.degree_total_credits || 120}
Track Type: ${track}
Track Goal: ${trackDescriptions[track] || 'Standard approach'}

Generate a JSON template with this structure:
{
  "programCode": "${program.degree_type}",
  "trackType": "${track}",
  "totalCredits": ${program.degree_total_credits || 120},
  "estimatedCost": <number>,
  "estimatedDurationMonths": <number>,
  "terms": [
    {
      "id": "y1-t1",
      "label": "Year 1 - Term 1",
      "slots": [
        {
          "slotId": "slot-1",
          "requirementArea": "WRITTEN_COMM" | "QUANTITATIVE" | "HUMANITIES" | "SOCIAL_SCIENCE" | "NATURAL_SCIENCE" | "ORAL_COMM" | "BUS_CORE" | "FREE_ELECTIVE" | "UPPER_BUSINESS" | "CAPSTONE",
          "kind": "gened" | "major" | "elective" | "capstone",
          "minCredits": 3,
          "preferred": {
            "type": "institutional_course" | "alt_credit",
            "courseCode": "ENG-101" (for institutional),
            "sourceCode": "CLEP" | "DSST" | "SOPHIA" | "STUDY_COM" (for alt_credit),
            "identifier": "college-composition" (for alt_credit)
          },
          "alternatives": [...]
        }
      ]
    }
  ]
}

Requirements:
1. Include all general education requirements typical for a ${program.degree_type} degree
2. Include major-specific courses appropriate for ${program.program_name_raw}
3. For ${track} track: ${trackDescriptions[track]}
4. Distribute courses across 8-12 terms (2-3 years for accelerated, 4 years for standard)
5. Include realistic cost and duration estimates
6. Use CLEP, DSST, Sophia, Study.com for alt_credit options where applicable

Output only valid JSON, no explanations.`;
}
