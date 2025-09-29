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
  path_type: 'fastest' | 'cheapest' | 'highest_roi' | 'easiest';
  confidence_score: number;
  pivot_score?: number;
  substitution_options?: PathNode[][];
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
      try {
        const paths = await generateBackwardPlan(supabase, target_job!, user_context);
        return new Response(JSON.stringify({ success: true, paths }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        // Check if error contains suggestions
        try {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorData = JSON.parse(errorMessage);
          if (errorData.suggestions) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: errorData.error,
              suggestions: errorData.suggestions 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            });
          }
        } catch (parseError) {
          // Not a JSON error, continue with regular error handling
        }
        throw error; // Re-throw if not a suggestions error
      }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateBackwardPlan(supabase: any, targetJob: string, userContext: any): Promise<LearningPath[]> {
  console.log(`🚀 Enhanced Backward Planning for: ${targetJob}`);
  console.log('User context:', userContext);

  // 1. Find target job node with enhanced fuzzy matching
  const targetJobNode = await findTargetJob(supabase, targetJob);
  console.log(`✅ Target job: ${targetJobNode.title} (ID: ${targetJobNode.id})`);

  // 2. Enhanced backward traversal with multi-step discovery
  const allPaths = await performEnhancedBackwardTraversal(supabase, targetJobNode, userContext);
  
  // 3. Apply multi-criteria optimization
  const optimizedPaths = await optimizePathsMultiCriteria(allPaths);
  
  // 4. Add pivot intelligence
  const pathsWithPivots = await enhancePivotIntelligence(supabase, optimizedPaths, userContext);
  
  // 5. Add substitution options
  const finalPaths = await addSubstitutionOptions(supabase, pathsWithPivots);

  console.log(`🎯 Generated ${finalPaths.length} enhanced learning paths`);
  return finalPaths.slice(0, 10);
}

async function findTargetJob(supabase: any, targetJob: string): Promise<any> {
  // Try exact match first
  const { data: exactMatches } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('node_type', 'job')
    .ilike('title', targetJob)
    .eq('active', true);

  if (exactMatches && exactMatches.length > 0) {
    return exactMatches[0];
  }

  // Try partial match
  const { data: partialMatches } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('node_type', 'job')
    .ilike('title', `%${targetJob}%`)
    .eq('active', true);

  if (partialMatches && partialMatches.length > 0) {
    return partialMatches[0];
  }

  // Fuzzy matching with suggestions
  const { data: allJobs } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('node_type', 'job')
    .eq('active', true);

  if (allJobs && allJobs.length > 0) {
    const suggestions = findSimilarJobs(targetJob, allJobs);
    if (suggestions.length > 0) {
      throw new Error(JSON.stringify({
        error: `Job "${targetJob}" not found. Did you mean one of these?`,
        suggestions: suggestions.slice(0, 5).map(j => j.title)
      }));
    }
  }
  
  throw new Error(JSON.stringify({
    error: `Job "${targetJob}" not found in our database.`,
    suggestions: []
  }));
}

async function performEnhancedBackwardTraversal(supabase: any, targetJobNode: any, userContext: any): Promise<LearningPath[]> {
  console.log(`🔍 Enhanced backward traversal from: ${targetJobNode.title}`);
  
  const allPaths: LearningPath[] = [];
  const visited = new Set<string>();
  
  // Recursive function to explore backward paths
  async function exploreBackward(currentNode: any, currentPath: PathNode[], totalTime: number, totalCost: number, depth: number): Promise<void> {
    const nodeKey = `${currentNode.id}-${depth}`;
    if (visited.has(nodeKey) || depth > 6) return; // Prevent cycles and limit depth
    visited.add(nodeKey);
    
    // Add current node to path
    const pathNode: PathNode = {
      id: currentNode.id,
      title: currentNode.title,
      type: currentNode.node_type,
      estimated_time_hours: currentNode.estimated_time_hours || 0,
      cost_estimate: currentNode.cost_estimate || 0,
      market_demand_score: currentNode.market_demand_score || 0.5,
      difficulty_level: currentNode.difficulty_level || 3
    };
    
    const newPath = [pathNode, ...currentPath];
    const newTotalTime = totalTime + (currentNode.estimated_time_hours || 0);
    const newTotalCost = totalCost + (currentNode.cost_estimate || 0);
    
    // If this is a learning resource (course/project), we have a complete path
    if (currentNode.node_type === 'course' || currentNode.node_type === 'project') {
      const learningPath: LearningPath = {
        id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nodes: newPath,
        total_time: newTotalTime,
        total_cost: newTotalCost,
        average_roi: calculateROI(newPath),
        path_type: 'highest_roi',
        confidence_score: calculateConfidence(newPath, depth)
      };
      
      allPaths.push(learningPath);
      console.log(`📚 Found learning path: ${newPath.map(n => n.title).join(' → ')}`);
      return;
    }
    
    // Continue backward traversal
    const incomingEdges = await findIncomingEdges(supabase, currentNode.id);
    
    for (const edge of incomingEdges) {
      const { data: fromNodes } = await supabase
        .from('career_graph_nodes')
        .select('*')
        .eq('id', edge.from_id)
        .eq('active', true);
        
      if (fromNodes && fromNodes.length > 0) {
        await exploreBackward(fromNodes[0], newPath, newTotalTime, newTotalCost, depth + 1);
      }
    }
    
    // Also check for intermediate steps and pivot opportunities
    if (currentNode.node_type === 'job') {
      await exploreJobSteps(supabase, currentNode, newPath, newTotalTime, newTotalCost, depth);
      await explorePivotPaths(supabase, currentNode, newPath, newTotalTime, newTotalCost, depth);
    }
  }
  
  // Start the backward traversal
  await exploreBackward(targetJobNode, [], 0, 0, 0);
  
  return allPaths;
}

async function findIncomingEdges(supabase: any, nodeId: string): Promise<any[]> {
  const { data: edges } = await supabase
    .from('career_graph_edges')
    .select('*')
    .eq('to_id', nodeId)
    .in('edge_type', ['REQUIRES_SKILL', 'TEACHES', 'DEMONSTRATES', 'UNLOCKS', 'LEADS_TO']);
    
  return edges || [];
}

async function exploreJobSteps(supabase: any, jobNode: any, currentPath: PathNode[], totalTime: number, totalCost: number, depth: number): Promise<void> {
  // Look for career steps that lead to this job
  const { data: stepEdges } = await supabase
    .from('career_graph_edges')
    .select('from_id')
    .eq('to_id', jobNode.id)
    .eq('edge_type', 'LEADS_TO');
    
  if (!stepEdges || stepEdges.length === 0) return;
  
  for (const edge of stepEdges.slice(0, 3)) { // Limit for performance
    const { data: stepNodes } = await supabase
      .from('career_graph_nodes')
      .select('*')
      .eq('id', edge.from_id)
      .eq('node_type', 'step')
      .eq('active', true);
      
    if (stepNodes && stepNodes.length > 0) {
      // Recursively explore from the step
      // This would continue the traversal...
    }
  }
}

async function explorePivotPaths(supabase: any, jobNode: any, currentPath: PathNode[], totalTime: number, totalCost: number, depth: number): Promise<void> {
  // Look for pivot opportunities using PIVOT_TO edges
  const { data: pivotEdges } = await supabase
    .from('career_graph_edges')
    .select('*')
    .eq('to_id', jobNode.id)
    .eq('edge_type', 'PIVOT_TO');
    
  // Add pivot intelligence logic here
  // This would explore alternative career paths through pivots
}

function calculateROI(path: PathNode[]): number {
  const totalDemand = path.reduce((sum, node) => sum + node.market_demand_score, 0);
  const totalCost = Math.max(path.reduce((sum, node) => sum + node.cost_estimate, 0), 1);
  const totalTime = Math.max(path.reduce((sum, node) => sum + node.estimated_time_hours, 0), 1);
  
  return (totalDemand / path.length) * (1000 / totalCost) * (100 / totalTime);
}

function calculateConfidence(path: PathNode[], depth: number): number {
  const baseConfidence = 0.9;
  const depthPenalty = depth * 0.05;
  const completenessBonus = path.length > 3 ? 0.1 : 0;
  
  return Math.max(0.1, Math.min(1.0, baseConfidence - depthPenalty + completenessBonus));
}

async function optimizePathsMultiCriteria(paths: LearningPath[]): Promise<LearningPath[]> {
  console.log(`🎯 Optimizing ${paths.length} paths with multi-criteria`);
  
  if (paths.length === 0) return paths;
  
  // Create different optimized versions
  const fastestPaths = [...paths].sort((a, b) => a.total_time - b.total_time);
  const cheapestPaths = [...paths].sort((a, b) => a.total_cost - b.total_cost);
  const highestROIPaths = [...paths].sort((a, b) => b.average_roi - a.average_roi);
  const easiestPaths = [...paths].sort((a, b) => {
    const avgDifficultyA = a.nodes.reduce((sum, n) => sum + n.difficulty_level, 0) / a.nodes.length;
    const avgDifficultyB = b.nodes.reduce((sum, n) => sum + n.difficulty_level, 0) / b.nodes.length;
    return avgDifficultyA - avgDifficultyB;
  });
  
  // Mark path types and combine unique paths
  const optimizedPaths = new Map<string, LearningPath>();
  
  if (fastestPaths.length > 0) {
    fastestPaths[0].path_type = 'fastest';
    optimizedPaths.set(fastestPaths[0].id, fastestPaths[0]);
  }
  
  if (cheapestPaths.length > 0) {
    cheapestPaths[0].path_type = 'cheapest';
    optimizedPaths.set(cheapestPaths[0].id, cheapestPaths[0]);
  }
  
  if (highestROIPaths.length > 0) {
    highestROIPaths[0].path_type = 'highest_roi';
    optimizedPaths.set(highestROIPaths[0].id, highestROIPaths[0]);
  }
  
  if (easiestPaths.length > 0) {
    easiestPaths[0].path_type = 'easiest';
    optimizedPaths.set(easiestPaths[0].id, easiestPaths[0]);
  }
  
  // Add other high-quality paths
  const remainingPaths = paths
    .filter(p => !optimizedPaths.has(p.id))
    .sort((a, b) => (b.average_roi * b.confidence_score) - (a.average_roi * a.confidence_score))
    .slice(0, 6);
    
  remainingPaths.forEach(path => optimizedPaths.set(path.id, path));
  
  return Array.from(optimizedPaths.values());
}

async function enhancePivotIntelligence(supabase: any, paths: LearningPath[], userContext: any): Promise<LearningPath[]> {
  console.log(`🔄 Enhancing pivot intelligence for ${paths.length} paths`);
  
  // Add pivot scoring to existing paths
  for (const path of paths) {
    path.pivot_score = await calculatePivotScore(supabase, path, userContext);
  }
  
  // Generate additional pivot-based paths if user has current job context
  if (userContext.currentJob) {
    const pivotPaths = await generatePivotPaths(supabase, userContext.currentJob, paths[0]?.nodes[paths[0].nodes.length - 1]);
    paths.push(...pivotPaths);
  }
  
  return paths;
}

async function calculatePivotScore(supabase: any, path: LearningPath, userContext: any): Promise<number> {
  // Calculate how "pivot-friendly" this path is
  // Based on skill transferability, market demand, etc.
  let score = 0.5;
  
  // Check if target job has pivot edges
  const targetJob = path.nodes[path.nodes.length - 1];
  const { data: pivotEdges } = await supabase
    .from('career_graph_edges')
    .select('*')
    .eq('from_id', targetJob.id)
    .eq('edge_type', 'PIVOT_TO');
    
  if (pivotEdges && pivotEdges.length > 0) {
    score += 0.3; // Bonus for having explicit pivot options
  }
  
  return Math.min(1.0, score);
}

async function generatePivotPaths(supabase: any, currentJob: string, targetJob: any): Promise<LearningPath[]> {
  // Generate paths that use intermediate jobs as pivots
  const pivotPaths: LearningPath[] = [];
  
  // Find jobs that connect current and target via skills
  const { data: potentialPivots } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('node_type', 'job')
    .eq('active', true);
    
  // Implementation for pivot path generation would go here
  
  return pivotPaths;
}

async function addSubstitutionOptions(supabase: any, paths: LearningPath[]): Promise<LearningPath[]> {
  console.log(`🔀 Adding substitution options for ${paths.length} paths`);
  
  for (const path of paths) {
    const substitutions: PathNode[][] = [];
    
    // For each learning node (course/project), find alternatives
    for (let i = 0; i < path.nodes.length; i++) {
      const node = path.nodes[i];
      if (node.type === 'course' || node.type === 'project') {
        const alternatives = await findAlternativeLearningMethods(supabase, node, path.nodes[i + 1]);
        if (alternatives.length > 0) {
          substitutions[i] = alternatives;
        }
      }
    }
    
    path.substitution_options = substitutions;
  }
  
  return paths;
}

async function findAlternativeLearningMethods(supabase: any, currentNode: PathNode, nextNode?: PathNode): Promise<PathNode[]> {
  if (!nextNode || nextNode.type !== 'skill') return [];
  
  // Find other courses/projects that teach the same skill
  const { data: alternativeEdges } = await supabase
    .from('career_graph_edges')
    .select('from_id')
    .eq('to_id', nextNode.id)
    .in('edge_type', ['TEACHES', 'DEMONSTRATES'])
    .neq('from_id', currentNode.id);
    
  if (!alternativeEdges || alternativeEdges.length === 0) return [];
  
  const { data: alternatives } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .in('id', alternativeEdges.map((e: any) => e.from_id))
    .eq('active', true);
    
  return (alternatives || []).map((alt: any) => ({
    id: alt.id,
    title: alt.title,
    type: alt.node_type,
    estimated_time_hours: alt.estimated_time_hours || 0,
    cost_estimate: alt.cost_estimate || 0,
    market_demand_score: alt.market_demand_score || 0.5,
    difficulty_level: alt.difficulty_level || 3
  })).slice(0, 3); // Limit alternatives
}

// Fuzzy job matching function
function findSimilarJobs(searchTerm: string, allJobs: any[]): any[] {
  const searchLower = searchTerm.toLowerCase();
  const keywords = searchLower.split(' ').filter(word => word.length > 2);
  
  const scored = allJobs.map(job => {
    const titleLower = job.title.toLowerCase();
    let score = 0;
    
    // Exact match bonus
    if (titleLower === searchLower) score += 100;
    
    // Partial match bonus
    if (titleLower.includes(searchLower)) score += 50;
    
    // Keyword matching
    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) score += 10;
    });
    
    // Levenshtein-inspired simple scoring
    const commonChars = countCommonChars(searchLower, titleLower);
    score += commonChars * 2;
    
    return { ...job, score };
  });
  
  return scored
    .filter(job => job.score > 5) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function countCommonChars(str1: string, str2: string): number {
  const chars1 = str1.split('');
  const chars2 = str2.split('');
  let common = 0;
  
  chars1.forEach(char => {
    const index = chars2.indexOf(char);
    if (index !== -1) {
      common++;
      chars2.splice(index, 1); // Remove to avoid double counting
    }
  });
  
  return common;
}

async function analyzeUnlocks(supabase: any, completedSkills: string[] = [], completedCourses: string[] = []): Promise<any> {
  console.log('=== UNLOCK ANALYSIS START ===');
  console.log('Analyzing unlocks for', completedSkills.length, 'skills and', completedCourses.length, 'courses');
  console.log('Input skills:', JSON.stringify(completedSkills));
  console.log('Input courses:', JSON.stringify(completedCourses));
  
  try {
    // 1. Get all skill nodes to map titles to IDs
    const { data: skillNodes, error: skillError } = await supabase
      .from('career_graph_nodes')
      .select('id, title')
      .eq('node_type', 'skill')
      .eq('active', true);

    if (skillError) {
      console.error('Error fetching skill nodes:', skillError);
      return null;
    }

    console.log(`Found ${skillNodes?.length || 0} total skill nodes`);

    // Convert skill titles to IDs
    const completedSkillIds: string[] = [];
    console.log('🔍 Available skill titles (first 20):', skillNodes?.slice(0, 20).map((s: any) => s.title));
    
    for (const skillTitle of completedSkills) {
      // Try exact match first
      const skill = skillNodes?.find((s: any) => s.title === skillTitle);
      if (skill) {
        completedSkillIds.push(skill.id);
        console.log(`✅ Converting skill "${skillTitle}" to ID: ${skill.id}`);
      } else {
        // Try case-insensitive match
        const skillCaseInsensitive = skillNodes?.find((s: any) => 
          s.title.toLowerCase() === skillTitle.toLowerCase()
        );
        if (skillCaseInsensitive) {
          completedSkillIds.push(skillCaseInsensitive.id);
          console.log(`✅ Converting skill "${skillTitle}" to ID (case-insensitive): ${skillCaseInsensitive.id}`);
        } else {
          // Try partial match
          const skillPartial = skillNodes?.find((s: any) => 
            s.title.toLowerCase().includes(skillTitle.toLowerCase()) ||
            skillTitle.toLowerCase().includes(s.title.toLowerCase())
          );
          if (skillPartial) {
            completedSkillIds.push(skillPartial.id);
            console.log(`✅ Converting skill "${skillTitle}" to ID (partial match): "${skillPartial.title}" -> ${skillPartial.id}`);
          } else {
            console.log(`❌ Skill "${skillTitle}" not found in database`);
            console.log('🔍 Similar skills:', skillNodes?.filter((s: any) => 
              s.title.toLowerCase().includes('ux') || 
              s.title.toLowerCase().includes('design') ||
              s.title.toLowerCase().includes('figma') ||
              s.title.toLowerCase().includes('ui')
            ).slice(0, 10).map((s: any) => s.title));
          }
        }
      }
    }

    console.log(`Converted ${completedSkills.length} skill titles to ${completedSkillIds.length} skill IDs`);
    console.log('Completed skill IDs:', completedSkillIds);

    // 2. Convert course titles to IDs (if needed)
    let completedCourseIds: string[] = [];
    if (completedCourses.length > 0) {
      // Check if first item looks like a UUID or a title
      const firstCourse = completedCourses[0];
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstCourse);
      
      if (isUUID) {
        completedCourseIds = completedCourses;
        console.log('Using course UUIDs directly');
      } else {
        console.log('Converting course titles to IDs');
        const { data: courseNodes, error: courseNodeError } = await supabase
          .from('career_graph_nodes')
          .select('id, title')
          .eq('node_type', 'course')
          .eq('active', true);

        if (courseNodeError) {
          console.error('Error fetching course nodes:', courseNodeError);
        } else {
          for (const courseTitle of completedCourses) {
            const course = courseNodes?.find((c: any) => c.title === courseTitle);
            if (course) {
              completedCourseIds.push(course.id);
              console.log(`Converting course "${courseTitle}" to ID: ${course.id}`);
            } else {
              console.log(`Course "${courseTitle}" not found in database`);
            }
          }
        }
      }
    }

    console.log(`Converted ${completedCourses.length} course inputs to ${completedCourseIds.length} course IDs`);

    // 3. Get all job nodes
    const { data: jobNodes, error: jobError } = await supabase
      .from('career_graph_nodes')
      .select('id, title, node_type')
      .eq('node_type', 'job')
      .eq('active', true);

    if (jobError) {
      console.error('Error fetching job nodes:', jobError);
      return null;
    }

    console.log(`Found ${jobNodes?.length || 0} job nodes`);

    // 4. For each job, check required skills
    const unlockedJobs = [];
    const partiallyQualifiedJobs = [];
    let jobCount = 0;

    for (const job of jobNodes || []) {
      jobCount++;
      if (jobCount <= 10) { // Increased to 10 for better debugging
        console.log(`Processing job ${jobCount}: ${job.title} (ID: ${job.id})`);
      }

      // Get skills required by this job - try multiple edge types
      let requiredSkillEdges = [];
      
      // Try REQUIRES_SKILL first
      const { data: skillReqEdges, error: edgeError1 } = await supabase
        .from('career_graph_edges')
        .select('from_id, to_id, edge_type')
        .eq('edge_type', 'REQUIRES_SKILL')
        .eq('to_id', job.id);
        
      if (skillReqEdges && skillReqEdges.length > 0) {
        requiredSkillEdges = skillReqEdges;
        if (jobCount <= 5) console.log(`✅ Found ${skillReqEdges.length} REQUIRES_SKILL edges for ${job.title}`);
      } else {
        // Try skill_requirement
        const { data: skillReqEdges2, error: edgeError2 } = await supabase
          .from('career_graph_edges')
          .select('from_id, to_id, edge_type')
          .eq('edge_type', 'skill_requirement')
          .eq('to_id', job.id);
          
        if (skillReqEdges2 && skillReqEdges2.length > 0) {
          requiredSkillEdges = skillReqEdges2;
          if (jobCount <= 5) console.log(`✅ Found ${skillReqEdges2.length} skill_requirement edges for ${job.title}`);
        } else {
          if (jobCount <= 5) console.log(`❌ No skill edges found for ${job.title} with either edge type`);
        }
      }

      const requiredSkillIds = requiredSkillEdges?.map((edge: any) => edge.from_id) || [];
      if (jobCount <= 5) {
        console.log(`🎯 Required skill IDs for ${job.title}:`, JSON.stringify(requiredSkillIds, null, 2));
      }
      
      const completedRequiredSkills = requiredSkillIds.filter((skillId: any) => {
        const isCompleted = completedSkillIds.includes(skillId);
        if (jobCount <= 5) { // Only log first 5 jobs for readability
          console.log(`  ${isCompleted ? '✅' : '❌'} Skill ${skillId}: ${isCompleted ? 'COMPLETED' : 'not completed'}`);
        }
        return isCompleted;
      });

      const completionPercentage = requiredSkillIds.length > 0 
        ? (completedRequiredSkills.length / requiredSkillIds.length) * 100 
        : 0;

      if (jobCount <= 5) {
        console.log(`📊 Job ${job.title}: ${completedRequiredSkills.length}/${requiredSkillIds.length} skills (${completionPercentage.toFixed(1)}%)`);
      }

      if (completionPercentage >= 80) {
        const jobItem = {
          job: {
            id: job.id,
            title: job.title,
            description: job.description || '',
            market_demand_score: job.market_demand_score || 0.5,
            difficulty_level: job.difficulty_level || 3
          },
          completionPercentage: Math.round(completionPercentage),
          missingSkills: requiredSkillIds.length - completedRequiredSkills.length
        };
        unlockedJobs.push(jobItem);
        if (jobCount <= 5) console.log(`✅ Job ${job.title} UNLOCKED (${completionPercentage.toFixed(1)}% >= 80%)`);
      } else if (completionPercentage >= 35) {
        const jobItem = {
          job: {
            id: job.id,
            title: job.title,
            description: job.description || '',
            market_demand_score: job.market_demand_score || 0.5,
            difficulty_level: job.difficulty_level || 3
          },
          completionPercentage: Math.round(completionPercentage),
          missingSkills: requiredSkillIds.length - completedRequiredSkills.length
        };
        partiallyQualifiedJobs.push(jobItem);
        if (jobCount <= 5) console.log(`🔶 Job ${job.title} PARTIALLY QUALIFIED (${completionPercentage.toFixed(1)}% >= 35%)`);
      } else {
        if (jobCount <= 5) console.log(`❌ Job ${job.title} not qualified (${completionPercentage.toFixed(1)}% < 35%)`);	
      }
    }

    console.log(`Job analysis complete: ${unlockedJobs.length} unlocked, ${partiallyQualifiedJobs.length} partially qualified`);

    // 5. Get course recommendations (limit to 5)
    let availableCourses = [];
    try {
      const courseQuery = supabase
        .from('career_graph_nodes')
        .select('id, title, market_demand_score')
        .eq('node_type', 'course')
        .eq('active', true)
        .order('market_demand_score', { ascending: false })
        .limit(5);

      // Only filter out completed courses if we have valid UUIDs
      if (completedCourseIds.length > 0) {
        courseQuery.not('id', 'in', `(${completedCourseIds.map(id => `"${id}"`).join(',')})`);
      }

      const { data: courseData, error: courseError } = await courseQuery;

      if (courseError) {
        console.error('Error fetching available courses:', courseError);
      } else {
        availableCourses = courseData || [];
      }
    } catch (courseError) {
      console.error('Error in course recommendation query:', courseError);
    }

    console.log(`Found ${availableCourses.length} recommended courses`);

    const result = {
      unlockedJobs,
      partiallyQualifiedJobs,
      recommendedCourses: availableCourses,
      summary: {
        totalUnlocked: unlockedJobs.length,
        totalPartial: partiallyQualifiedJobs.length,
        totalValidJobs: jobNodes?.length || 0,
        completedSkillsCount: completedSkillIds.length,
        completedCoursesCount: completedCourseIds.length,
        skillConversionSuccess: completedSkillIds.length
      }
    };

    console.log('=== FINAL UNLOCK ANALYSIS RESULT ===');
    console.log('Summary:', JSON.stringify(result.summary, null, 2));
    console.log('Unlocked Jobs Count:', result.unlockedJobs.length);
    console.log('Partially Qualified Jobs Count:', result.partiallyQualifiedJobs.length);
    console.log('Recommended Courses Count:', result.recommendedCourses.length);
    
    // Log first few items to validate structure
    if (result.unlockedJobs.length > 0) {
      console.log('Sample Unlocked Job:', JSON.stringify(result.unlockedJobs[0], null, 2));
    }
    if (result.partiallyQualifiedJobs.length > 0) {
      console.log('Sample Partially Qualified Job:', JSON.stringify(result.partiallyQualifiedJobs[0], null, 2));
    }
    if (result.recommendedCourses.length > 0) {
      console.log('Sample Recommended Course:', JSON.stringify(result.recommendedCourses[0], null, 2));
    }
    
    console.log('=== END UNLOCK ANALYSIS ===');
    return result;

  } catch (error) {
    console.error('Error in analyzeUnlocks:', error);
    return null;
  }
}