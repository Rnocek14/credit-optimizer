import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SemanticPlanningRequest {
  operation: 'enhanced_planning' | 'pivot_analysis' | 'substitution_discovery' | 'graph_validation';
  target_job?: string;
  current_job_id?: string;
  node_id?: string;
  user_context?: {
    user_id?: string;
    current_skills?: string[];
    completed_courses?: string[];
    location?: string;
    time_constraint_months?: number;
    budget_limit?: number;
    learning_style_preferences?: {
      prefers_courses?: boolean;
      prefers_projects?: boolean;
      prefers_certifications?: boolean;
    };
    target_salary_range?: [number, number];
  };
}

interface SemanticNode {
  id: string;
  title: string;
  type: string;
  semantic_tags: string[];
  skill_cluster?: string;
  substitution_group_id?: string;
  semantic_strength?: number;
  context_metadata: {
    difficulty_level?: number;
    market_demand_score?: number;
    cost_estimate?: number;
    estimated_time_hours?: number;
    prerequisite_ids?: string[];
    industry_alignment?: any;
    location_multipliers?: any;
  };
}

interface SubstitutionOption {
  original_node: SemanticNode;
  alternatives: SemanticNode[];
  substitution_score: number;
  cost_benefit_ratio: number;
  skill_equivalence: number;
  user_preference_match?: number;
}

interface PivotOpportunity {
  from_job_id: string;
  to_job_id: string;
  skill_overlap_percentage: number;
  bridge_skills: string[];
  transition_difficulty: number;
  roi_score: number;
  estimated_transition_time: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData = await req.json() as SemanticPlanningRequest;
    const { operation, target_job, current_job_id, node_id, user_context = {} } = requestData;

    console.log(`🧠 Semantic Planning Engine - Operation: ${operation}`);

    switch (operation) {
      case 'enhanced_planning':
        const enhancedPaths = await generateEnhancedPlan(supabase, target_job!, user_context);
        return new Response(JSON.stringify({ success: true, paths: enhancedPaths }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'pivot_analysis':
        const pivotOpportunities = await analyzePivotOpportunities(supabase, current_job_id!, user_context);
        return new Response(JSON.stringify({ success: true, opportunities: pivotOpportunities }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'substitution_discovery':
        const substitutions = await findNodeSubstitutions(supabase, node_id!, user_context);
        return new Response(JSON.stringify({ success: true, substitutions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'graph_validation':
        const validation = await validateGraphIntegrity(supabase);
        return new Response(JSON.stringify({ success: true, validation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in semantic-planning-engine:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateEnhancedPlan(supabase: any, targetJob: string, userContext: any): Promise<any[]> {
  console.log(`🎯 Generating enhanced plan for: ${targetJob}`);
  
  // First, call the existing AI planning engine
  const { data: basePlans } = await supabase.functions.invoke('ai-planning-engine', {
    body: {
      operation: 'backward_planning',
      target_job: targetJob,
      user_context: userContext
    }
  });

  if (!basePlans?.success || !basePlans?.paths) {
    throw new Error('Failed to generate base learning paths');
  }

  console.log(`📚 Enhancing ${basePlans.paths.length} base paths with semantic layer`);

  // Enhance each path with semantic intelligence
  const enhancedPaths = await Promise.all(
    basePlans.paths.map(async (path: any) => {
      const personalizationScore = calculatePersonalizationScore(path, userContext);
      const substitutions = await findPathSubstitutions(supabase, path, userContext);
      const adaptedNodes = path.nodes.map((node: any) => adaptNodeToUser(node, userContext));

      return {
        ...path,
        personalization_score: personalizationScore,
        time_feasibility: calculateTimeFeasibility(path, userContext),
        budget_feasibility: calculateBudgetFeasibility(path, userContext),
        location_relevance: calculateLocationRelevance(path, userContext),
        semantic_substitutions: substitutions,
        adapted_nodes: adaptedNodes
      };
    })
  );

  // Sort by personalization score
  const sortedPaths = enhancedPaths.sort((a, b) => 
    (b.personalization_score || 0.5) - (a.personalization_score || 0.5)
  );

  console.log(`✨ Generated ${sortedPaths.length} personalized learning paths`);
  return sortedPaths;
}

async function analyzePivotOpportunities(supabase: any, fromJobId: string, userContext: any): Promise<PivotOpportunity[]> {
  console.log(`🔄 Analyzing pivot opportunities from job: ${fromJobId}`);

  // Get PIVOT_TO edges from the database
  const { data: pivotEdges } = await supabase
    .from('career_graph_edges')
    .select(`
      *,
      from_node:career_graph_nodes!from_id(id, title, node_type),
      to_node:career_graph_nodes!to_id(id, title, node_type)
    `)
    .eq('from_id', fromJobId)
    .eq('edge_type', 'PIVOT_TO');

  if (!pivotEdges || pivotEdges.length === 0) {
    console.log('No direct pivot opportunities found');
    return [];
  }

  const opportunities: PivotOpportunity[] = [];

  for (const edge of pivotEdges) {
    const skillOverlap = await calculateSkillOverlap(supabase, fromJobId, edge.to_id);
    const bridgeSkills = await findBridgeSkills(supabase, fromJobId, edge.to_id);

    opportunities.push({
      from_job_id: fromJobId,
      to_job_id: edge.to_id,
      skill_overlap_percentage: skillOverlap,
      bridge_skills: bridgeSkills,
      transition_difficulty: edge.difficulty_multiplier || 1.0,
      roi_score: edge.roi_score || 0.5,
      estimated_transition_time: edge.time_cost_hours || 0
    });
  }

  // Sort by combined score (overlap * ROI)
  const sortedOpportunities = opportunities.sort((a, b) => 
    (b.skill_overlap_percentage * b.roi_score) - (a.skill_overlap_percentage * a.roi_score)
  );

  console.log(`🎯 Found ${sortedOpportunities.length} pivot opportunities`);
  return sortedOpportunities;
}

async function findNodeSubstitutions(supabase: any, nodeId: string, userContext: any): Promise<SubstitutionOption[]> {
  console.log(`🔍 Finding substitutions for node: ${nodeId}`);

  // Get the target node
  const { data: targetNode } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (!targetNode) {
    throw new Error(`Node ${nodeId} not found`);
  }

  // Find similar nodes based on substitution group or semantic tags
  let { data: candidates } = await supabase
    .from('career_graph_nodes')
    .select('*')
    .eq('active', true)
    .neq('id', nodeId);

  if (!candidates) candidates = [];

  // Filter candidates based on semantic similarity
  const semanticNode = mapToSemanticNode(targetNode);
  const substitutions: SubstitutionOption[] = [];

  for (const candidate of candidates) {
    const candidateNode = mapToSemanticNode(candidate);
    const similarityScore = calculateSemanticSimilarity(semanticNode, candidateNode);

    if (similarityScore > 0.7) {
      substitutions.push({
        original_node: semanticNode,
        alternatives: [candidateNode],
        substitution_score: similarityScore,
        cost_benefit_ratio: calculateCostBenefit(semanticNode, candidateNode),
        skill_equivalence: calculateSkillEquivalence(semanticNode, candidateNode),
        user_preference_match: calculateUserPreferenceMatch(candidateNode, userContext)
      });
    }
  }

  const sortedSubstitutions = substitutions.sort((a, b) => b.substitution_score - a.substitution_score);
  
  console.log(`🔄 Found ${sortedSubstitutions.length} substitution options`);
  return sortedSubstitutions.slice(0, 5);
}

async function validateGraphIntegrity(supabase: any): Promise<any> {
  console.log('🔍 Validating graph integrity...');

  const [circularDeps, orphanedNodes] = await Promise.all([
    detectCircularDependencies(supabase),
    findOrphanedNodes(supabase)
  ]);

  const totalIssues = circularDeps.length + orphanedNodes.length;
  const validationScore = Math.max(0, 1 - (totalIssues / 100));

  const result = {
    circularDependencies: circularDeps,
    orphanedNodes: orphanedNodes,
    brokenPaths: [], // Placeholder for future implementation
    validationScore,
    totalIssues
  };

  console.log(`✅ Graph validation complete - Score: ${validationScore.toFixed(2)}, Issues: ${totalIssues}`);
  return result;
}

// Helper functions
async function calculateSkillOverlap(supabase: any, jobId1: string, jobId2: string): Promise<number> {
  const [skills1, skills2] = await Promise.all([
    getJobRequiredSkills(supabase, jobId1),
    getJobRequiredSkills(supabase, jobId2)
  ]);

  const intersection = skills1.filter(skill => skills2.includes(skill));
  const union = [...new Set([...skills1, ...skills2])];

  return union.length > 0 ? intersection.length / union.length : 0;
}

async function findBridgeSkills(supabase: any, fromJobId: string, toJobId: string): Promise<string[]> {
  const [fromSkills, toSkills] = await Promise.all([
    getJobRequiredSkills(supabase, fromJobId),
    getJobRequiredSkills(supabase, toJobId)
  ]);

  return toSkills.filter(skill => !fromSkills.includes(skill));
}

async function getJobRequiredSkills(supabase: any, jobId: string): Promise<string[]> {
  const { data: edges } = await supabase
    .from('career_graph_edges')
    .select('to_id')
    .eq('from_id', jobId)
    .eq('edge_type', 'REQUIRES_SKILL');

  return edges?.map((e: any) => e.to_id) || [];
}

function calculatePersonalizationScore(path: any, userContext: any): number {
  let score = 0.5;

  // Time constraint factor
  if (userContext.time_constraint_months) {
    const pathMonths = path.total_time / (40 * 4); // Convert hours to months
    score += pathMonths <= userContext.time_constraint_months ? 0.2 : -0.2;
  }

  // Budget factor
  if (userContext.budget_limit) {
    score += path.total_cost <= userContext.budget_limit ? 0.2 : -0.2;
  }

  // Learning style preference
  const prefs = userContext.learning_style_preferences;
  if (prefs) {
    const courseNodes = path.nodes.filter((n: any) => n.type === 'course').length;
    const projectNodes = path.nodes.filter((n: any) => n.type === 'project').length;
    const certNodes = path.nodes.filter((n: any) => n.type === 'certification').length;

    if (prefs.prefers_courses && courseNodes > 0) score += 0.1;
    if (prefs.prefers_projects && projectNodes > 0) score += 0.1;
    if (prefs.prefers_certifications && certNodes > 0) score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

function calculateTimeFeasibility(path: any, userContext: any): number {
  if (!userContext.time_constraint_months) return 1;

  const pathMonths = path.total_time / (40 * 4);
  return Math.max(0, 1 - Math.abs(pathMonths - userContext.time_constraint_months) / userContext.time_constraint_months);
}

function calculateBudgetFeasibility(path: any, userContext: any): number {
  if (!userContext.budget_limit) return 1;

  return path.total_cost <= userContext.budget_limit ? 1 : userContext.budget_limit / path.total_cost;
}

function calculateLocationRelevance(path: any, userContext: any): number {
  if (!userContext.location) return 1;

  return path.nodes.some((node: any) =>
    node.location_multipliers && node.location_multipliers[userContext.location!] > 1
  ) ? 1.2 : 1.0;
}

function adaptNodeToUser(node: any, userContext: any): any {
  const adapted = { ...node };

  // Apply location multipliers
  if (userContext.location && node.location_multipliers) {
    const multiplier = node.location_multipliers[userContext.location] || 1;
    adapted.market_demand_score = (node.market_demand_score || 0.5) * multiplier;
  }

  // Mark completed if user has this skill
  if (userContext.current_skills?.includes(node.id)) {
    adapted.completion_status = 'completed';
    adapted.estimated_time_hours = 0;
  }

  return adapted;
}

async function findPathSubstitutions(supabase: any, path: any, userContext: any): Promise<SubstitutionOption[]> {
  const substitutions: SubstitutionOption[] = [];

  for (const node of path.nodes) {
    try {
      const nodeSubstitutions = await findNodeSubstitutions(supabase, node.id, userContext);
      substitutions.push(...nodeSubstitutions);
    } catch (error) {
      console.warn(`Failed to find substitutions for node ${node.id}:`, error.message);
    }
  }

  return substitutions;
}

function mapToSemanticNode(dbNode: any): SemanticNode {
  return {
    id: dbNode.id,
    title: dbNode.title,
    type: dbNode.node_type,
    semantic_tags: dbNode.semantic_tags || [],
    skill_cluster: inferSkillCluster(dbNode),
    substitution_group_id: dbNode.substitution_group_id,
    semantic_strength: dbNode.ai_confidence_score || 0.5,
    context_metadata: {
      difficulty_level: dbNode.difficulty_level,
      market_demand_score: dbNode.market_demand_score,
      cost_estimate: dbNode.cost_estimate,
      estimated_time_hours: dbNode.estimated_time_hours,
      prerequisite_ids: dbNode.prerequisite_ids,
      industry_alignment: dbNode.industry_alignment,
      location_multipliers: dbNode.location_multipliers,
    }
  };
}

function inferSkillCluster(node: any): string {
  const title = node.title.toLowerCase();
  if (title.includes('javascript') || title.includes('react') || title.includes('frontend')) {
    return 'frontend_development';
  }
  if (title.includes('python') || title.includes('backend') || title.includes('api')) {
    return 'backend_development';
  }
  if (title.includes('design') || title.includes('ux') || title.includes('ui')) {
    return 'design';
  }
  if (title.includes('data') || title.includes('analytics') || title.includes('sql')) {
    return 'data_science';
  }
  return 'general';
}

function calculateSemanticSimilarity(node1: SemanticNode, node2: SemanticNode): number {
  const tags1 = new Set(node1.semantic_tags);
  const tags2 = new Set(node2.semantic_tags);
  const intersection = new Set([...tags1].filter(tag => tags2.has(tag)));
  const union = new Set([...tags1, ...tags2]);

  const tagSimilarity = union.size > 0 ? intersection.size / union.size : 0;
  const typeSimilarity = node1.type === node2.type ? 1 : 0.5;
  const clusterSimilarity = node1.skill_cluster === node2.skill_cluster ? 1 : 0.3;

  return (tagSimilarity * 0.5 + typeSimilarity * 0.3 + clusterSimilarity * 0.2);
}

function calculateCostBenefit(original: SemanticNode, alternative: SemanticNode): number {
  const originalCost = original.context_metadata.cost_estimate || 0;
  const altCost = alternative.context_metadata.cost_estimate || 0;
  const originalDemand = original.context_metadata.market_demand_score || 0.5;
  const altDemand = alternative.context_metadata.market_demand_score || 0.5;

  if (originalCost === 0) return altDemand - altCost / 1000;
  return (altDemand / Math.max(altCost, 1)) / (originalDemand / Math.max(originalCost, 1));
}

function calculateSkillEquivalence(node1: SemanticNode, node2: SemanticNode): number {
  if (node1.type !== node2.type) return 0.5;
  return calculateSemanticSimilarity(node1, node2);
}

function calculateUserPreferenceMatch(node: SemanticNode, userContext: any): number {
  const prefs = userContext.learning_style_preferences;
  if (!prefs) return 0.5;

  let score = 0.5;
  if (node.type === 'course' && prefs.prefers_courses) score += 0.3;
  if (node.type === 'project' && prefs.prefers_projects) score += 0.3;
  if (node.type === 'certification' && prefs.prefers_certifications) score += 0.3;

  return Math.min(1, score);
}

async function detectCircularDependencies(supabase: any): Promise<string[]> {
  const { data: edges } = await supabase
    .from('career_graph_edges')
    .select('from_id, to_id')
    .in('edge_type', ['requires', 'REQUIRES_SKILL']);

  if (!edges) return [];

  const graph = new Map<string, string[]>();
  edges.forEach((edge: any) => {
    if (!graph.has(edge.from_id)) graph.set(edge.from_id, []);
    graph.get(edge.from_id)!.push(edge.to_id);
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[] = [];

  const dfs = (node: string): boolean => {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cycles.push(`${node}->${neighbor}`);
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        cycles.push(`${node}->${neighbor}`);
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  };

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

async function findOrphanedNodes(supabase: any): Promise<string[]> {
  // Get all node IDs that appear in edges
  const { data: edgeNodes } = await supabase
    .from('career_graph_edges')
    .select('from_id, to_id');

  if (!edgeNodes) return [];

  const connectedNodes = new Set([
    ...edgeNodes.map((e: any) => e.from_id),
    ...edgeNodes.map((e: any) => e.to_id)
  ]);

  // Get all nodes
  const { data: allNodes } = await supabase
    .from('career_graph_nodes')
    .select('id');

  if (!allNodes) return [];

  return allNodes
    .filter((node: any) => !connectedNodes.has(node.id))
    .map((node: any) => node.id);
}