import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchScanResult {
  institution: string;
  status: 'success' | 'failed' | 'skipped';
  templates_scanned: number;
  succeeded: number;
  failed: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let runId: string | null = null;

  try {
    const body = await req.json();
    const tier = body?.tier ?? 'tier_a';
    const maxPriority = body?.maxPriority ?? 2;
    const concurrency = Math.min(body?.concurrency ?? 1, 3);
    const delayMs = body?.delayMs ?? 500;
    
    // Resume parameters for chunked processing (avoid timeout)
    const startAfter = body?.startAfter as string | undefined;
    const limit = Math.min(body?.limit ?? 5, 10); // Default 5, max 10 per run
    
    // Early-stop: exit cleanly before edge timeout (default 25s, max 28s to stay under 30s limit)
    const maxRuntimeMs = Math.min(body?.maxRuntimeMs ?? 25000, 28000);
    const startedAt = Date.now();
    
    // Optional: accept an existing run_id for policy refresh pipeline integration
    const externalRunId = body?.run_id as string | undefined;

    console.log(`Batch scan starting: tier=${tier}, maxPriority=${maxPriority}, concurrency=${concurrency}, limit=${limit}, maxRuntimeMs=${maxRuntimeMs}, startAfter=${startAfter || 'beginning'}, externalRunId=${externalRunId || 'none'}`);

    // === CRITICAL FIX: When run_id is provided, use tasks from that run ===
    // This ensures we only process institutions that were explicitly requested
    let institutionsToProcess: string[] = [];
    let totalInTier = 0;

    if (externalRunId) {
      runId = externalRunId;
      
      // Update existing run to running status
      await supabase
        .from('transfer_batch_runs')
        .update({ status: 'running' })
        .eq('id', runId);
      
      // Get institutions from policy_refresh_tasks for this run (not from tier!)
      const { data: tasks, error: tasksError } = await supabase
        .from('policy_refresh_tasks')
        .select('institution')
        .eq('run_id', runId)
        .in('status', ['queued', 'running']) // Only process pending tasks
        .order('institution', { ascending: true });
      
      if (tasksError) {
        throw new Error(`Failed to load tasks for run: ${tasksError.message}`);
      }
      
      institutionsToProcess = (tasks || []).map((t: { institution: string }) => t.institution);
      totalInTier = institutionsToProcess.length;
      
      console.log(`Using ${institutionsToProcess.length} institutions from run ${runId}: ${institutionsToProcess.join(', ')}`);
      
      // Apply startAfter for resume
      if (startAfter) {
        const idx = institutionsToProcess.findIndex(c => c === startAfter);
        if (idx >= 0) {
          institutionsToProcess = institutionsToProcess.slice(idx + 1);
        }
      }
      
      // Apply limit
      institutionsToProcess = institutionsToProcess.slice(0, limit);
      
    } else {
      // Legacy mode: derive institutions from tier (for backward compatibility)
      const { data: runData } = await supabase
        .from('transfer_batch_runs')
        .insert({
          tier,
          status: 'running',
          run_type: 'manual',
          summary: { startAfter, limit, maxPriority, concurrency }
        })
        .select('id')
        .single();
      
      runId = runData?.id ?? null;
      console.log(`Created batch run: ${runId}`);

      // Get institutions by tier from institutions table
      const institutionsResponse = await fetch(
        `${supabaseUrl}/rest/v1/institutions?select=code&institution_tier=eq.${tier}&order=code.asc`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!institutionsResponse.ok) {
        const errorText = await institutionsResponse.text();
        throw new Error(`Failed to load institutions: ${errorText}`);
      }

      const institutionsData = await institutionsResponse.json();
      const allInstitutions: string[] = institutionsData.map((r: { code: string }) => r.code);
      totalInTier = allInstitutions.length;

      if (allInstitutions.length === 0) {
        await updateRunStatus(supabase, runId, 'completed', null, 0, { error: 'No institutions found' });
        return new Response(
          JSON.stringify({ 
            error: 'No institutions found for tier',
            tier,
            hint: 'Check that institutions have institution_tier set correctly'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      institutionsToProcess = allInstitutions;
      
      // Apply resume filter
      if (startAfter) {
        const idx = institutionsToProcess.findIndex(c => c === startAfter);
        if (idx >= 0) {
          institutionsToProcess = institutionsToProcess.slice(idx + 1);
        }
      }

      // Apply limit
      institutionsToProcess = institutionsToProcess.slice(0, limit);
    }

    // Common validation
    if (institutionsToProcess.length === 0) {
      await updateRunStatus(supabase, runId, 'completed', null, 0, { message: 'No institutions to process' });
      return new Response(
        JSON.stringify({ 
          tier,
          maxPriority,
          startAfter,
          limit,
          total_in_tier: totalInTier,
          processed_this_run: 0,
          hasMore: false,
          message: externalRunId 
            ? 'All tasks for this run are already complete' 
            : 'No more institutions to process after startAfter position'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${institutionsToProcess.length} of ${totalInTier} ${tier} institutions (startAfter=${startAfter || 'beginning'})`);

    const results: BatchScanResult[] = [];
    let totalSucceeded = 0;
    let totalFailed = 0;
    let stoppedEarly = false;
    let lastProcessed: string | null = null;
    let processedCount = 0;

    // Process institutions with controlled concurrency (no mutation of institutionsToProcess)
    for (let i = 0; i < institutionsToProcess.length; i += concurrency) {
      // Early-stop check: exit cleanly before edge timeout
      const elapsed = Date.now() - startedAt;
      if (elapsed > maxRuntimeMs) {
        console.log(`Stopping early at ${elapsed}ms to avoid edge timeout (processed ${results.length} institutions)`);
        stoppedEarly = true;
        break;
      }
      
      const batch = institutionsToProcess.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (institution: string) => {
        const result: BatchScanResult = {
          institution,
          status: 'failed',
          templates_scanned: 0,
          succeeded: 0,
          failed: 0,
        };

        try {
          console.log(`Scanning: ${institution}`);
          
          const scanResponse = await fetch(`${supabaseUrl}/functions/v1/transfer-scraper-auto-scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
            body: JSON.stringify({
              institution,
              maxPriority,
              run_id: runId, // Pass run_id for task tracking
            }),
          });

          if (!scanResponse.ok) {
            const errorText = await scanResponse.text();
            result.error = `Scan failed: ${errorText}`;
            return result;
          }

          const scanData = await scanResponse.json();
          result.status = 'success';
          result.templates_scanned = typeof scanData?.total === 'number' ? scanData.total : 0;
          result.succeeded = typeof scanData?.succeeded === 'number' ? scanData.succeeded : 0;
          result.failed = typeof scanData?.failed === 'number' ? scanData.failed : 0;
          
          console.log(`Completed: ${institution} - ${result.succeeded}/${result.templates_scanned} succeeded`);
          
        } catch (e) {
          result.error = e instanceof Error ? e.message : 'Unknown error';
          console.error(`Error scanning ${institution}:`, result.error);
        }

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Track progress after each batch
      batchResults.forEach((r, idx) => {
        lastProcessed = batch[idx];
        processedCount++;
        if (r.status === 'success') totalSucceeded += r.succeeded;
        totalFailed += r.failed;
      });

      // Update run progress in DB (fire and forget for speed)
      updateRunStatus(supabase, runId, 'running', lastProcessed, processedCount, null);

      // Delay between batches (only if more to process and not stopping)
      if (!stoppedEarly && i + concurrency < institutionsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Determine if there are more institutions to process
    // For run_id mode: check if we processed all queued tasks
    // For tier mode: check position in allInstitutions (legacy - allInstitutions not available here)
    const hasMore = stoppedEarly || (processedCount < totalInTier);

    const summary = {
      run_id: runId,
      tier,
      maxPriority,
      // Resume support
      startAfter: startAfter ?? null,
      lastProcessed,
      hasMore: hasMore || stoppedEarly,
      nextStartAfter: (hasMore || stoppedEarly) ? lastProcessed : null,
      stoppedEarly,
      elapsedMs: Date.now() - startedAt,
      total_in_tier: totalInTier,
      processed_this_run: processedCount,
      // Batch stats
      institutions_attempted: processedCount,
      institutions_completed: results.length,
      successful_institutions: results.filter(r => r.status === 'success').length,
      failed_institutions: results.filter(r => r.status === 'failed').length,
      skipped_institutions: results.filter(r => r.status === 'skipped').length,
      total_templates_succeeded: totalSucceeded,
      total_templates_failed: totalFailed,
      results,
    };

    // Finalize run record
    const finalStatus = stoppedEarly ? 'stopped_early' : (hasMore ? 'completed' : 'completed');
    await updateRunStatus(supabase, runId, finalStatus, lastProcessed, processedCount, summary);

    console.log(`Batch scan complete: ${summary.successful_institutions}/${summary.processed_this_run} institutions succeeded, hasMore=${hasMore}, stoppedEarly=${stoppedEarly}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch scan error:', error);
    
    // Mark run as failed
    if (runId) {
      await updateRunStatus(supabase, runId, 'failed', null, 0, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to update batch run status
// deno-lint-ignore no-explicit-any
async function updateRunStatus(
  supabase: any,
  runId: string | null,
  status: string,
  lastProcessed: string | null,
  processedCount: number,
  summary: Record<string, unknown> | null
) {
  if (!runId) return;
  
  const update: Record<string, unknown> = {
    status,
    last_processed: lastProcessed,
    processed_count: processedCount,
  };
  
  if (status === 'completed' || status === 'stopped_early' || status === 'failed') {
    update.finished_at = new Date().toISOString();
  }
  
  if (summary) {
    update.summary = summary;
    update.successful_count = summary.successful_institutions ?? 0;
    update.failed_count = summary.failed_institutions ?? 0;
    update.skipped_count = summary.skipped_institutions ?? 0;
  }
  
  await supabase.from('transfer_batch_runs').update(update).eq('id', runId);
}
