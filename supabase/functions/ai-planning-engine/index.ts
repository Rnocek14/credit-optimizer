import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanningRequest {
  operation: 'backward_planning' | 'unlock_analysis';
  target_job?: string;
  completed_skills?: string[];
  completed_courses?: string[];
  user_context?: any;
}

interface PathNode {
  id: string;
  title: string;
  type: string;
  time_cost_hours: number;
  monetary_cost: number;
  roi_score: number;
  difficulty_level: number;
}

interface LearningPath {
  id: string;
  nodes: PathNode[];
  total_time: number;
  total_cost: number;
  average_roi: number;
  path_type: 'fastest' | 'cheapest' | 'highest_roi';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { operation, target_job, completed_skills = [], completed_courses = [], user_context = {} } = await req.json() as PlanningRequest;

    if (operation === 'backward_planning') {
      const paths = await generateBackwardPlan(supabase, target_job!, user_context);
      return new Response(JSON.stringify({ success: true, paths }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'unlock_analysis') {
      const analysis = await analyzeUnlocks(supabase, completed_skills, completed_courses);
      return new Response(JSON.stringify({ success: true, analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid operation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-planning-engine:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateBackwardPlan(supabase: any, targetJob: string, userContext: any): Promise<LearningPath[]> {
  console.log(`Generating backward plan for: ${targetJob}`);

  // 1. Find target job node
  const { data: jobNodes } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('node_type', 'job')
    .ilike('title', `%${targetJob}%`)
    .eq('active', true);

  if (!jobNodes || jobNodes.length === 0) {
    throw new Error(`Job "${targetJob}" not found in career graph`);
  }

  const targetJobNode = jobNodes[0];
  console.log(`Found target job: ${targetJobNode.title}`);

  // 2. Find required skills for this job
  const { data: skillEdges } = await supabase
    .from('career_graph_edges')
    .select(`
      *,
      skill:to_id(*)
    `)
    .eq('from_id', targetJobNode.id)
    .eq('edge_type', 'REQUIRES_SKILL');

  const requiredSkills = skillEdges?.map((edge: any) => edge.skill) || [];
  console.log(`Found ${requiredSkills.length} required skills`);

  // 3. For each skill, find courses that teach it
  const paths: LearningPath[] = [];
  
  for (const skill of requiredSkills.slice(0, 5)) { // Limit to 5 skills for performance
    const { data: courseEdges } = await supabase
      .from('career_graph_edges')
      .select(`
        *,
        course:from_id(*)
      `)
      .eq('to_id', skill.id)
      .eq('edge_type', 'TEACHES')
      .eq('course.active', true);

    const coursesForSkill = courseEdges?.map((edge: any) => edge.course) || [];
    
    // Create paths for each course
    for (const course of coursesForSkill.slice(0, 3)) { // Limit to 3 courses per skill
      const path: LearningPath = {
        id: `${course.id}-${skill.id}-${targetJobNode.id}`,
        nodes: [
          {
            id: course.id,
            title: course.title,
            type: 'course',
            time_cost_hours: course.time_cost_hours || 40,
            monetary_cost: course.monetary_cost || 0,
            roi_score: course.roi_score || 0.7,
            difficulty_level: course.difficulty_level || 3
          },
          {
            id: skill.id,
            title: skill.title,
            type: 'skill',
            time_cost_hours: 0,
            monetary_cost: 0,
            roi_score: skill.roi_score || 0.8,
            difficulty_level: skill.difficulty_level || 3
          },
          {
            id: targetJobNode.id,
            title: targetJobNode.title,
            type: 'job',
            time_cost_hours: 0,
            monetary_cost: 0,
            roi_score: targetJobNode.roi_score || 0.9,
            difficulty_level: targetJobNode.difficulty_level || 4
          }
        ],
        total_time: course.time_cost_hours || 40,
        total_cost: course.monetary_cost || 0,
        average_roi: ((course.roi_score || 0.7) + (skill.roi_score || 0.8) + (targetJobNode.roi_score || 0.9)) / 3,
        path_type: 'highest_roi'
      };

      paths.push(path);
    }
  }

  // 4. Sort and categorize paths
  const sortedPaths = paths.sort((a, b) => b.average_roi - a.average_roi);
  
  // Mark path types
  if (sortedPaths.length > 0) {
    sortedPaths[0].path_type = 'highest_roi';
  }
  if (sortedPaths.length > 1) {
    const fastestPath = [...sortedPaths].sort((a, b) => a.total_time - b.total_time)[0];
    fastestPath.path_type = 'fastest';
  }
  if (sortedPaths.length > 2) {
    const cheapestPath = [...sortedPaths].sort((a, b) => a.total_cost - b.total_cost)[0];
    cheapestPath.path_type = 'cheapest';
  }

  console.log(`Generated ${sortedPaths.length} learning paths`);
  return sortedPaths.slice(0, 10); // Return top 10 paths
}

async function analyzeUnlocks(supabase: any, completedSkills: string[], completedCourses: string[]): Promise<any> {
  console.log(`Analyzing unlocks for ${completedSkills.length} skills and ${completedCourses.length} courses`);

  // 1. Find all jobs and their skill requirements
  const { data: jobNodes } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('node_type', 'job')
    .eq('active', true);

  const unlockedJobs = [];
  const partiallyQualifiedJobs = [];

  for (const job of jobNodes || []) {
    // Get required skills for this job
    const { data: skillEdges } = await supabase
      .from('career_graph_edges')
      .select('to_id')
      .eq('from_id', job.id)
      .eq('edge_type', 'REQUIRES_SKILL');

    const requiredSkillIds = skillEdges?.map((edge: any) => edge.to_id) || [];
    const completedRequiredSkills = requiredSkillIds.filter((skillId: string) => 
      completedSkills.includes(skillId)
    );

    const completionPercentage = requiredSkillIds.length > 0 
      ? (completedRequiredSkills.length / requiredSkillIds.length) * 100 
      : 0;

    if (completionPercentage >= 80) {
      unlockedJobs.push({
        job,
        completionPercentage,
        missingSkills: requiredSkillIds.length - completedRequiredSkills.length
      });
    } else if (completionPercentage >= 40) {
      partiallyQualifiedJobs.push({
        job,
        completionPercentage,
        missingSkills: requiredSkillIds.length - completedRequiredSkills.length
      });
    }
  }

  // 2. Find recommended next courses
  const { data: availableCourses } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('node_type', 'course')
    .eq('active', true)
    .not('id', 'in', `(${completedCourses.join(',') || 'null'})`);

  const recommendedCourses = (availableCourses || [])
    .sort((a: any, b: any) => (b.roi_score || 0) - (a.roi_score || 0))
    .slice(0, 5);

  return {
    unlockedJobs: unlockedJobs.sort((a, b) => b.completionPercentage - a.completionPercentage),
    partiallyQualifiedJobs: partiallyQualifiedJobs.sort((a, b) => b.completionPercentage - a.completionPercentage),
    recommendedCourses,
    summary: {
      totalUnlocked: unlockedJobs.length,
      totalPartial: partiallyQualifiedJobs.length,
      completedSkillsCount: completedSkills.length,
      completedCoursesCount: completedCourses.length
    }
  };
}