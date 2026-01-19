import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { evaluatePolicyGate, getTemplateStatus, checkV1InstitutionScope, type PolicyData } from '../_shared/policyGate.ts';

// Critical env vars - fail fast with explicit names if missing
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const missingEnvVars: string[] = [];
if (!SUPABASE_URL) missingEnvVars.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Backoff schedule (attempt -> delay in ms)
const BACKOFF_MS: Record<number, number> = {
  1: 60_000,      // 1 min
  2: 300_000,     // 5 min
  3: 1_200_000,   // 20 min
  4: 7_200_000,   // 2 hr
  5: 43_200_000,  // 12 hr
};

interface Job {
  id: string;
  institution: string;
  program_code: string | null;
  pack_id: string | null;
  status: string;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  locked_at: string | null;
  locked_by: string | null;
  run_after: string;
}

interface ProcessRequest {
  batch_size?: number;
  job_id?: string;
  institution?: string;
  dry_run?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const workerStartTime = Date.now();
  const workerId = `job-proc-${crypto.randomUUID().slice(0, 8)}`;
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  console.log(`[${workerId}] Starting job processor`);

  try {
    const body: ProcessRequest = await req.json().catch(() => ({}));
    const { batch_size = 5, job_id, institution, dry_run = false } = body;

    // Mode 1: Process specific job
    if (job_id) {
      console.log(`[${workerId}] Processing specific job: ${job_id}`);
      const { data: job, error } = await supabase
        .from('template_generation_jobs')
        .select('*')
        .eq('id', job_id)
        .single();

      if (error || !job) {
        return new Response(
          JSON.stringify({ success: false, error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await processJob(supabase, job as Job, workerId, dry_run);
      return new Response(
        JSON.stringify({ success: true, results: [result] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode 2: Enqueue and process institution
    if (institution) {
      // V1 SCOPE ENFORCEMENT: Block institutions not in allowlist
      const scopeCheck = checkV1InstitutionScope(institution);
      if (!scopeCheck.allowed) {
        console.warn(`[${workerId}] V1 scope block: ${scopeCheck.reason}`);
        return new Response(
          JSON.stringify({ success: false, error: 'INSTITUTION_NOT_IN_V1_SCOPE', message: scopeCheck.reason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[${workerId}] Enqueueing job for institution: ${institution}`);
      
      // Find the active pack
      const { data: pack } = await supabase
        .from('institution_policy_packs')
        .select('id, policy_data, provenance_url, last_verified_at, field_provenance')
        .eq('institution', institution)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Enqueue job
      const { data: newJob, error: insertError } = await supabase
        .from('template_generation_jobs')
        .insert({
          institution,
          program_code: null,
          pack_id: pack?.id ?? null,
          status: 'queued',
          priority: 50,
          run_after: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError && insertError.code !== '23505') {
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newJob && !dry_run) {
        const result = await processJob(supabase, newJob as Job, workerId, dry_run);
        return new Response(
          JSON.stringify({ success: true, results: [result] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Job enqueued', job_id: newJob?.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode 3: Process batch of queued jobs using safe RPC with SKIP LOCKED
    console.log(`[${workerId}] Claiming up to ${batch_size} jobs`);

    // Atomically claim jobs - RPC uses FOR UPDATE SKIP LOCKED for concurrency safety
    const { data: claimedJobs, error: claimError } = await supabase.rpc('claim_template_generation_jobs', {
      p_worker_id: workerId,
      p_batch_size: batch_size,
    });

    if (claimError) {
      console.error(`[${workerId}] Failed to claim jobs:`, claimError);
      return new Response(
        JSON.stringify({ success: false, error: `Claim RPC failed: ${claimError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobs: Job[] = (claimedJobs || []) as Job[];

    console.log(`[${workerId}] Claimed ${jobs.length} jobs`);

    if (jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No jobs to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each job
    const results = [];
    for (const job of jobs) {
      const result = await processJob(supabase, job, workerId, dry_run);
      results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[${workerId}] Completed: ${succeeded} succeeded, ${failed} failed in ${Date.now() - workerStartTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        succeeded,
        failed,
        results,
        duration_ms: Date.now() - workerStartTime,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${workerId}] Error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process a single job - generates templates for an institution
 */
async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  workerId: string,
  dryRun: boolean
): Promise<{ job_id: string; success: boolean; error?: string; templates_created?: number }> {
  const startTime = Date.now();
  console.log(`[${workerId}] Processing job ${job.id} for ${job.institution}`);

  try {
    // Get the active policy pack for this institution
    const { data: pack, error: packError } = await supabase
      .from('institution_policy_packs')
      .select('*')
      .eq('institution', job.institution)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (packError || !pack) {
      throw new Error(`No active policy pack found for ${job.institution}`);
    }

    // Evaluate policy gate
    const policyData = (pack.policy_data || {}) as PolicyData;
    const hasGroundTruth = deriveHasGroundTruth(pack);
    const gate = evaluatePolicyGate(policyData, hasGroundTruth);

    console.log(`[${workerId}] Gate result for ${job.institution}:`, gate);

    if (!gate.canGenerate) {
      throw new Error(`Policy gate blocked: ${gate.reason}`);
    }

    // Determine template status based on gate
    const templateStatus = getTemplateStatus(gate);

    if (dryRun) {
      console.log(`[${workerId}] DRY RUN - would generate templates with status: ${templateStatus}`);
      await markJobSucceeded(supabase, job.id, 0, 0, 0, 0);
      return { job_id: job.id, success: true, templates_created: 0 };
    }

    // Call seed-bsba-templates to generate templates with job_id for traceability
    const seedResponse = await supabase.functions.invoke('seed-bsba-templates', {
      body: { institution_code: job.institution, job_id: job.id },
    });

    if (seedResponse.error) {
      throw new Error(`Template generation failed: ${seedResponse.error.message}`);
    }

    const seedResult = seedResponse.data;
    const templatesCreated = seedResult?.templates_created ?? seedResult?.created ?? 0;
    const templatesUpdated = seedResult?.templates_updated ?? seedResult?.updated ?? 0;
    const createdTemplateIds: string[] = seedResult?.templateIds ?? []; // UUIDs from seeder

    console.log(`[${workerId}] Generated ${templatesCreated} templates for ${job.institution} in ${Date.now() - startTime}ms`);

    // Post-update: Scope template status updates to only the templates from this run
    if (templateStatus !== 'active' && createdTemplateIds.length > 0) {
      const { error: statusUpdateError } = await supabase
        .from('degree_templates')
        .update({
          status: templateStatus,
          updated_at: new Date().toISOString(),
        })
        .in('id', createdTemplateIds) // Only update templates from THIS run
        .eq('status', 'active'); // Only downgrade active -> pending_review
      
      if (statusUpdateError) {
        console.warn(`[${workerId}] Warning: Failed to update template statuses:`, statusUpdateError);
      } else {
        console.log(`[${workerId}] Post-updated ${createdTemplateIds.length} templates to status: ${templateStatus}`);
      }
    }

    // Get real invariant counts from template_invariant_reports (linked by job_id at creation)
    const { data: jobReports } = await supabase
      .from('template_invariant_reports')
      .select('id, ok')
      .eq('job_id', job.id); // Direct link - no time window needed

    // Use `ok` boolean field for accurate counting
    const invariantsPassed = jobReports?.filter(r => r.ok === true).length ?? 0;
    const invariantsFailed = jobReports?.filter(r => r.ok === false).length ?? 0;
    const totalReports = (jobReports?.length ?? 0);

    // Note: job_id is now written at report creation time in seed-bsba-templates
    // No need for post-hoc assignment

    // SAFEGUARD: If templates were created but no invariant reports exist, fail the job
    // This catches upstream failures in the invariant writer
    const totalTemplates = templatesCreated + templatesUpdated;
    if (totalTemplates > 0 && totalReports === 0) {
      throw new Error(`No invariant reports found for job_id ${job.id} - invariant checker may have failed`);
    }

    // Mark job succeeded with real counts
    await markJobSucceeded(supabase, job.id, templatesCreated, templatesUpdated, invariantsPassed, invariantsFailed);

    return { job_id: job.id, success: true, templates_created: templatesCreated };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${workerId}] Job ${job.id} failed:`, errorMessage);

    // Mark job failed with retry logic
    await markJobFailed(supabase, job, errorMessage);

    return { job_id: job.id, success: false, error: errorMessage };
  }
}

/**
 * Mark job as succeeded
 */
async function markJobSucceeded(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  templatesCreated: number,
  templatesUpdated: number,
  invariantsPassed: number,
  invariantsFailed: number
) {
  await supabase
    .from('template_generation_jobs')
    .update({
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      templates_created: templatesCreated,
      templates_updated: templatesUpdated,
      invariants_passed: invariantsPassed,
      invariants_failed: invariantsFailed,
    })
    .eq('id', jobId);
}

/**
 * Mark job as failed with retry backoff
 */
async function markJobFailed(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  errorMessage: string
) {
  const newAttemptCount = job.attempt_count + 1;
  const shouldRetry = newAttemptCount < job.max_attempts;
  const backoffMs = BACKOFF_MS[newAttemptCount] ?? BACKOFF_MS[5];
  const runAfter = new Date(Date.now() + backoffMs).toISOString();

  await supabase
    .from('template_generation_jobs')
    .update({
      status: shouldRetry ? 'queued' : 'failed',
      attempt_count: newAttemptCount,
      last_error: `[job:${job.id}][${job.institution}] ${errorMessage}`,
      run_after: shouldRetry ? runAfter : job.run_after,
      updated_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      completed_at: shouldRetry ? null : new Date().toISOString(),
    })
    .eq('id', job.id);
}

/**
 * Derive hasGroundTruth from pack fields
 */
function deriveHasGroundTruth(pack: {
  provenance_url?: string | null;
  last_verified_at?: string | null;
  policy_data?: Record<string, unknown> | null;
  field_provenance?: Record<string, unknown> | null;
}): boolean {
  if (pack.provenance_url) return true;
  if (pack.last_verified_at) return true;
  if (pack.policy_data?.provenance_verified_at) return true;
  
  if (pack.field_provenance && typeof pack.field_provenance === 'object') {
    const groundTruthSources = ['ground_truth', 'human_override', 'catalog_pdf'];
    
    for (const value of Object.values(pack.field_provenance)) {
      if (typeof value === 'string' && groundTruthSources.includes(value)) {
        return true;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sourceValue = (value as Record<string, unknown>).source;
        if (typeof sourceValue === 'string' && groundTruthSources.includes(sourceValue)) {
          return true;
        }
      }
    }
  }
  
  return false;
}
