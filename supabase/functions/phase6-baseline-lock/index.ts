import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LockRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json() as LockRequest;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting Phase 6 baseline lock for user: ${userId}`);

    // Step 1: Capture baseline snapshot
    const { data: baselineId, error: baselineError } = await supabaseClient
      .rpc('capture_phase6_baseline', { target_user_id: userId });

    if (baselineError) {
      console.error('Error capturing baseline:', baselineError);
      return new Response(
        JSON.stringify({ error: 'Failed to capture baseline', details: baselineError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Baseline captured with ID: ${baselineId}`);

    // Step 2: Lock component states
    const { data: lockIds, error: lockError } = await supabaseClient
      .rpc('lock_phase6_components', { 
        target_user_id: userId, 
        baseline_snapshot_id: baselineId 
      });

    if (lockError) {
      console.error('Error locking components:', lockError);
      return new Response(
        JSON.stringify({ error: 'Failed to lock components', details: lockError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Components locked with IDs: ${lockIds}`);

    // Step 3: Generate enterprise certification
    const { data: certId, error: certError } = await supabaseClient
      .rpc('generate_phase6_enterprise_certification', {
        target_user_id: userId,
        baseline_snapshot_id: baselineId,
        component_lock_ids: lockIds
      });

    if (certError) {
      console.error('Error generating certification:', certError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate certification', details: certError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Enterprise certification generated with ID: ${certId}`);

    // Step 4: Fetch final certification details
    const { data: certification, error: fetchError } = await supabaseClient
      .from('phase6_enterprise_certifications')
      .select('*')
      .eq('id', certId)
      .single();

    if (fetchError) {
      console.error('Error fetching certification:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch certification details', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return success response with all IDs and certification details
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Phase 6 baseline successfully locked and certified',
        data: {
          baselineSnapshotId: baselineId,
          componentLockIds: lockIds,
          certificationId: certId,
          certification: {
            type: certification.certification_type,
            overallScore: certification.overall_score,
            componentScores: certification.component_scores,
            certifiedAt: certification.certified_at,
            validUntil: certification.valid_until,
            certificationData: certification.certification_data
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Phase 6 baseline lock error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})