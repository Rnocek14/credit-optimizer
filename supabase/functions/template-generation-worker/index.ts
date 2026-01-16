import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { evaluatePolicyGate, getTemplateStatus, type PolicyGateResult } from '../_shared/policyGate.ts';
import { checkTemplateInvariants, buildAuditRecord, normalizePolicyData, type TemplateItem, type RawPolicyPack } from '../_shared/creditInvariantChecker.ts';
import { 
  fetchInstitutionOverridesBase, 
  computeEffectiveThreshold,
  type EffectiveInvariantConfig,
} from '../_shared/institutionOverrides.ts';
import {
  writeInvariantDecisionSnapshot,
  buildSnapshotEffectiveConfig,
} from '../_shared/invariantDecisionSnapshot.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration - OBSERVABLE (logged at startup)
const CONFIG = {
  MAX_RUNTIME_MS: 120000,      // 2 min total worker budget
  OPENAI_TIMEOUT_MS: 45000,    // 45s per OpenAI request
  MIN_TIME_FOR_NEW_JOB: 55000, // Need 55s+ to start a new job
  DEFAULT_BATCH_SIZE: 1,       // Start with 1, raise after observing times
  MAX_ATTEMPTS: 3,
  PROMPT_VERSION: 'v1',
};

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

interface TrackResult {
  success: boolean;
  track: string;
  template_written: boolean;
  error_code?: string;
  error_message?: string;
  tokens_used?: number;
  generation_time_ms?: number;
}

interface JobResult {
  job_id: string;
  program_slug: string;
  tracks_requested: number;
  tracks_written: number;
  tracks_failed: number;
  tracks: TrackResult[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // LEGACY WORKER GATE: Require explicit header to prevent accidental invocation
  // This worker is deprecated in favor of template-job-processor pipeline
  const legacySecret = Deno.env.get('LEGACY_WORKER_SECRET');
  const providedSecret = req.headers.get('x-legacy-worker-secret');
  
  // Log gate status clearly for debugging
  if (!legacySecret) {
    console.warn('[LEGACY-WORKER] UNGATED MODE - LEGACY_WORKER_SECRET not set (dev/test)');
  } else {
    console.log('[LEGACY-WORKER] GATED MODE - secret required for invocation');
  }
  
  if (legacySecret && providedSecret !== legacySecret) {
    console.warn('[DEPRECATED] template-generation-worker invoked without valid secret');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'DEPRECATED: This worker is deprecated. Use template-job-processor instead.',
        code: 'LEGACY_DEPRECATED'
      }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const workerStartTime = Date.now();
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
      institution_code = null,
      batch_size = CONFIG.DEFAULT_BATCH_SIZE,
      dry_run = false,
      force_regen = false,  // If true, regenerate even if template exists
    } = body;

    // LOG CONFIG so we can verify deployed version
    console.log(`[${workerId}] CONFIG`, CONFIG);
    console.log(`[${workerId}] Starting worker`, { institution_code, batch_size, dry_run, force_regen });

    // DRY RUN: Preview jobs without claiming or modifying state
    if (dry_run) {
      let query = supabase
        .from('template_generation_queue')
        .select(`
          id, program_catalog_id, program_slug, eligibility_status,
          desired_tracks, priority_score, attempt_count,
          program_catalog!inner(institution_code)
        `)
        .eq('status', 'queued')
        .eq('eligibility_status', 'needs_review');

      if (institution_code) {
        query = query.eq('program_catalog.institution_code', institution_code);
      }

      const { data: previewJobs, error: previewError } = await query
        .order('priority_score', { ascending: false })
        .limit(batch_size);

      if (previewError) {
        console.error(`[${workerId}] DRY RUN preview error:`, previewError);
      }

      const jobs = (previewJobs || []) as QueueJob[];
      console.log(`[${workerId}] DRY RUN: Would process ${jobs.length} jobs (no state modified)`);

      return new Response(
        JSON.stringify({
          success: true,
          worker_id: workerId,
          dry_run: true,
          jobs_preview: jobs.length,
          jobs: jobs.map(j => ({
            id: j.id,
            program_slug: j.program_slug,
            tracks: j.desired_tracks || ['standard'],
          })),
          message: 'Dry run - no jobs claimed or modified',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ATOMIC CLAIM via RPC with SKIP LOCKED (only for real runs)
    const { data: claimedJobs, error: claimError } = await supabase
      .rpc('claim_template_generation_jobs', {
        p_institution_code: institution_code,
        p_batch_size: batch_size,
        p_worker_id: workerId,
      });

    if (claimError) {
      throw new Error(`CLAIM_RPC_FAILED: ${claimError.message}`);
    }

    if (!claimedJobs || claimedJobs.length === 0) {
      console.log(`[${workerId}] No jobs available`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          worker_id: workerId,
          jobs_claimed: 0, 
          message: 'No jobs available' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobs = claimedJobs as QueueJob[];
    console.log(`[${workerId}] Claimed ${jobs.length} jobs via SKIP LOCKED`);

    // Process each job
    const results: JobResult[] = [];
    let totalTemplatesWritten = 0;
    let totalTemplatesFailed = 0;
    let jobsCompleted = 0;
    let jobsFailed = 0;
    let jobsRequeued = 0;

    for (const job of jobs) {
      const timeElapsed = Date.now() - workerStartTime;
      const timeRemaining = CONFIG.MAX_RUNTIME_MS - timeElapsed;

      // Don't start new job if not enough time remaining
      if (timeRemaining < CONFIG.MIN_TIME_FOR_NEW_JOB) {
        console.log(`[${workerId}] Time limit approaching (${timeRemaining}ms left), requeuing remaining jobs`);
        // Requeue this and remaining jobs
        const remainingIds = jobs.slice(jobs.indexOf(job)).map(j => j.id);
        await supabase
          .from('template_generation_queue')
          .update({
            status: 'queued',
            locked_at: null,
            locked_by: null,
          })
          .in('id', remainingIds);
        jobsRequeued += remainingIds.length;
        break;
      }

      const jobResult = await processJob(
        job,
        supabase,
        openaiKey,
        workerId,
        dry_run,
        force_regen,
        workerStartTime
      );

      results.push(jobResult);
      totalTemplatesWritten += jobResult.tracks_written;
      totalTemplatesFailed += jobResult.tracks_failed;

      // Update queue status based on results
      const allTracksSucceeded = jobResult.tracks_written === jobResult.tracks_requested;

      if (allTracksSucceeded) {
        await supabase
          .from('template_generation_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            locked_at: null,
            locked_by: null,
            error_code: null,
            error_message: null,
          })
          .eq('id', job.id);
        jobsCompleted++;
      } else {
        // Check if failure was TIME_LIMIT (always requeue) vs actual error
        const hasTimeLimitOnly = jobResult.tracks.every(t => t.success || t.error_code === 'TIME_LIMIT');
        const shouldRetry = hasTimeLimitOnly || job.attempt_count < CONFIG.MAX_ATTEMPTS;
        const firstError = jobResult.tracks.find(t => !t.success);

        await supabase
          .from('template_generation_queue')
          .update({
            status: shouldRetry ? 'queued' : 'failed',
            locked_at: null,
            locked_by: null,
            error_code: firstError?.error_code || 'PARTIAL_FAILURE',
            error_message: `${jobResult.tracks_written}/${jobResult.tracks_requested} tracks succeeded. ${firstError?.error_message || ''}`,
          })
          .eq('id', job.id);

        if (shouldRetry) {
          jobsRequeued++;
        } else {
          jobsFailed++;
        }
      }
    }

    const runtime = Date.now() - workerStartTime;
    console.log(`[${workerId}] Done in ${runtime}ms: ${jobsCompleted} completed, ${jobsFailed} failed, ${jobsRequeued} requeued, ${totalTemplatesWritten} templates written`);

    return new Response(
      JSON.stringify({
        success: true,
        worker_id: workerId,
        dry_run,
        runtime_ms: runtime,
        jobs_claimed: jobs.length,
        jobs_completed: jobsCompleted,
        jobs_failed: jobsFailed,
        jobs_requeued: jobsRequeued,
        templates_written: totalTemplatesWritten,
        templates_failed: totalTemplatesFailed,
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

async function processJob(
  job: QueueJob,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  openaiKey: string,
  workerId: string,
  dryRun: boolean,
  forceRegen: boolean,
  workerStartTime: number
): Promise<JobResult> {
  const tracks = job.desired_tracks || ['standard'];
  const trackResults: TrackResult[] = [];

  try {
    // Load program data
    const { data: program, error: programError } = await supabase
      .from('program_catalog')
      .select('*')
      .eq('id', job.program_catalog_id)
      .single();

    if (programError || !program) {
      // All tracks fail if program not found
      for (const track of tracks) {
        trackResults.push({
          success: false,
          track,
          template_written: false,
          error_code: 'PROGRAM_NOT_FOUND',
          error_message: `Program ${job.program_catalog_id} not found`,
        });
      }
      return {
        job_id: job.id,
        program_slug: job.program_slug,
        tracks_requested: tracks.length,
        tracks_written: 0,
        tracks_failed: tracks.length,
        tracks: trackResults,
      };
    }

    const programData = program as ProgramCatalog;

    // ========================================================================
    // POLICY GATE CHECK (Write-Time Enforcement)
    // Fetch active policy pack for institution and verify it passes the gate
    // ========================================================================
    const { data: policyPack } = await supabase
      .from('institution_policy_packs')
      .select('id, policy_data, provenance_url, field_provenance')
      .eq('institution', programData.institution_code)
      .eq('status', 'active')
      .single();

    let gateResult: PolicyGateResult | null = null;
    
    if (policyPack) {
      const policyData = policyPack.policy_data || {};
      
      // Check for ground truth verification
      const hasGroundTruth = !!(
        policyData.provenance_verified_at ||
        policyPack.provenance_url ||
        (policyPack.field_provenance && Object.values(policyPack.field_provenance as Record<string, { source?: string }>)
          .some((f: { source?: string }) => f?.source === 'ground_truth' || f?.source === 'human_override'))
      );
      
      gateResult = evaluatePolicyGate(policyData, hasGroundTruth);
      console.log(`[${workerId}] ${programData.institution_code} gate check: ${gateResult.status} (score: ${gateResult.score}, groundTruth: ${hasGroundTruth})`);
      
      if (!gateResult.canGenerate) {
        console.warn(`[${workerId}] ⛔ BLOCKED: ${programData.institution_code} - ${gateResult.reason}`);
        for (const track of tracks) {
          trackResults.push({
            success: false,
            track,
            template_written: false,
            error_code: 'POLICY_GATE_BLOCKED',
            error_message: `Template generation blocked: ${gateResult.reason}`,
          });
        }
        return {
          job_id: job.id,
          program_slug: job.program_slug,
          tracks_requested: tracks.length,
          tracks_written: 0,
          tracks_failed: tracks.length,
          tracks: trackResults,
        };
      }
    } else {
      // No policy pack found - block generation
      console.warn(`[${workerId}] ⛔ BLOCKED: ${programData.institution_code} - No active policy pack found`);
      for (const track of tracks) {
        trackResults.push({
          success: false,
          track,
          template_written: false,
          error_code: 'NO_POLICY_PACK',
          error_message: 'No active policy pack found for institution',
        });
      }
      return {
        job_id: job.id,
        program_slug: job.program_slug,
        tracks_requested: tracks.length,
        tracks_written: 0,
        tracks_failed: tracks.length,
        tracks: trackResults,
      };
    }

    // v1.4: Fetch override config ONCE per job (institution-level)
    // Then compute effective threshold per-template in-memory
    const invariantConfigBase = await fetchInstitutionOverridesBase(supabase, programData.institution_code);
    console.log(`[${workerId}] Fetched invariant config for ${programData.institution_code}:`, {
      unknownCreditsWarnThreshold: invariantConfigBase.unknownCreditsWarnThreshold,
      unknownCreditsActiveHardZero: invariantConfigBase.unknownCreditsActiveHardZero,
      hasOverrides: invariantConfigBase.hasOverrides,
    });

    // Check which templates already exist (for resume/skip logic)
    const { data: existingTemplates } = await supabase
      .from('program_templates')
      .select('track')
      .eq('program_catalog_id', job.program_catalog_id);
    
    const existingTracks = new Set((existingTemplates || []).map((t: { track: string }) => t.track));

    // Process each track
    for (const track of tracks) {
      // Check time remaining before starting track
      const timeRemaining = CONFIG.MAX_RUNTIME_MS - (Date.now() - workerStartTime);
      if (timeRemaining < CONFIG.MIN_TIME_FOR_NEW_JOB) {
        console.log(`[${workerId}] Skipping track ${track} - not enough time (${timeRemaining}ms)`);
        trackResults.push({
          success: false,
          track,
          template_written: false,
          error_code: 'TIME_LIMIT',
          error_message: `Skipped - only ${timeRemaining}ms remaining`,
        });
        continue;
      }

      // Skip if template already exists (unless force_regen)
      if (existingTracks.has(track) && !forceRegen) {
        console.log(`[${workerId}] ⏭ Skipping ${track} for ${job.program_slug} - template exists`);
        trackResults.push({
          success: true,
          track,
          template_written: true, // Already exists, counts as written
        });
        continue;
      }

      if (dryRun) {
        console.log(`[${workerId}] DRY RUN: Would generate ${track} for ${job.program_slug}`);
        trackResults.push({
          success: true,
          track,
          template_written: false, // Dry run doesn't write
        });
        continue;
      }

      const result = await generateAndWriteTemplate(
        openaiKey,
        programData,
        track,
        supabase,
        workerId,
        gateResult!, // Pass gate result for status/reason tracking
        invariantConfigBase, // v1.4: Pass pre-fetched config (no DB call per-track)
        job.id // v1.5: Pass job ID for invariant snapshot traceability
      );
      trackResults.push(result);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${workerId}] Job ${job.id} error:`, errorMessage);
    
    // Mark all remaining tracks as failed
    const processedTracks = trackResults.map(t => t.track);
    for (const track of tracks) {
      if (!processedTracks.includes(track)) {
        trackResults.push({
          success: false,
          track,
          template_written: false,
          error_code: 'JOB_ERROR',
          error_message: errorMessage,
        });
      }
    }
  }

  return {
    job_id: job.id,
    program_slug: job.program_slug,
    tracks_requested: tracks.length,
    tracks_written: trackResults.filter(t => t.template_written).length,
    tracks_failed: trackResults.filter(t => !t.success).length,
    tracks: trackResults,
  };
}

async function generateAndWriteTemplate(
  openaiKey: string,
  program: ProgramCatalog,
  track: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workerId: string,
  gateResult: PolicyGateResult, // Policy gate result for status tracking
  invariantConfigBase: EffectiveInvariantConfig, // v1.4: Pre-fetched config (no DB call here)
  jobId: string // v1.5: Job ID for invariant snapshot traceability
): Promise<TrackResult> {
  const startTime = Date.now();

  try {
    const prompt = buildTemplatePrompt(program, track);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.OPENAI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are an academic advisor AI that creates degree completion templates. Output valid JSON only, no markdown.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          success: false,
          track,
          template_written: false,
          error_code: 'OPENAI_TIMEOUT',
          error_message: `OpenAI request timed out after ${CONFIG.OPENAI_TIMEOUT_MS}ms`,
          generation_time_ms: Date.now() - startTime,
        };
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        track,
        template_written: false,
        error_code: 'OPENAI_API_ERROR',
        error_message: `${response.status}: ${errorText.slice(0, 200)}`,
        generation_time_ms: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const tokensUsed = data.usage?.total_tokens || 0;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        track,
        template_written: false,
        error_code: 'MODEL_EMPTY',
        error_message: 'OpenAI returned empty content',
        tokens_used: tokensUsed,
        generation_time_ms: Date.now() - startTime,
      };
    }

    // Parse the template JSON
    let templateJson: unknown;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      templateJson = JSON.parse(cleaned);
    } catch (parseError) {
      return {
        success: false,
        track,
        template_written: false,
        error_code: 'PARSE_FAIL',
        error_message: `Failed to parse template JSON: ${parseError}`,
        tokens_used: tokensUsed,
        generation_time_ms: Date.now() - startTime,
      };
    }

    const generationTimeMs = Date.now() - startTime;

    // Determine template status based on policy gate result
    const templateStatus = getTemplateStatus(gateResult);

    // STRICT: Upsert into program_templates and verify write
    const { data: upsertedRow, error: upsertError } = await supabase
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
          // Include policy gate info in snapshot for audit
          policy_gate: {
            status: gateResult.status,
            score: gateResult.score,
            reason: gateResult.reason,
            hasGroundTruth: gateResult.hasGroundTruth,
          },
        },
        // Template visibility status based on policy gate
        // Note: Adding to source_snapshot since we can't modify table schema here
      }, { onConflict: 'program_catalog_id,track' })
      .select('id')
      .single();

    if (upsertError) {
      return {
        success: false,
        track,
        template_written: false,
        error_code: 'DB_WRITE_FAILED',
        error_message: upsertError.message,
        tokens_used: tokensUsed,
        generation_time_ms: generationTimeMs,
      };
    }

    // Verify template was actually written
    if (!upsertedRow?.id) {
      return {
        success: false,
        track,
        template_written: false,
        error_code: 'WRITE_UNVERIFIED',
        error_message: 'Upsert succeeded but no row returned',
        tokens_used: tokensUsed,
        generation_time_ms: generationTimeMs,
      };
    }

    console.log(`[${workerId}] ✓ ${track} template for ${program.program_slug} (${tokensUsed} tokens, ${generationTimeMs}ms)`);

    // Run invariant check on the generated template
    const templateData = templateJson as { terms?: Array<{ slots?: Array<any> }> };
    const invariantItems: TemplateItem[] = (templateData.terms || []).flatMap((term) => 
      (term.slots || []).map((slot: any) => ({
        course_code: slot.courseCode || slot.slotId,
        credits: slot.credits || 3,
        source: slot.source || 'resident',
        is_upper_division: slot.level === 'upper' || slot.level === '400',
        is_capstone: slot.kind === 'capstone',
      }))
    );

    // v1.1: Don't assume capstone_in_residence - only set what we know
    // The worker doesn't have access to full policy packs, so we only check credits
    const invariantPolicy = normalizePolicyData({
      degree_credit_total: program.degree_total_credits ?? undefined,
      // capstone_in_residence: intentionally NOT set - don't assume all programs require it
    } as RawPolicyPack);

    // v1.4: Compute effective threshold in-memory from pre-fetched config
    // No DB call here - config was fetched once per job
    const effectiveWarnThreshold = computeEffectiveThreshold(invariantConfigBase, templateStatus);

    const invariantReport = checkTemplateInvariants({
      template_id: upsertedRow.id,
      template_table: 'program_templates',
      institution_code: program.institution_code,
      program_code: program.program_slug,
      policy_data: invariantPolicy,
      items: invariantItems,
      mode: 'warn_only', // Use warn_only for worker since templates are still experimental
      unknown_credits_warn_threshold: effectiveWarnThreshold, // v1.4: Per-template threshold (computed in-memory)
      unknown_credits_active_hard_zero: invariantConfigBase.unknownCreditsActiveHardZero, // v1.4: From pre-fetched config
    });

    // Store audit record
    await supabase.from('template_invariant_reports').insert(buildAuditRecord({
      template_id: upsertedRow.id,
      template_table: 'program_templates',
      institution_code: program.institution_code,
      program_code: program.program_slug,
      run_source: 'worker',
      report: invariantReport,
    }));

    // v1.5: Write invariant decision snapshot for audit trail
    // Uses the effective config actually used for this template's evaluation
    const snapshotEffectiveConfig = buildSnapshotEffectiveConfig(invariantConfigBase, effectiveWarnThreshold);
    await writeInvariantDecisionSnapshot(supabase, {
      job_id: jobId, // v1.5: Now properly tracked for audit trail
      template_id: upsertedRow.id,
      institution_code: program.institution_code,
      program_catalog_id: program.id,
      track,
      template_status: templateStatus,
      effective_config: snapshotEffectiveConfig,
      violations: [...invariantReport.errors, ...invariantReport.warnings],
    });

    console.log(`[${workerId}] Invariant check: ${invariantReport.summary}`);

    return {
      success: true,
      track,
      template_written: true,
      tokens_used: tokensUsed,
      generation_time_ms: generationTimeMs,
    };

  } catch (error) {
    return {
      success: false,
      track,
      template_written: false,
      error_code: 'GENERATION_ERROR',
      error_message: error instanceof Error ? error.message : 'Unknown generation error',
      generation_time_ms: Date.now() - startTime,
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

  return `Create a degree completion template for:

Institution: ${program.institution_code}
Program: ${program.program_name_raw}
Degree Type: ${program.degree_type}
Total Credits: ${program.degree_total_credits || 120}
Track: ${track} - ${trackDescriptions[track] || 'Standard approach'}

Return JSON:
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
          "requirementArea": "WRITTEN_COMM"|"QUANTITATIVE"|"HUMANITIES"|"SOCIAL_SCIENCE"|"NATURAL_SCIENCE"|"BUS_CORE"|"FREE_ELECTIVE"|"UPPER_BUSINESS"|"CAPSTONE",
          "kind": "gened"|"major"|"elective"|"capstone",
          "minCredits": 3,
          "preferred": {
            "type": "institutional_course"|"alt_credit",
            "courseCode": "ENG-101",
            "sourceCode": "CLEP"|"DSST"|"SOPHIA"|"STUDY_COM",
            "identifier": "college-composition"
          },
          "alternatives": [...]
        }
      ]
    }
  ]
}

Requirements:
1. Include all gen-ed requirements for a ${program.degree_type} degree
2. Include major courses for ${program.program_name_raw}
3. For ${track}: ${trackDescriptions[track]}
4. 8-12 terms (2-4 years)
5. Use CLEP/DSST/Sophia/Study.com for alt_credit where applicable

Output only valid JSON.`;
}
