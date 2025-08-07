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
    console.log('🚀 Phase 6 baseline lock endpoint called');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('✅ Supabase client created successfully');

    let requestBody;
    try {
      requestBody = await req.json() as LockRequest;
      console.log('📝 Request body parsed:', requestBody);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = requestBody;
    
    if (!userId) {
      console.error('❌ User ID is missing from request');
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Starting Phase 6 baseline lock for user: ${userId}`);

    // Pre-validation: Check if required data exists
    console.log('🔍 Validating prerequisite data...');
    
    const { data: performanceMetrics, error: metricsError } = await supabaseClient
      .from('system_performance_metrics')
      .select('count')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (metricsError) {
      console.error('❌ Error checking performance metrics:', metricsError);
    } else {
      console.log(`📊 Found ${performanceMetrics?.length || 0} performance metrics in last 24h`);
    }

    const { data: mayaDecisions, error: decisionsError } = await supabaseClient
      .from('maya_decisions')
      .select('count')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (decisionsError) {
      console.error('❌ Error checking Maya decisions:', decisionsError);
    } else {
      console.log(`🧠 Found ${mayaDecisions?.length || 0} Maya decisions for user in last 7 days`);
    }

    // Step 1: Capture baseline snapshot
    console.log('📸 Step 1: Capturing baseline snapshot...');
    const { data: baselineId, error: baselineError } = await supabaseClient
      .rpc('capture_phase6_baseline', { target_user_id: userId });

    if (baselineError) {
      console.error('❌ Error capturing baseline:', baselineError);
      console.error('Baseline error details:', JSON.stringify(baselineError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to capture baseline', 
          details: baselineError,
          step: 'capture_baseline',
          userId: userId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Baseline captured successfully with ID: ${baselineId}`);

    // Step 2: Lock component states
    console.log('🔒 Step 2: Locking component states...');
    const { data: lockIds, error: lockError } = await supabaseClient
      .rpc('lock_phase6_components', { 
        target_user_id: userId, 
        baseline_snapshot_id: baselineId 
      });

    if (lockError) {
      console.error('❌ Error locking components:', lockError);
      console.error('Lock error details:', JSON.stringify(lockError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to lock components', 
          details: lockError,
          step: 'lock_components',
          baselineId: baselineId,
          userId: userId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Components locked successfully with IDs: ${lockIds}`);
    console.log(`🔢 Number of components locked: ${Array.isArray(lockIds) ? lockIds.length : 'unknown'}`);

    // Step 3: Generate enterprise certification
    console.log('🏆 Step 3: Generating enterprise certification...');
    const { data: certId, error: certError } = await supabaseClient
      .rpc('generate_phase6_enterprise_certification', {
        target_user_id: userId,
        baseline_snapshot_id: baselineId,
        component_lock_ids: lockIds
      });

    if (certError) {
      console.error('❌ Error generating certification:', certError);
      console.error('Certification error details:', JSON.stringify(certError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate certification', 
          details: certError,
          step: 'generate_certification',
          baselineId: baselineId,
          lockIds: lockIds,
          userId: userId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Enterprise certification generated successfully with ID: ${certId}`);

    // Step 4: Fetch final certification details
    console.log('📋 Step 4: Fetching certification details...');
    const { data: certification, error: fetchError } = await supabaseClient
      .from('phase6_enterprise_certifications')
      .select('*')
      .eq('id', certId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching certification:', fetchError);
      console.error('Fetch error details:', JSON.stringify(fetchError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch certification details', 
          details: fetchError,
          step: 'fetch_certification',
          certificationId: certId,
          userId: userId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Certification details fetched successfully');
    console.log('🎉 Phase 6 baseline lock completed successfully!');

    // Return success response with all IDs and certification details
    const successResponse = {
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
      },
      metadata: {
        timestamp: new Date().toISOString(),
        userId: userId,
        processingSteps: ['capture_baseline', 'lock_components', 'generate_certification', 'fetch_details'],
        componentsLocked: Array.isArray(lockIds) ? lockIds.length : 0
      }
    };

    console.log('📤 Sending success response:', JSON.stringify(successResponse, null, 2));

    return new Response(
      JSON.stringify(successResponse),
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