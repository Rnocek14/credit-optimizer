/**
 * Bulk Rerun Templates Edge Function
 * 
 * Admin-only endpoint to create a bulk rerun job for templates matching
 * specified criteria (e.g., all BLOCK templates).
 * 
 * POST /bulk-rerun-templates
 * Body: { 
 *   decision: 'block' | 'warn',
 *   institution_code?: string,
 *   track?: string,
 *   template_ids?: string[],
 *   confirm: "BULK_RERUN_BLOCK_TEMPLATES" | "BULK_RERUN_WARN_TEMPLATES"
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { checkV1InstitutionScope } from '../_shared/policyGate.ts';

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

interface BulkRerunRequest {
  decision: 'block' | 'warn';
  institution_code?: string;
  track?: string;
  template_ids?: string[];
  confirm: string;
}

interface BulkRerunResponse {
  job_id: string;
  total: number;
  status: string;
  filter: Record<string, unknown>;
}

// ============================================
// HELPER: Check for existing running job with same filter
// ============================================

async function findExistingJob(
  supabase: any, 
  filter: Record<string, unknown>
): Promise<string | null> {
  const { data } = await supabase
    .from('bulk_rerun_jobs')
    .select('id')
    .in('status', ['queued', 'running'])
    .eq('filter', filter)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id || null;
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
      console.error(`[bulk-rerun-templates] Auth error: ${userError?.message}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin check via user_roles table
    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error(`[bulk-rerun-templates] Role check error: ${roleError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: BulkRerunRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { decision, institution_code, track, template_ids, confirm } = body;

    // V1 SCOPE ENFORCEMENT: If specific institution provided, verify it's allowed
    if (institution_code) {
      const scopeCheck = checkV1InstitutionScope(institution_code);
      if (!scopeCheck.allowed) {
        console.warn(`[bulk-rerun-templates] V1 scope block: ${scopeCheck.reason}`);
        return new Response(
          JSON.stringify({ error: 'INSTITUTION_NOT_IN_V1_SCOPE', message: scopeCheck.reason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    if (!decision || !['block', 'warn'].includes(decision)) {
      return new Response(
        JSON.stringify({ error: 'decision must be "block" or "warn"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate confirmation string (safety guardrail)
    const expectedConfirm = decision === 'block' 
      ? 'BULK_RERUN_BLOCK_TEMPLATES'
      : 'BULK_RERUN_WARN_TEMPLATES';
    
    if (confirm !== expectedConfirm) {
      return new Response(
        JSON.stringify({ 
          error: `Confirmation required: type "${expectedConfirm}" to confirm`,
          expected: expectedConfirm,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for writes
    const supabaseService = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Build filter for job record
    const filter: Record<string, unknown> = { decision };
    if (institution_code) filter.institution_code = institution_code;
    if (track) filter.track = track;
    if (template_ids?.length) filter.template_ids = template_ids;

    // Check for existing running job with same filter (idempotency)
    const existingJobId = await findExistingJob(supabaseService, filter);
    if (existingJobId) {
      console.log(`[bulk-rerun-templates] Returning existing job ${existingJobId}`);
      return new Response(
        JSON.stringify({ 
          job_id: existingJobId, 
          total: 0, 
          status: 'existing',
          filter,
          message: 'A job with the same filter is already running',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[bulk-rerun-templates] Admin ${user.email} creating bulk rerun job: ${JSON.stringify(filter)}`);

    // Query target templates using the admin RPC
    // If template_ids provided, use those; otherwise query by decision
    let targetTemplateIds: string[] = [];

    if (template_ids?.length) {
      targetTemplateIds = template_ids;
    } else {
      // Use the admin RPC to get templates with matching decision
      const { data: snapshots, error: snapshotError } = await supabaseService
        .rpc('admin_list_latest_invariant_snapshots', {
          p_institution_code: institution_code || null,
          p_track: track || null,
          p_decision: decision,
          p_template_ids: null,
          p_limit: 10000, // Large limit to get all
          p_offset: 0,
        });

      if (snapshotError) {
        console.error(`[bulk-rerun-templates] Snapshot query error: ${snapshotError.message}`);
        return new Response(
          JSON.stringify({ error: 'Failed to query templates' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetTemplateIds = (snapshots || []).map((s: any) => s.template_id);
    }

    if (targetTemplateIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No templates match the specified criteria',
          filter,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[bulk-rerun-templates] Found ${targetTemplateIds.length} templates to rerun`);

    // Create bulk_rerun_jobs record
    const { data: job, error: jobError } = await supabaseService
      .from('bulk_rerun_jobs')
      .insert({
        created_by: user.id,
        status: 'queued',
        filter,
        total: targetTemplateIds.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
      })
      .select('id')
      .single();

    if (jobError) {
      console.error(`[bulk-rerun-templates] Job creation error: ${jobError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to create bulk job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobId = job.id;
    console.log(`[bulk-rerun-templates] Created job ${jobId}`);

    // Insert queue rows (batch insert with upsert for idempotency)
    const queueRows = targetTemplateIds.map(templateId => ({
      job_id: jobId,
      template_id: templateId,
      status: 'queued',
      attempts: 0,
    }));

    // Insert in batches of 500 to avoid query size limits
    const BATCH_SIZE = 500;
    for (let i = 0; i < queueRows.length; i += BATCH_SIZE) {
      const batch = queueRows.slice(i, i + BATCH_SIZE);
      const { error: queueError } = await supabaseService
        .from('bulk_rerun_queue')
        .upsert(batch, { 
          onConflict: 'job_id,template_id',
          ignoreDuplicates: true,
        });

      if (queueError) {
        console.error(`[bulk-rerun-templates] Queue insert error at batch ${i}: ${queueError.message}`);
        // Continue with other batches
      }
    }

    console.log(`[bulk-rerun-templates] Enqueued ${targetTemplateIds.length} templates for job ${jobId}`);

    const response: BulkRerunResponse = {
      job_id: jobId,
      total: targetTemplateIds.length,
      status: 'queued',
      filter,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[bulk-rerun-templates] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
