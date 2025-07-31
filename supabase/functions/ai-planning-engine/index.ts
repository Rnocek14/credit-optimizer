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
  estimated_time_hours: number;
  cost_estimate: number;
  market_demand_score: number;
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
    console.log(`No job nodes found for: ${targetJob}`);
    throw new Error(`Job "${targetJob}" not found in career graph`);
  }

  const targetJobNode = jobNodes[0];
  console.log(`Found target job: ${targetJobNode.title} (ID: ${targetJobNode.id})`);

  // 2. Find required skills for this job using separate queries
  const { data: skillEdges } = await supabase
    .from('career_graph_edges')
    .select('from_id')
    .eq('to_id', targetJobNode.id)
    .eq('edge_type', 'REQUIRES_SKILL');

  console.log(`Found ${skillEdges?.length || 0} skill requirement edges`);
  
  if (!skillEdges || skillEdges.length === 0) {
    console.log(`No required skills found for job: ${targetJobNode.title}`);
    return [];
  }

  // Get the actual skill nodes
  const skillIds = skillEdges.map(edge => edge.from_id);
  const { data: requiredSkills } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .in('id', skillIds)
    .eq('active', true);

  console.log(`Found ${requiredSkills?.length || 0} required skills`);

  if (!requiredSkills || requiredSkills.length === 0) {
    console.log(`No active required skills found`);
    return [];
  }

  // 3. For each skill, find courses that teach it
  const paths: LearningPath[] = [];
  
  for (const skill of requiredSkills.slice(0, 5)) { // Limit to 5 skills for performance
    console.log(`Processing skill: ${skill.title} (ID: ${skill.id})`);
    
    // Find courses that teach this skill
    const { data: courseEdges } = await supabase
      .from('career_graph_edges')
      .select('from_id')
      .eq('to_id', skill.id)
      .eq('edge_type', 'TEACHES');

    console.log(`Found ${courseEdges?.length || 0} course edges for skill: ${skill.title}`);

    if (!courseEdges || courseEdges.length === 0) {
      console.log(`No courses found for skill: ${skill.title}`);
      continue;
    }

    // Get the actual course nodes
    const courseIds = courseEdges.map(edge => edge.from_id);
    const { data: coursesForSkill } = await supabase
      .from('career_graph_nodes')
      .select('*')
      .in('id', courseIds)
      .eq('active', true);

    console.log(`Found ${coursesForSkill?.length || 0} active courses for skill: ${skill.title}`);
    
    // Create paths for each course
    for (const course of (coursesForSkill || []).slice(0, 3)) { // Limit to 3 courses per skill
      console.log(`Creating path for course: ${course.title}`);
      
      const path: LearningPath = {
        id: `${course.id}-${skill.id}-${targetJobNode.id}`,
        nodes: [
          {
            id: course.id,
            title: course.title,
            type: 'course',
            estimated_time_hours: course.estimated_time_hours || 20,
            cost_estimate: course.cost_estimate || 0,
            market_demand_score: course.market_demand_score || 0.5,
            difficulty_level: course.difficulty_level || 3
          },
          {
            id: skill.id,
            title: skill.title,
            type: 'skill',
            estimated_time_hours: 0,
            cost_estimate: 0,
            market_demand_score: skill.market_demand_score || 0.5,
            difficulty_level: skill.difficulty_level || 3
          },
          {
            id: targetJobNode.id,
            title: targetJobNode.title,
            type: 'job',
            estimated_time_hours: 0,
            cost_estimate: 0,
            market_demand_score: targetJobNode.market_demand_score || 0.5,
            difficulty_level: targetJobNode.difficulty_level || 4
          }
        ],
        total_time: course.estimated_time_hours || 20,
        total_cost: course.cost_estimate || 0,
        average_roi: ((course.market_demand_score || 0.5) + (skill.market_demand_score || 0.5) + (targetJobNode.market_demand_score || 0.5)) / 3,
        path_type: 'highest_roi'
      };

      paths.push(path);
      console.log(`Added path: ${course.title} → ${skill.title} → ${targetJobNode.title}`);
    }
  }

  console.log(`Generated ${paths.length} total learning paths before sorting`);

  if (paths.length === 0) {
    console.log(`No learning paths generated - no courses found for required skills`);
    return [];
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

  try {
    // Convert skill titles to IDs if needed
    const { data: skillNodes, error: skillError } = await supabase
      .from('career_graph_nodes')
      .select('id, title')
      .eq('node_type', 'skill')
      .eq('active', true);

    if (skillError) {
      console.error('Error fetching skill nodes:', skillError);
      throw new Error('Failed to fetch skill nodes');
    }

    console.log(`Found ${skillNodes?.length || 0} total skill nodes`);

    const skillTitleToId = new Map();
    skillNodes?.forEach((skill: any) => {
      skillTitleToId.set(skill.title, skill.id);
    });

    const completedSkillIds = completedSkills.map(skill => {
      const skillId = skillTitleToId.get(skill) || skill;
      console.log(`Converting skill "${skill}" to ID: ${skillId}`);
      return skillId;
    }).filter(Boolean);

    console.log(`Converted ${completedSkills.length} skill titles to ${completedSkillIds.length} skill IDs`);

    // 1. Find all jobs and their skill requirements
    const { data: jobNodes, error: jobError } = await supabase
      .from('career_graph_nodes')
      .select('*')
      .eq('node_type', 'job')
      .eq('active', true);

    if (jobError) {
      console.error('Error fetching job nodes:', jobError);
      throw new Error('Failed to fetch job nodes');
    }

    console.log(`Found ${jobNodes?.length || 0} job nodes`);

    const unlockedJobs = [];
    const partiallyQualifiedJobs = [];
    let jobsProcessed = 0;

    for (const job of jobNodes || []) {
      jobsProcessed++;
      if (jobsProcessed <= 5) { // Log first 5 jobs for debugging
        console.log(`Processing job ${jobsProcessed}: ${job.title} (ID: ${job.id})`);
      }

      // Get required skills for this job
      const { data: skillEdges, error: edgeError } = await supabase
        .from('career_graph_edges')
        .select('from_id')
        .eq('to_id', job.id)
        .eq('edge_type', 'REQUIRES_SKILL');

      if (edgeError) {
        console.error(`Error fetching skill edges for job ${job.title}:`, edgeError);
        continue;
      }

      const requiredSkillIds = skillEdges?.map((edge: any) => edge.from_id) || [];
      const completedRequiredSkills = requiredSkillIds.filter((skillId: string) => 
        completedSkillIds.includes(skillId)
      );

      const completionPercentage = requiredSkillIds.length > 0 
        ? (completedRequiredSkills.length / requiredSkillIds.length) * 100 
        : 0;

      if (jobsProcessed <= 5) { // Log first 5 jobs for debugging
        console.log(`Job ${job.title}: ${completedRequiredSkills.length}/${requiredSkillIds.length} skills (${completionPercentage.toFixed(1)}%)`);
      }

      // Ensure job has valid structure for response
      const jobData = {
        id: job.id,
        title: job.title,
        description: job.description || '',
        market_demand_score: job.market_demand_score || 0.5,
        difficulty_level: job.difficulty_level || 3
      };

      if (completionPercentage >= 80) {
        unlockedJobs.push({
          job: jobData,
          completionPercentage: Math.round(completionPercentage),
          missingSkills: requiredSkillIds.length - completedRequiredSkills.length,
          requiredSkillsCount: requiredSkillIds.length,
          completedSkillsCount: completedRequiredSkills.length
        });
      } else if (completionPercentage >= 40) {
        partiallyQualifiedJobs.push({
          job: jobData,
          completionPercentage: Math.round(completionPercentage),
          missingSkills: requiredSkillIds.length - completedRequiredSkills.length,
          requiredSkillsCount: requiredSkillIds.length,
          completedSkillsCount: completedRequiredSkills.length
        });
      }
    }

    console.log(`Job analysis complete: ${unlockedJobs.length} unlocked, ${partiallyQualifiedJobs.length} partially qualified`);

    // 2. Find recommended next courses (avoiding SQL injection)
    let availableCourses = [];
    if (completedCourses.length > 0) {
      const { data: courses, error: courseError } = await supabase
        .from('career_graph_nodes')
        .select('*')
        .eq('node_type', 'course')
        .eq('active', true)
        .not('id', 'in', `(${completedCourses.map(id => `'${id}'`).join(',')})`);

      if (courseError) {
        console.error('Error fetching available courses:', courseError);
        // Continue without recommended courses
      } else {
        availableCourses = courses || [];
      }
    } else {
      // No completed courses, get all courses
      const { data: courses, error: courseError } = await supabase
        .from('career_graph_nodes')
        .select('*')
        .eq('node_type', 'course')
        .eq('active', true);

      if (courseError) {
        console.error('Error fetching all courses:', courseError);
      } else {
        availableCourses = courses || [];
      }
    }

    const recommendedCourses = availableCourses
      .sort((a: any, b: any) => (b.market_demand_score || 0.5) - (a.market_demand_score || 0.5))
      .slice(0, 5)
      .map(course => ({
        id: course.id,
        title: course.title,
        description: course.description || '',
        market_demand_score: course.market_demand_score || 0.5,
        estimated_time_hours: course.estimated_time_hours || 20,
        cost_estimate: course.cost_estimate || 0,
        difficulty_level: course.difficulty_level || 3
      }));

    console.log(`Found ${recommendedCourses.length} recommended courses`);

    const result = {
      unlockedJobs: unlockedJobs.sort((a, b) => b.completionPercentage - a.completionPercentage),
      partiallyQualifiedJobs: partiallyQualifiedJobs.sort((a, b) => b.completionPercentage - a.completionPercentage),
      recommendedCourses,
      summary: {
        totalUnlocked: unlockedJobs.length,
        totalPartial: partiallyQualifiedJobs.length,
        totalValidJobs: jobNodes?.length || 0,
        completedSkillsCount: completedSkills.length,
        completedCoursesCount: completedCourses.length,
        skillConversionSuccess: completedSkillIds.length
      }
    };

    console.log('Unlock analysis result:', JSON.stringify(result.summary, null, 2));
    return result;

  } catch (error) {
    console.error('Error in analyzeUnlocks:', error);
    throw error;
  }
}