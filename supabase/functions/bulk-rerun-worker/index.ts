/**
 * Bulk Rerun Worker Edge Function
 * 
 * Processes queued templates in batches from a bulk rerun job.
 * Called by UI polling or cron scheduler.
 * 
 * POST /bulk-rerun-worker
 * Body: { job_id: string, batch_size?: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { 
  checkTemplateInvariants, 
  normalizePolicyData,
  type TemplateItem,
  type RawPolicyPack,
} from '../_shared/creditInvariantChecker.ts';
import { 
  deriveInvariantDecision,
  INVARIANT_VERSION,
  buildSnapshotEffectiveConfig,
} from '../_shared/invariantDecisionSnapshot.ts';
import { 
  fetchInstitutionOverridesBase,
  computeEffectiveThreshold,
} from '../_shared/institutionOverrides.ts';

// ============================================
// CORS
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store',
};

// ============================================
// TYPES
// ============================================

interface WorkerRequest {
  job_id: string;
  batch_size?: number;
}

interface WorkerResponse {
  job_id: string;
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  status: 'processing' | 'completed' | 'job_not_found' | 'no_work';
}

interface TemplateJsonTerm {
  slots?: Array<{
    courseCode?: string;
    slotId?: string;
    credits?: number;
    minCredits?: number;
    source?: string;
    level?: string;
    kind?: string;
    preferred?: {
      courseCode?: string;
      type?: string;
      sourceCode?: string;
    };
  }>;
}

// ============================================
// TEMPLATE EXTRACTION (same as single rerun)
// ============================================

function extractTemplateItems(templateJson: unknown): TemplateItem[] {
  const data = templateJson as { terms?: TemplateJsonTerm[] };
  if (!data?.terms) return [];

  return data.terms.flatMap((term) =>
    (term.slots || []).map((slot) => {
      const courseCode = slot.courseCode || slot.preferred?.courseCode || slot.slotId;
      const credits = slot.credits ?? slot.minCredits ?? 3;
      const source = slot.source || 
        (slot.preferred?.type === 'alt_credit' 
          ? (slot.preferred?.sourceCode?.toLowerCase() || 'alt') 
          : 'resident');
      
      return {
        course_code: courseCode,
        credits,
        source,
        is_upper_division: slot.level === 'upper' || slot.level === '400',
        is_capstone: slot.kind === 'capstone',
        kind: slot.kind,
        level: slot.level,
      };
    })
  );
}

// ============================================
// PROCESS SINGLE TEMPLATE
// ============================================

async function processTemplate(
  supabase: any,
  templateId: string,
  bulkJobId: string
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    // Load template from program_templates
    const { data: template, error: templateError } = await supabase
      .from('program_templates')
      .select('id, institution_code, program_slug, program_catalog_id, track, template_json')
      .eq('id', templateId)
      .maybeSingle();

    if (templateError) {
      return { success: false, error: `Template fetch error: ${templateError.message}` };
    }

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Extract template items for invariant checking
    const items = extractTemplateItems(template.template_json);

    // Fetch institution overrides
    const invariantConfigBase = await fetchInstitutionOverridesBase(
      supabase,
      template.institution_code
    );

    // Determine template status from latest snapshot
    const { data: latestSnapshot } = await supabase
      .from('invariant_decision_snapshots')
      .select('template_status')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const templateStatus = latestSnapshot?.template_status || 'pending_review';
    const effectiveWarnThreshold = computeEffectiveThreshold(invariantConfigBase, templateStatus);

    // Build policy data
    const invariantPolicy = normalizePolicyData({
      degree_credit_total: 120,
    } as RawPolicyPack);

    // Run invariant check
    const invariantReport = checkTemplateInvariants({
      template_id: templateId,
      template_table: 'program_templates',
      institution_code: template.institution_code,
      program_code: template.program_slug,
      policy_data: invariantPolicy,
      items,
      mode: 'warn_only',
      template_status: templateStatus,
      unknown_credits_warn_threshold: effectiveWarnThreshold,
      unknown_credits_active_hard_zero: invariantConfigBase.unknownCreditsActiveHardZero,
    });

    // Compute decision and violation codes
    const allViolations = [...invariantReport.errors, ...invariantReport.warnings];
    const decision = deriveInvariantDecision(allViolations);
    const violationCodes = allViolations.map(v => v.type);

    // Write snapshot with bulk_job_id
    const snapshotEffectiveConfig = buildSnapshotEffectiveConfig(invariantConfigBase, effectiveWarnThreshold);
    
    const { data: newSnapshot, error: writeError } = await supabase
      .from('invariant_decision_snapshots')
      .insert({
        job_id: null, // Manual-style rerun (no generation job)
        bulk_job_id: bulkJobId, // Link to bulk job for tracking
        template_id: templateId,
        institution_code: template.institution_code,
        program_catalog_id: template.program_catalog_id ?? null,
        track: template.track ?? null,
        template_status: templateStatus,
        invariant_version: INVARIANT_VERSION,
        effective_config: snapshotEffectiveConfig,
        decision,
        violation_codes: violationCodes,
        data_source: 'real',
      })
      .select('id')
      .single();

    if (writeError) {
      return { success: false, error: `Snapshot write error: ${writeError.message}` };
    }

    return { success: true, snapshotId: newSnapshot.id };

  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// HANDLER
// ============================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Auth: get user from token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin check
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: WorkerRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { job_id, batch_size = 10 } = body;

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for writes
    const supabaseService = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Check job exists and is active
    const { data: job, error: jobError } = await supabaseService
      .from('bulk_rerun_jobs')
      .select('id, status, total, processed, succeeded, failed')
      .eq('id', job_id)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ 
          job_id, 
          processed: 0, 
          succeeded: 0, 
          failed: 0, 
          remaining: 0, 
          status: 'job_not_found' 
        } as WorkerResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'canceled' || job.status === 'succeeded' || job.status === 'failed') {
      return new Response(
        JSON.stringify({ 
          job_id, 
          processed: job.processed, 
          succeeded: job.succeeded, 
          failed: job.failed, 
          remaining: job.total - job.processed, 
          status: 'completed' 
        } as WorkerResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job to running if still queued
    if (job.status === 'queued') {
      await supabaseService
        .from('bulk_rerun_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', job_id);
    }

    // Atomic claim: update queued rows to running
    const { data: claimed, error: claimError } = await supabaseService
      .from('bulk_rerun_queue')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        attempts: 1, // Increment on claim
      })
      .eq('job_id', job_id)
      .eq('status', 'queued')
      .limit(batch_size)
      .select('id, template_id');

    if (claimError) {
      console.error(`[bulk-rerun-worker] Claim error: ${claimError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to claim work items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!claimed || claimed.length === 0) {
      // No work to do - check if job is complete
      const { data: remaining } = await supabaseService
        .from('bulk_rerun_queue')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', job_id)
        .in('status', ['queued', 'running']);

      if (!remaining || (remaining as any).count === 0) {
        // Mark job complete
        await supabaseService
          .from('bulk_rerun_jobs')
          .update({ 
            status: 'succeeded', 
            completed_at: new Date().toISOString(),
          })
          .eq('id', job_id);
      }

      return new Response(
        JSON.stringify({ 
          job_id, 
          processed: 0, 
          succeeded: 0, 
          failed: 0, 
          remaining: 0, 
          status: 'no_work' 
        } as WorkerResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[bulk-rerun-worker] Processing ${claimed.length} templates for job ${job_id}`);

    // Process each claimed template
    let succeeded = 0;
    let failed = 0;

    for (const item of claimed) {
      const result = await processTemplate(supabaseService, item.template_id, job_id);

      if (result.success) {
        succeeded++;
        await supabaseService
          .from('bulk_rerun_queue')
          .update({
            status: 'succeeded',
            completed_at: new Date().toISOString(),
            snapshot_id: result.snapshotId,
          })
          .eq('id', item.id);
      } else {
        failed++;
        await supabaseService
          .from('bulk_rerun_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            last_error: result.error,
          })
          .eq('id', item.id);
      }
    }

    // Update job counters directly
    await supabaseService
      .from('bulk_rerun_jobs')
      .update({
        processed: job.processed + claimed.length,
        succeeded: job.succeeded + succeeded,
        failed: job.failed + failed,
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    // Check remaining count
    const { count: remainingCount } = await supabaseService
      .from('bulk_rerun_queue')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', job_id)
      .in('status', ['queued', 'running']);

    // If no remaining work, mark job complete
    if (remainingCount === 0) {
      await supabaseService
        .from('bulk_rerun_jobs')
        .update({ 
          status: 'succeeded', 
          completed_at: new Date().toISOString(),
        })
        .eq('id', job_id);
    }

    const response: WorkerResponse = {
      job_id,
      processed: claimed.length,
      succeeded,
      failed,
      remaining: remainingCount ?? 0,
      status: remainingCount === 0 ? 'completed' : 'processing',
    };

    console.log(`[bulk-rerun-worker] Job ${job_id}: processed=${claimed.length}, succeeded=${succeeded}, failed=${failed}, remaining=${remainingCount}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[bulk-rerun-worker] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
