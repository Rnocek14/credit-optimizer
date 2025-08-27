import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { userId, trackId, forceRecompute = false } = await req.json();
    
    console.log('CRI Calculator - Request:', { userId, trackId, forceRecompute });

    if (!userId || !trackId) {
      throw new Error('userId and trackId are required');
    }

    let dbReads = 0;
    let dbWrites = 0;

    // Check cache first (unless forceRecompute)
    if (!forceRecompute) {
      const { data: cachedResult } = await supabase
        .from('ci_track_cri_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('track_id', trackId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      dbReads += 1;

      if (cachedResult) {
        console.log('Returning cached CRI result');
        const latencyMs = Date.now() - startTime;
        
        return new Response(JSON.stringify({
          success: true,
          userId,
          trackId,
          cri: cachedResult.cri_score,
          components: cachedResult.components || [],
          modelVersion: "cri:v1",
          computedAt: cachedResult.calculated_at,
          cached: true,
          telemetry: {
            latency_ms: latencyMs,
            db_reads: dbReads,
            db_writes: 0,
            strategy: "cache_hit"
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get user's course completions
    const { data: completedCourses, error: coursesError } = await supabase
      .from('user_course_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'completed');

    dbReads += 1;

    if (coursesError) {
      console.error('Error fetching completed courses:', coursesError);
      throw coursesError;
    }

    console.log(`Found ${completedCourses?.length || 0} completed courses for user`);

    // Calculate CRI components (Master Spec format)
    const components = [
      {
        skillId: "react-skills",
        target: 100,
        current: Math.min(100, (completedCourses?.length || 0) * 20),
        weight: 0.3
      },
      {
        skillId: "technical-depth", 
        target: 100,
        current: Math.min(100, (completedCourses?.length || 0) * 15),
        weight: 0.25
      },
      {
        skillId: "product-experience",
        target: 100,
        current: Math.min(100, (completedCourses?.length || 0) * 10),
        weight: 0.25
      },
      {
        skillId: "market-readiness",
        target: 100,
        current: Math.min(100, (completedCourses?.length || 0) * 12),
        weight: 0.2
      }
    ];

    // Calculate weighted CRI score
    const criScore = components.reduce((acc, comp) => {
      return acc + (comp.current / comp.target) * comp.weight * 100;
    }, 0);

    const computedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h cache

    // Cache the result
    await supabase
      .from('ci_track_cri_cache')
      .upsert({
        user_id: userId,
        track_id: trackId,
        cri_score: criScore,
        cri_breakdown: { components },
        components,
        model_version: "cri:v1",
        calculated_at: computedAt,
        expires_at: expiresAt
      });
    
    dbWrites += 1;

    console.log(`Calculated CRI: ${criScore}`);

    // Log telemetry
    const latencyMs = Date.now() - startTime;
    await supabase.from('fn_runs').insert({
      function_name: 'course-cri-calculator',
      user_id: userId,
      success: true,
      latency_ms: latencyMs,
      created_at: new Date().toISOString(),
      metadata: {
        track_id: trackId,
        db_reads: dbReads,
        db_writes: dbWrites,
        strategy: forceRecompute ? "force_recompute" : "computed",
        model_version: "cri:v1"
      }
    });

    return new Response(JSON.stringify({
      success: true,
      userId,
      trackId,
      cri: criScore,
      components,
      modelVersion: "cri:v1",
      computedAt,
      cached: false,
      telemetry: {
        latency_ms: latencyMs,
        db_reads: dbReads,
        db_writes: dbWrites,
        strategy: forceRecompute ? "force_recompute" : "computed"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CRI Calculator Error:', error);
    const latencyMs = Date.now() - startTime;
    
    // Log error to fn_runs
    await supabase.from('fn_runs').insert({
      function_name: 'course-cri-calculator',
      success: false,
      error_message: error.message,
      latency_ms: latencyMs,
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});