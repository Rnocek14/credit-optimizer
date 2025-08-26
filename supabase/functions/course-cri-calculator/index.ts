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
    const { userId, trackId, targetCRI = 80 } = await req.json();
    
    console.log('CRI Calculator - Request:', { userId, trackId, targetCRI });

    if (!userId) {
      throw new Error('userId is required');
    }

    // Get user's course completions with scores
    const { data: completedCourses, error: coursesError } = await supabase
      .from('user_course_events')
      .select(`
        *,
        courses:course_id (
          id,
          title,
          platform,
          difficulty_level,
          estimated_hours,
          instructor_name,
          category
        )
      `)
      .eq('user_id', userId)
      .in('event_type', ['completed', 'assessed']);

    if (coursesError) {
      console.error('Error fetching completed courses:', coursesError);
      throw coursesError;
    }

    console.log(`Found ${completedCourses?.length || 0} completed courses for user`);

    // Calculate skill contributions from completed courses
    const skillContributions: Record<string, number> = {};
    const courseContributions: any[] = [];

    (completedCourses || []).forEach(completion => {
      const course = completion.courses;
      if (!course) return;

      // Calculate course contribution to overall CRI
      const difficultyMultiplier = course.difficulty_level === 'advanced' ? 1.5 :
                                  course.difficulty_level === 'intermediate' ? 1.2 : 1.0;
      
      const platformMultiplier = course.platform === 'Coursera' ? 1.3 :
                                course.platform === 'edX' ? 1.2 :
                                course.platform === 'Udemy' ? 1.1 : 1.0;

      const scoreMultiplier = completion.score ? (completion.score / 100) : 0.8; // Default 0.8 for completion without score
      
      const courseValue = difficultyMultiplier * platformMultiplier * scoreMultiplier * 10;
      
      // Map course to skill categories (simplified)
      const skillCategory = course.category || 'general';
      skillContributions[skillCategory] = (skillContributions[skillCategory] || 0) + courseValue;
      
      courseContributions.push({
        courseId: course.id,
        title: course.title,
        platform: course.platform,
        difficulty: course.difficulty_level,
        score: completion.score,
        contribution: courseValue,
        skillCategory
      });
    });

    // Calculate overall CRI
    const totalSkillValue = Object.values(skillContributions).reduce((sum, val) => sum + val, 0);
    const currentCRI = Math.min(totalSkillValue, 100);
    
    // Calculate skill gaps for target CRI
    const criGap = Math.max(targetCRI - currentCRI, 0);
    const skillGaps = Object.entries(skillContributions).map(([skill, value]) => ({
      skill,
      currentLevel: Math.min(value, 10),
      targetLevel: 8, // Default target
      gap: Math.max(8 - Math.min(value, 10), 0)
    }));

    // Generate recommendations based on gaps
    const recommendations = skillGaps
      .filter(gap => gap.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3)
      .map(gap => ({
        skill: gap.skill,
        recommendedAction: `Take courses in ${gap.skill} to reach target level`,
        priority: gap.gap > 5 ? 'high' : gap.gap > 2 ? 'medium' : 'low',
        estimatedImpact: Math.round(gap.gap * 2.5) // Rough estimate
      }));

    const criBreakdown = {
      currentCRI: Math.round(currentCRI * 100) / 100,
      targetCRI,
      criGap: Math.round(criGap * 100) / 100,
      skillContributions,
      skillGaps,
      recommendations,
      courseContributions,
      lastCalculated: new Date().toISOString(),
      completedCoursesCount: completedCourses?.length || 0
    };

    // Store in cache if track-specific
    if (trackId) {
      await supabase
        .from('track_cri_cache')
        .upsert({
          user_id: userId,
          track_id: trackId,
          cri: currentCRI,
          breakdown: criBreakdown,
          skill_levels: skillContributions,
          gaps: skillGaps,
          recommendations,
          updated_at: new Date().toISOString()
        });
    }

    console.log(`Calculated CRI: ${currentCRI} (target: ${targetCRI})`);

    // Log telemetry
    await supabase.from('fn_runs').insert({
      fn_name: 'course-cri-calculator',
      user_id: userId,
      status: 'ok',
      latency_ms: Date.now() - startTime,
      payload: { trackId, targetCRI, currentCRI, criGap }
    });

    return new Response(JSON.stringify({
      success: true,
      userId,
      trackId,
      criBreakdown
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in course-cri-calculator:', error);
    
    // Log error telemetry
    await supabase.from('fn_runs').insert({
      fn_name: 'course-cri-calculator',
      status: 'error',
      latency_ms: Date.now() - startTime,
      error_message: error.message
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