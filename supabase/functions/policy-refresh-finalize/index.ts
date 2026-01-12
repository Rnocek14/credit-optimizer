// =============================================================================
// POLICY-REFRESH-FINALIZE - Run Completion & Summary
// =============================================================================
// This Edge Function finalizes a policy refresh run by:
// 1. Verifying all tasks are in terminal state (complete | blocked | failed)
// 2. Computing summary statistics
// 3. Updating transfer_batch_runs.status to 'complete'
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FinalizeRequest {
  run_id: string;
  force?: boolean; // Force complete even if tasks not terminal
}

interface TaskSummary {
  total: number;
  complete: number;
  blocked: number;
  failed: number;
  running: number;
  queued: number;
}

interface FinalizeResult {
  success: boolean;
  run_id: string;
  status: 'complete' | 'running' | 'partial';
  message: string;
  task_summary: TaskSummary;
  diffs_count: number;
  packs_created: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const body: FinalizeRequest = await req.json();
    const { run_id, force = false } = body;

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[finalize] Starting for run: ${run_id}${force ? ' (forced)' : ''}`);

    // Get current run status
    const { data: run, error: runError } = await supabase
      .from('transfer_batch_runs')
      .select('id, status, started_at')
      .eq('id', run_id)
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Run not found', details: runError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all tasks for this run
    const { data: tasks, error: tasksError } = await supabase
      .from('policy_refresh_tasks')
      .select('id, institution, status, reason, metrics, completed_at')
      .eq('run_id', run_id);

    if (tasksError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tasks', details: tasksError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute task summary
    const taskSummary: TaskSummary = {
      total: tasks?.length ?? 0,
      complete: tasks?.filter(t => t.status === 'complete').length ?? 0,
      blocked: tasks?.filter(t => t.status === 'blocked').length ?? 0,
      failed: tasks?.filter(t => t.status === 'failed').length ?? 0,
      running: tasks?.filter(t => t.status === 'running').length ?? 0,
      queued: tasks?.filter(t => t.status === 'queued').length ?? 0,
    };

    const terminalCount = taskSummary.complete + taskSummary.blocked + taskSummary.failed;
    const allTerminal = terminalCount === taskSummary.total && taskSummary.total > 0;

    console.log(`[finalize] Task summary: ${JSON.stringify(taskSummary)}, allTerminal=${allTerminal}`);

    // Get diffs count for this run
    const { count: diffsCount } = await supabase
      .from('policy_refresh_diffs')
      .select('id', { count: 'exact', head: true })
      .eq('run_id', run_id);

    // Get packs created in this run
    const { count: packsCount } = await supabase
      .from('institution_policy_packs')
      .select('id', { count: 'exact', head: true })
      .eq('last_run_id', run_id);

    // Determine final status
    let finalStatus: 'complete' | 'running' | 'partial';
    let message: string;

    if (!allTerminal && !force) {
      // Not all tasks complete and not forcing
      finalStatus = 'running';
      message = `Run still in progress: ${terminalCount}/${taskSummary.total} tasks terminal`;
      
      return new Response(
        JSON.stringify({
          success: false,
          run_id,
          status: finalStatus,
          message,
          task_summary: taskSummary,
          diffs_count: diffsCount ?? 0,
          packs_created: packsCount ?? 0,
        } satisfies FinalizeResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All tasks terminal OR forcing - mark run complete
    const summary = {
      task_summary: taskSummary,
      diffs_count: diffsCount ?? 0,
      packs_created: packsCount ?? 0,
      forced: force && !allTerminal,
      completed_at: new Date().toISOString(),
      duration_ms: run.started_at 
        ? new Date().getTime() - new Date(run.started_at).getTime()
        : null,
    };

    const { error: updateError } = await supabase
      .from('transfer_batch_runs')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
        summary,
      })
      .eq('id', run_id);

    if (updateError) {
      console.error('[finalize] Error updating run:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update run status', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    finalStatus = allTerminal ? 'complete' : 'partial';
    message = allTerminal 
      ? `Run finalized: ${taskSummary.complete} complete, ${taskSummary.blocked} blocked, ${taskSummary.failed} failed`
      : `Run force-finalized with ${taskSummary.running} running, ${taskSummary.queued} queued tasks`;

    console.log(`[finalize] ${message}`);

    const result: FinalizeResult = {
      success: true,
      run_id,
      status: finalStatus,
      message,
      task_summary: taskSummary,
      diffs_count: diffsCount ?? 0,
      packs_created: packsCount ?? 0,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[finalize] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
