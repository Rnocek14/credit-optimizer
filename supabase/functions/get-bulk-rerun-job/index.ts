/**
 * Get Bulk Rerun Job Edge Function
 * 
 * Admin-only endpoint to fetch status and progress of a bulk rerun job.
 * Used by UI for polling progress.
 * 
 * GET /get-bulk-rerun-job?job_id=xxx
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

interface BulkRerunJobResponse {
  job: {
    id: string;
    created_at: string;
    created_by: string;
    status: string;
    filter: Record<string, unknown>;
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    started_at: string | null;
    completed_at: string | null;
    last_heartbeat_at: string | null;
    error: string | null;
  };
  progress_percent: number;
  recent_failures: Array<{
    id: string;
    template_id: string;
    last_error: string | null;
    snapshot_id: string | null;
  }>;
}

// ============================================
// HANDLER
// ============================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
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

    // Parse query params
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'job_id query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for reads
    const supabaseService = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Fetch job
    const { data: job, error: jobError } = await supabaseService
      .from('bulk_rerun_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError) {
      console.error(`[get-bulk-rerun-job] Job fetch error: ${jobError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent failures (last 20)
    const { data: failures } = await supabaseService
      .from('bulk_rerun_queue')
      .select('id, template_id, last_error, snapshot_id')
      .eq('job_id', jobId)
      .eq('status', 'failed')
      .order('completed_at', { ascending: false })
      .limit(20);

    // Calculate progress
    const progressPercent = job.total > 0 
      ? Math.round((job.processed / job.total) * 100) 
      : 0;

    const response: BulkRerunJobResponse = {
      job: {
        id: job.id,
        created_at: job.created_at,
        created_by: job.created_by,
        status: job.status,
        filter: job.filter,
        total: job.total,
        processed: job.processed,
        succeeded: job.succeeded,
        failed: job.failed,
        started_at: job.started_at,
        completed_at: job.completed_at,
        last_heartbeat_at: job.last_heartbeat_at,
        error: job.error,
      },
      progress_percent: progressPercent,
      recent_failures: failures || [],
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[get-bulk-rerun-job] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
