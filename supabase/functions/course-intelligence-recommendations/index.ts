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
    const { userId, trackId, skillGaps = [], limit = 5 } = await req.json();
    
    console.log('Course Intelligence Recommendations - Request:', { userId, trackId, skillGaps, limit });

    if (!userId) {
      throw new Error('userId is required');
    }

    // Get user's existing course completions
    const { data: userCourses, error: userCoursesError } = await supabase
      .from('user_course_events')
      .select('course_id, event_type, score')
      .eq('user_id', userId)
      .in('event_type', ['completed', 'assessed']);

    if (userCoursesError) {
      console.error('Error fetching user courses:', userCoursesError);
    }

    const completedCourseIds = userCourses?.map(uc => uc.course_id) || [];

    // Calculate CRI contribution score for courses
    const calculateCourseScore = (course: any) => {
      // Base scoring algorithm
      const difficultyScore = Math.min(parseFloat(course.difficulty) || 5, 10) / 10;
      const instructorScore = Math.min(parseFloat(course.instructor_rating) || 5, 10) / 10;
      const platformScore = course.platform === 'Coursera' ? 0.9 : 
                           course.platform === 'edX' ? 0.8 : 
                           course.platform === 'Udemy' ? 0.7 : 0.6;
      
      // Skill coverage score (higher if covers gap skills)
      const skillTags = Array.isArray(course.skills) ? course.skills : 
                       typeof course.skills === 'string' ? course.skills.split(',') : [];
      
      const gapCoverage = skillGaps.length > 0 ? 
        skillGaps.filter(gap => skillTags.some(skill => 
          skill.toLowerCase().includes(gap.toLowerCase()) || 
          gap.toLowerCase().includes(skill.toLowerCase())
        )).length / skillGaps.length : 0.5;

      return {
        total: (difficultyScore * 0.3 + instructorScore * 0.3 + platformScore * 0.2 + gapCoverage * 0.2) * 100,
        breakdown: {
          difficulty: difficultyScore * 30,
          instructor: instructorScore * 30, 
          platform: platformScore * 20,
          skillCoverage: gapCoverage * 20
        }
      };
    };

    // Get courses from existing schema, filtered by active status
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .not('id', 'in', `(${completedCourseIds.length > 0 ? completedCourseIds.map(id => `'${id}'`).join(',') : "''"})`)
      .limit(100);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      throw coursesError;
    }

    console.log(`Found ${courses?.length || 0} candidate courses`);

    // Score and rank courses
    const scoredCourses = (courses || []).map(course => {
      const score = calculateCourseScore(course);
      const reasons = [];
      
      if (score.breakdown.skillCoverage > 15) {
        reasons.push(`Covers key skill gaps`);
      }
      if (score.breakdown.difficulty > 20) {
        reasons.push(`Appropriate difficulty level`);
      }
      if (score.breakdown.instructor > 20) {
        reasons.push(`High-rated instructor`);
      }
      if (score.breakdown.platform > 15) {
        reasons.push(`Reputable platform`);
      }

      return {
        courseId: course.id,
        title: course.title,
        description: course.description,
        url: course.course_url,
        platform: course.platform,
        instructor: course.instructor_name,
        estimatedHours: course.estimated_hours,
        cost: course.cost_usd,
        difficulty: course.difficulty_level,
        score: score.total,
        scoreBreakdown: score.breakdown,
        reasons: reasons.length > 0 ? reasons : ['General skill development'],
        skillsCovered: Array.isArray(course.skills) ? course.skills : 
                      typeof course.skills === 'string' ? course.skills.split(',') : []
      };
    });

    // Sort by score and limit results
    const recommendations = scoredCourses
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`Returning ${recommendations.length} recommendations`);

    // Log telemetry
    await supabase.from('fn_runs').insert({
      fn_name: 'course-intelligence-recommendations',
      user_id: userId,
      status: 'ok',
      latency_ms: Date.now() - startTime,
      payload: { trackId, skillGaps, limit, resultCount: recommendations.length }
    });

    return new Response(JSON.stringify({
      success: true,
      userId,
      trackId,
      skillGaps,
      recommendations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in course-intelligence-recommendations:', error);
    
    // Log error telemetry
    await supabase.from('fn_runs').insert({
      fn_name: 'course-intelligence-recommendations',
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