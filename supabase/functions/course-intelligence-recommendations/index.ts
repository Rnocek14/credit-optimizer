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
    const { 
      userId, 
      trackId, 
      limit = 6, 
      strategy = "gap_fill", 
      excludeCourseIds = [] 
    } = await req.json();
    
    console.log('Course Intelligence Recommendations - Request:', { userId, trackId, limit, strategy, excludeCourseIds });

    if (!userId || !trackId) {
      throw new Error('userId and trackId are required');
    }

    let dbReads = 0;
    let dbWrites = 0;

    // Get current CRI for the user/track
    const { data: criCache } = await supabase
      .from('ci_track_cri_cache')
      .select('cri_score')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle();
    
    dbReads += 1;
    const currentCRI = criCache?.cri_score || 0;

    // Get user's completed courses to exclude
    const { data: completedCourses } = await supabase
      .from('user_course_events')
      .select('course_id')
      .eq('user_id', userId)
      .eq('event_type', 'completed');
    
    dbReads += 1;
    const completedCourseIds = new Set(
      completedCourses?.map(c => c.course_id) || []
    );

    // Get available courses with scores from new CI schema
    const { data: courses, error: coursesError } = await supabase
      .from('ci_courses')
      .select(`
        *,
        platform:ci_platforms(*),
        instructor:ci_instructors(*),
        cri_scores:ci_course_cri_scores(*)
      `)
      .eq('active', true)
      .not('id', 'in', `(${Array.from(excludeCourseIds.concat([...completedCourseIds])).join(',') || "''"})`)
      .limit(20); // Get more than needed for filtering
    
    dbReads += 1;

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      throw coursesError;
    }

    // Filter out completed courses
    const availableCourses = courses?.filter(
      course => !completedCourseIds.has(course.id)
    ) || [];

    console.log(`Found ${availableCourses.length} candidate courses`);

    // Score and rank courses based on strategy
    const scoredCourses = availableCourses.map(course => {
      const criScores = course.cri_scores?.[0];
      const instructor = course.instructor;
      
      // Calculate recommendation score based on strategy
      let baseScore = 0;
      let expectedCRIChange = 0;
      let reason = "";

      switch (strategy) {
        case "foundations":
          baseScore = (criScores?.rigor_score || 70) * 0.4 + 
                     (instructor?.reputation || 3) * 20 + 
                     (course.difficulty <= 2 ? 30 : 10);
          expectedCRIChange = Math.min(15, baseScore * 0.15);
          reason = `Foundation course in ${course.title} to build core skills`;
          break;
          
        case "accelerate":
          baseScore = (criScores?.outcome_score || 70) * 0.4 + 
                     (instructor?.reputation || 3) * 15 + 
                     (course.difficulty >= 4 ? 35 : 10);
          expectedCRIChange = Math.min(25, baseScore * 0.25);
          reason = `Advanced course to accelerate learning in ${course.title}`;
          break;
          
        default: // gap_fill
          baseScore = (criScores?.difficulty_score || 70) * 0.3 + 
                     (criScores?.outcome_score || 70) * 0.3 + 
                     (instructor?.reputation || 3) * 15 + 
                     (course.difficulty === 3 ? 25 : 10);
          expectedCRIChange = Math.min(20, baseScore * 0.2);
          reason = `Fills skill gaps in ${course.title} for your track`;
          break;
      }

      // Normalize score to 0-1 range
      const normalizedScore = Math.min(1, baseScore / 100);

      return {
        course: {
          id: course.id,
          platform: course.platform,
          instructor: course.instructor,
          title: course.title,
          slug: course.slug,
          url: course.url,
          difficulty: course.difficulty,
          durationHours: course.duration_hours
        },
        reason,
        score: normalizedScore,
        expectedCRIChange,
        covers: [
          {
            skillId: `skill-${course.id}`,
            from: currentCRI,
            to: Math.min(100, currentCRI + expectedCRIChange),
            weight: 1.0
          }
        ]
      };
    });

    // Sort by score and take top recommendations
    const recommendations = scoredCourses
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const candidateCount = availableCourses.length;
    const selected = recommendations.length;
    const criAfterEstimate = currentCRI + 
      recommendations.reduce((sum, rec) => sum + rec.expectedCRIChange, 0) / (recommendations.length || 1);

    console.log(`Returning ${recommendations.length} recommendations`);

    // Log telemetry
    const latencyMs = Date.now() - startTime;
    await supabase.from('fn_runs').insert({
      function_name: 'course-intelligence-recommendations',
      user_id: userId,
      success: true,
      latency_ms: latencyMs,
      created_at: new Date().toISOString(),
      metadata: {
        track_id: trackId,
        strategy,
        db_reads: dbReads,
        db_writes: dbWrites,
        candidate_count: candidateCount,
        selected_count: selected,
        model_version: "reco:v1"
      }
    });

    return new Response(JSON.stringify({
      success: true,
      userId,
      trackId,
      recommendations,
      metrics: {
        candidateCount,
        selected,
        criBefore: currentCRI,
        criAfterEstimate
      },
      modelVersion: "reco:v1",
      telemetry: {
        latency_ms: latencyMs,
        db_reads: dbReads,
        db_writes: dbWrites,
        strategy
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Course Intelligence Recommendations Error:', error);
    const latencyMs = Date.now() - startTime;
    
    // Log error to fn_runs
    await supabase.from('fn_runs').insert({
      function_name: 'course-intelligence-recommendations',
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