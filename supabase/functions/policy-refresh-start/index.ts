// =============================================================================
// POLICY-REFRESH-START - Orchestrates policy refresh runs
// =============================================================================
// Creates a refresh run and tasks for each institution. This is the entry point
// for both manual and scheduled policy refreshes.
//
// Inputs:
// - institutions?: string[] (optional; if omitted, uses all institutions with active sources)
// - run_type: 'manual' | 'scheduled'
// - tier?: string (optional; filter by tier if no institutions specified)
// - started_by?: string (optional; user ID for audit)
//
// Outputs:
// - run_id: UUID of the created run
// - tasks_created: number of institution tasks created
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RefreshRequest {
  institutions?: string[];
  run_type: 'manual' | 'scheduled';
  tier?: string;
  started_by?: string;
  maxPriority?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body: RefreshRequest = await req.json();
    const { 
      institutions: requestedInstitutions, 
      run_type = 'manual', 
      tier,
      started_by,
      maxPriority = 2,
    } = body;

    console.log(`[policy-refresh-start] Starting run: type=${run_type}, tier=${tier || 'all'}, institutions=${requestedInstitutions?.length || 'auto'}`);

    // Determine which institutions to process
    let institutionsToProcess: string[] = [];

    if (requestedInstitutions && requestedInstitutions.length > 0) {
      // Use explicitly requested institutions
      institutionsToProcess = requestedInstitutions;
    } else {
      // Find institutions with active sources
      let query = supabase
        .from('scrape_url_templates')
        .select('institution_code')
        .eq('status', 'active');

      // Get unique institution codes
      const { data: templates, error: templatesError } = await query;
      
      if (templatesError) {
        throw new Error(`Failed to load templates: ${templatesError.message}`);
      }

      // Get unique institution codes
      const uniqueCodes = [...new Set((templates || []).map(t => t.institution_code))];

      // If tier specified, filter by tier
      if (tier) {
        const { data: tieredInstitutions, error: tierError } = await supabase
          .from('institutions')
          .select('code')
          .eq('institution_tier', tier);

        if (tierError) {
          throw new Error(`Failed to load tier institutions: ${tierError.message}`);
        }

        const tierCodes = new Set((tieredInstitutions || []).map(i => i.code));
        institutionsToProcess = uniqueCodes.filter(code => tierCodes.has(code));
      } else {
        institutionsToProcess = uniqueCodes;
      }
    }

    if (institutionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No institutions found with active sources',
          hint: 'Add URL templates with status=active or specify institutions explicitly',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count URLs for each institution
    const { data: urlCounts, error: urlError } = await supabase
      .from('scrape_url_templates')
      .select('institution_code')
      .eq('status', 'active')
      .in('institution_code', institutionsToProcess);

    const totalUrls = urlCounts?.length || 0;

    // Check for existing running runs (idempotency)
    const { data: existingRuns } = await supabase
      .from('transfer_batch_runs')
      .select('id, status')
      .eq('status', 'running')
      .limit(1);

    if (existingRuns && existingRuns.length > 0) {
      console.log(`[policy-refresh-start] Existing run found: ${existingRuns[0].id}`);
      return new Response(
        JSON.stringify({
          error: 'A refresh run is already in progress',
          existing_run_id: existingRuns[0].id,
          hint: 'Wait for the current run to complete or cancel it first',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the run record
    const { data: runData, error: runError } = await supabase
      .from('transfer_batch_runs')
      .insert({
        tier: tier || 'all',
        status: 'running',
        run_type,
        started_by: started_by || null,
        institutions_count: institutionsToProcess.length,
        urls_count: totalUrls,
        summary: {
          institutions: institutionsToProcess,
          maxPriority,
          started_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (runError) {
      throw new Error(`Failed to create run: ${runError.message}`);
    }

    const runId = runData.id;
    console.log(`[policy-refresh-start] Created run: ${runId}`);

    // Create task rows for each institution (upsert to handle unique constraint)
    const taskRows = institutionsToProcess.map(institution => ({
      run_id: runId,
      institution,
      status: 'queued',
      created_at: new Date().toISOString(),
    }));

    const { data: tasks, error: tasksError } = await supabase
      .from('policy_refresh_tasks')
      .upsert(taskRows, { onConflict: 'run_id,institution' })
      .select('id, institution');

    if (tasksError) {
      console.error(`[policy-refresh-start] Failed to create tasks:`, tasksError);
      // Rollback the run
      await supabase.from('transfer_batch_runs').delete().eq('id', runId);
      throw new Error(`Failed to create tasks: ${tasksError.message}`);
    }

    const tasksCreated = tasks?.length || 0;
    console.log(`[policy-refresh-start] Created ${tasksCreated} tasks`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        run_type,
        institutions_count: institutionsToProcess.length,
        urls_count: totalUrls,
        tasks_created: tasksCreated,
        institutions: institutionsToProcess,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[policy-refresh-start] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
