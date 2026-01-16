import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Institution processing order
const INSTITUTION_ORDER = ['COSC', 'TESU', 'EXCELSIOR', 'WGU'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Security: require CRON_SECRET header OR service role Authorization
  // This allows both external calls (with x-cron-secret) and Supabase scheduler (with Authorization)
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Allow if: valid cron secret OR valid service role bearer token
  const hasValidCronSecret = cronSecret && providedSecret === cronSecret;
  const hasValidServiceRole = authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;
  
  if (!hasValidCronSecret && !hasValidServiceRole) {
    console.error('Unauthorized cron invocation attempt');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // First, reap any stale processing jobs
    const { data: reapResult } = await supabase.rpc('reap_stale_processing_jobs', {
      p_stale_threshold_minutes: 10,
    });

    // Get health check to determine state
    const { data: health } = await supabase.rpc('check_template_generation_health');

    const queueByInstitution = health?.queue_by_institution || {};
    const processingByInstitution = health?.processing_by_institution || {};
    const staleProcessingCount = health?.stale_processing_count || 0;

    // If we just reaped stale jobs, skip this tick to let the system stabilize
    if (reapResult?.reaped_count > 0) {
      console.log(`Reaped ${reapResult.reaped_count} stale jobs, skipping generation this tick`);
      return new Response(
        JSON.stringify({
          success: true,
          action: 'reaped_only',
          message: `Reaped ${reapResult.reaped_count} stale processing jobs`,
          health,
          reap_result: reapResult,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find first institution with queued jobs AND no active processing
    let targetInstitution: string | null = null;
    let queuedCount = 0;

    for (const inst of INSTITUTION_ORDER) {
      const instStatus = queueByInstitution[inst];
      const processingCount = processingByInstitution[inst] || 0;
      
      // Skip if already processing for this institution (avoid contention)
      if (processingCount > 0) {
        console.log(`Skipping ${inst} - ${processingCount} jobs currently processing`);
        continue;
      }
      
      if (instStatus?.queued > 0) {
        targetInstitution = inst;
        queuedCount = instStatus.queued;
        break;
      }
    }

    if (!targetInstitution) {
      // Check if any processing is happening
      const totalProcessing = Object.values(processingByInstitution).reduce((a: number, b: any) => a + (b || 0), 0);
      
      if (totalProcessing > 0) {
        console.log(`No queued jobs available, ${totalProcessing} jobs still processing`);
        return new Response(
          JSON.stringify({
            success: true,
            action: 'waiting',
            message: `Waiting for ${totalProcessing} processing jobs to complete`,
            health,
            reap_result: reapResult,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('No queued jobs remaining for any institution');
      return new Response(
        JSON.stringify({
          success: true,
          action: 'complete',
          message: 'All institutions complete',
          health,
          reap_result: reapResult,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${targetInstitution} (${queuedCount} queued)`);

    // Call the NEW job processor pipeline (not legacy worker)
    // The job processor will enqueue + process via template_generation_jobs
    const workerResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/template-job-processor`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institution: targetInstitution,  // Enqueue + process mode
        }),
      }
    );

    const workerResult = await workerResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        action: 'processed',
        institution: targetInstitution,
        queued_before: queuedCount,
        worker_result: workerResult,
        reap_result: reapResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron error:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
