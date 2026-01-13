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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // First, reap any stale processing jobs
    const { data: reapResult } = await supabase.rpc('reap_stale_processing_jobs', {
      p_stale_threshold_minutes: 10,
    });

    // Get health check to determine which institution to process
    const { data: health } = await supabase.rpc('check_template_generation_health');

    const queueByInstitution = health?.queue_by_institution || {};

    // Find first institution with queued jobs
    let targetInstitution: string | null = null;
    let queuedCount = 0;

    for (const inst of INSTITUTION_ORDER) {
      const instStatus = queueByInstitution[inst];
      if (instStatus?.queued > 0) {
        targetInstitution = inst;
        queuedCount = instStatus.queued;
        break;
      }
    }

    if (!targetInstitution) {
      console.log('No queued jobs remaining for any institution');
      return new Response(
        JSON.stringify({
          success: true,
          action: 'none',
          message: 'All institutions complete',
          health,
          reap_result: reapResult,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${targetInstitution} (${queuedCount} queued)`);

    // Call the worker for this institution
    const workerResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/template-generation-worker`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institution_code: targetInstitution,
          batch_size: 1,
          dry_run: false,
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
