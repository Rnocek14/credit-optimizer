import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearningPlanRequest {
  user_id: string;
  goal_id?: string;
  ranked_goals?: any[];
  context?: {
    experience_level?: string;
    location?: string;
    time_budget_hours_per_week?: number;
    budget_limit?: number;
    preferred_learning_style?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, goal_id, ranked_goals, context }: LearningPlanRequest = await req.json();

    console.log('Learning Plan Generation Request:', { user_id, goal_id, context });

    // Determine target goal
    let targetGoal;
    if (goal_id) {
      const { data: goalData } = await supabaseClient
        .from('user_goals')
        .select('*')
        .eq('id', goal_id)
        .single();
      targetGoal = goalData;
    } else if (ranked_goals && ranked_goals.length > 0) {
      // Use highest priority goal
      targetGoal = ranked_goals[0];
    } else {
      // Fetch user's top priority goal
      const { data: topGoal } = await supabaseClient
        .from('user_goals')
        .select('*')
        .eq('user_id', user_id)
        .eq('active', true)
        .order('priority_score', { ascending: false })
        .limit(1)
        .single();
      targetGoal = topGoal;
    }

    if (!targetGoal) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No target goal found',
        learning_plan: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch relevant career graph data
    const { data: skillNodes } = await supabaseClient
      .from('career_graph_nodes')
      .select('*')
      .eq('node_type', 'skill')
      .eq('active', true);

    const { data: courseNodes } = await supabaseClient
      .from('career_graph_nodes')
      .select('*')
      .eq('node_type', 'course')
      .eq('active', true);

    const { data: certNodes } = await supabaseClient
      .from('career_graph_nodes')
      .select('*')
      .eq('node_type', 'certification')
      .eq('active', true);

    // Generate learning path based on skill gaps
    const skillGaps = targetGoal.skill_gaps || [];
    const learningPath = [];
    
    // Phase 1: Foundation Skills (Beginner level)
    if (context?.experience_level === 'beginner') {
      const foundationSkills = skillNodes?.filter(skill => 
        skill.difficulty_level <= 2 && 
        skillGaps.some(gap => skill.title.toLowerCase().includes(gap.toLowerCase()))
      ) || [];

      foundationSkills.slice(0, 3).forEach((skill, index) => {
        learningPath.push({
          phase: 1,
          step: index + 1,
          type: 'skill',
          title: skill.title,
          description: skill.description || `Master ${skill.title} fundamentals`,
          node_id: skill.id,
          estimated_duration_weeks: 2,
          estimated_cost: 0,
          resources: courseNodes?.filter(course => 
            course.title.toLowerCase().includes(skill.title.toLowerCase())
          ).slice(0, 2) || []
        });
      });
    }

    // Phase 2: Core Skills Development
    const coreSkills = skillNodes?.filter(skill => 
      skill.difficulty_level <= 3 && 
      skillGaps.some(gap => skill.title.toLowerCase().includes(gap.toLowerCase()))
    ) || [];

    coreSkills.slice(0, 4).forEach((skill, index) => {
      const relevantCourses = courseNodes?.filter(course => 
        course.title.toLowerCase().includes(skill.title.toLowerCase()) ||
        course.semantic_tags?.some(tag => 
          skill.semantic_tags?.includes(tag)
        )
      ).slice(0, 3) || [];

      learningPath.push({
        phase: 2,
        step: index + 1,
        type: 'skill_development',
        title: `Develop ${skill.title}`,
        description: skill.description || `Build practical ${skill.title} skills`,
        node_id: skill.id,
        estimated_duration_weeks: 3,
        estimated_cost: relevantCourses.reduce((sum, course) => sum + (course.cost_estimate || 0), 0),
        resources: relevantCourses,
        projects: [
          {
            title: `${skill.title} Practice Project`,
            description: `Apply ${skill.title} in a real-world scenario`,
            estimated_hours: 20
          }
        ]
      });
    });

    // Phase 3: Practical Application & Certification
    const relevantCerts = certNodes?.filter(cert => 
      skillGaps.some(gap => 
        cert.title.toLowerCase().includes(gap.toLowerCase()) ||
        cert.semantic_tags?.some(tag => gap.toLowerCase().includes(tag.toLowerCase()))
      )
    ) || [];

    if (relevantCerts.length > 0) {
      learningPath.push({
        phase: 3,
        step: 1,
        type: 'certification',
        title: `Earn ${relevantCerts[0].title}`,
        description: relevantCerts[0].description || `Professional certification in ${relevantCerts[0].title}`,
        node_id: relevantCerts[0].id,
        estimated_duration_weeks: 4,
        estimated_cost: relevantCerts[0].cost_estimate || 200,
        resources: [relevantCerts[0]],
        validation_method: 'exam'
      });
    }

    // Phase 4: Portfolio & Experience Building
    learningPath.push({
      phase: 4,
      step: 1,
      type: 'portfolio',
      title: 'Build Professional Portfolio',
      description: `Create a portfolio showcasing ${targetGoal.target_role || targetGoal.title} skills`,
      estimated_duration_weeks: 3,
      estimated_cost: 0,
      deliverables: [
        '3-5 project showcases',
        'Professional resume update',
        'LinkedIn profile optimization',
        'GitHub portfolio (if applicable)'
      ]
    });

    // Calculate totals
    const totalWeeks = learningPath.reduce((sum, step) => sum + step.estimated_duration_weeks, 0);
    const totalCost = learningPath.reduce((sum, step) => sum + (step.estimated_cost || 0), 0);

    // Generate milestones
    const milestones = [
      {
        week: 4,
        title: 'Foundation Complete',
        description: 'Basic understanding of core concepts established'
      },
      {
        week: 12,
        title: 'Skill Development Milestone',
        description: 'Practical skills developed and demonstrated'
      },
      {
        week: 16,
        title: 'Certification Ready',
        description: 'Prepared for professional certification exam'
      },
      {
        week: totalWeeks,
        title: 'Goal Achievement',
        description: `Ready to pursue ${targetGoal.target_role || targetGoal.title} opportunities`
      }
    ];

    const learningPlan = {
      goal_id: targetGoal.id,
      goal_title: targetGoal.title,
      target_role: targetGoal.target_role,
      learning_path: learningPath,
      milestones,
      timeline: {
        total_weeks: totalWeeks,
        estimated_completion: new Date(Date.now() + totalWeeks * 7 * 24 * 60 * 60 * 1000).toISOString(),
        weekly_time_commitment: context?.time_budget_hours_per_week || 10
      },
      budget: {
        total_cost: totalCost,
        cost_breakdown: {
          courses: learningPath.filter(s => s.type === 'skill_development').reduce((sum, s) => sum + (s.estimated_cost || 0), 0),
          certifications: learningPath.filter(s => s.type === 'certification').reduce((sum, s) => sum + (s.estimated_cost || 0), 0),
          tools_software: 50
        }
      },
      personalization: {
        experience_level: context?.experience_level || 'beginner',
        learning_style_adapted: context?.preferred_learning_style || 'mixed',
        location_optimized: context?.location || 'global'
      }
    };

    console.log('Learning plan generated successfully');

    return new Response(JSON.stringify({
      success: true,
      learning_plan: learningPlan,
      next_steps: [
        'Review and approve learning plan',
        'Start with Phase 1 foundation skills',
        'Set up progress tracking',
        'Schedule weekly study sessions'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-learning-plan:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      learning_plan: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});