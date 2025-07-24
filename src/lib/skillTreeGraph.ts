/**
 * Graph traversal and pathfinding logic for the skill tree
 * Implements the algorithms described in the research for finding optimal career paths
 */

import { supabase } from '@/integrations/supabase/client';

export interface GraphNode {
  id: string;
  type: 'job' | 'skill' | 'step' | 'course' | 'project' | 'certification';
  title: string;
  description?: string;
  level?: number;
  category?: string;
  prerequisites: string[];
  weight?: number;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'requires' | 'unlocks' | 'next_role' | 'pivot' | 'teaches' | 'demonstrates';
  weight: number;
  importance?: number;
  via?: string; // For pivot edges
}

export interface CareerPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
  estimatedTime: string;
  estimatedCost: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface PivotRecommendation {
  intermediateRole: string;
  sharedSkills: string[];
  newSkills: string[];
  roiScore: number;
  estimatedTime: string;
  reasoning: string;
}

/**
 * Build a comprehensive graph from the database
 */
export const buildCareerGraph = async (): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> => {
  try {
    const [
      jobsResult,
      skillsResult,
      stepsResult,
      coursesResult,
      stepSkillsResult,
      careerStepsResult
    ] = await Promise.all([
      // Get all career paths (treating them as jobs)
      supabase.from('career_paths').select('*'),
      
      // Get all skills
      supabase.from('skills').select('*'),
      
      // Get all career steps
      supabase.from('career_steps').select('*'),
      
      // Get all courses
      supabase.from('recommended_courses').select('*').eq('active', true),
      
      // Get step-skill mappings
      supabase.from('career_step_skills').select('*'),
      
      // Get career step levels (with prerequisites)
      supabase.rpc('calculate_career_step_levels', { career_path_id_param: null })
    ]);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add job nodes (career paths)
    jobsResult.data?.forEach(job => {
      nodes.push({
        id: job.id,
        type: 'job',
        title: job.title,
        description: job.summary,
        prerequisites: [],
        weight: 1,
        metadata: {
          salary: job.average_salary,
          industry: job.industry,
          level: job.level,
          roiScore: job.roi_score
        }
      });
    });

    // Add skill nodes
    skillsResult.data?.forEach(skill => {
      nodes.push({
        id: skill.id,
        type: 'skill',
        title: skill.name,
        description: skill.description,
        category: skill.category,
        prerequisites: [],
        weight: skill.difficulty_level || 1,
        metadata: {
          xpValue: skill.xp_value,
          difficultyLevel: skill.difficulty_level
        }
      });
    });

    // Add step nodes
    stepsResult.data?.forEach(step => {
      nodes.push({
        id: step.id,
        type: 'step',
        title: step.title,
        description: step.description,
        level: step.step_order,
        prerequisites: step.prerequisites || [],
        weight: 1,
        metadata: {
          isTerminal: step.is_terminal,
          estimatedTime: step.estimated_time,
          estimatedCost: step.estimated_cost,
          careerPathId: step.career_path_id
        }
      });
    });

    // Add course nodes
    coursesResult.data?.forEach(course => {
      nodes.push({
        id: course.id,
        type: 'course',
        title: course.title,
        description: course.description,
        prerequisites: [],
        weight: parseFloat(course.cost) || 1,
        metadata: {
          platform: course.platform,
          difficulty: course.difficulty,
          cost: course.cost,
          skillTags: course.skill_tags
        }
      });
    });

    // Add step-skill edges
    stepSkillsResult.data?.forEach(mapping => {
      edges.push({
        id: `step-skill-${mapping.id}`,
        source: mapping.step_id,
        target: mapping.skill_id,
        type: 'requires',
        weight: 1,
        importance: mapping.importance_score
      });
    });

    // Add prerequisite edges for steps
    stepsResult.data?.forEach(step => {
      step.prerequisites?.forEach((prereqId: string) => {
        edges.push({
          id: `prereq-${prereqId}-${step.id}`,
          source: prereqId,
          target: step.id,
          type: 'unlocks',
          weight: 1
        });
      });
    });

    // Add job-step relationships (steps unlock jobs)
    stepsResult.data?.forEach(step => {
      if (step.career_path_id && step.is_terminal) {
        edges.push({
          id: `step-job-${step.id}-${step.career_path_id}`,
          source: step.id,
          target: step.career_path_id,
          type: 'unlocks',
          weight: 1
        });
      }
    });

    return { nodes, edges };
  } catch (error) {
    console.error('Error building career graph:', error);
    return { nodes: [], edges: [] };
  }
};

/**
 * Find all paths from a starting point to a target using breadth-first search
 */
export const findCareerPaths = (
  graph: { nodes: GraphNode[], edges: GraphEdge[] },
  startNodeId: string,
  targetNodeId: string,
  maxDepth: number = 10
): CareerPath[] => {
  const { nodes, edges } = graph;
  const paths: CareerPath[] = [];
  
  // Build adjacency list
  const adjacencyList = new Map<string, GraphEdge[]>();
  edges.forEach(edge => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge);
  });

  // BFS to find paths
  const queue: { nodeId: string, path: string[], weight: number, depth: number }[] = [
    { nodeId: startNodeId, path: [startNodeId], weight: 0, depth: 0 }
  ];
  
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.depth > maxDepth) continue;
    
    if (current.nodeId === targetNodeId) {
      // Found a path, construct the CareerPath object
      const pathNodes = current.path.map(nodeId => 
        nodes.find(n => n.id === nodeId)!
      ).filter(Boolean);
      
      const pathEdges = [];
      for (let i = 0; i < current.path.length - 1; i++) {
        const edge = edges.find(e => 
          e.source === current.path[i] && e.target === current.path[i + 1]
        );
        if (edge) pathEdges.push(edge);
      }

      paths.push({
        nodes: pathNodes,
        edges: pathEdges,
        totalWeight: current.weight,
        estimatedTime: estimatePathTime(pathNodes),
        estimatedCost: estimatePathCost(pathNodes),
        difficulty: estimatePathDifficulty(pathNodes)
      });
      continue;
    }

    const pathKey = current.path.join('-');
    if (visited.has(pathKey)) continue;
    visited.add(pathKey);

    // Explore neighbors
    const neighbors = adjacencyList.get(current.nodeId) || [];
    neighbors.forEach(edge => {
      if (!current.path.includes(edge.target)) {
        queue.push({
          nodeId: edge.target,
          path: [...current.path, edge.target],
          weight: current.weight + edge.weight,
          depth: current.depth + 1
        });
      }
    });
  }

  // Sort paths by weight (lower is better)
  return paths.sort((a, b) => a.totalWeight - b.totalWeight);
};

/**
 * Find pivot recommendations between two career paths
 */
export const findPivotRecommendations = async (
  currentJobId: string,
  targetJobId: string
): Promise<PivotRecommendation[]> => {
  try {
    // Use the existing pivot recommendation edge function
    const { data, error } = await supabase.functions.invoke('recommend-pivot-paths', {
      body: {
        current_career: currentJobId,
        target_career: targetJobId,
        user_skills: [], // This would come from user's actual skills
        preferred_locations: []
      }
    });

    if (error) throw error;

    return data.pivots || [];
  } catch (error) {
    console.error('Error finding pivot recommendations:', error);
    return [];
  }
};

/**
 * Calculate skill overlap between two jobs
 */
export const calculateSkillOverlap = async (
  jobId1: string,
  jobId2: string
): Promise<{ shared: string[], unique1: string[], unique2: string[], overlapPercentage: number }> => {
  try {
    const [job1Skills, job2Skills] = await Promise.all([
      supabase.from('career_paths').select('required_skill_ids').eq('id', jobId1).single(),
      supabase.from('career_paths').select('required_skill_ids').eq('id', jobId2).single()
    ]);

    const skills1 = new Set(job1Skills.data?.required_skill_ids || []);
    const skills2 = new Set(job2Skills.data?.required_skill_ids || []);

    const shared = Array.from(skills1).filter(skill => skills2.has(skill));
    const unique1 = Array.from(skills1).filter(skill => !skills2.has(skill));
    const unique2 = Array.from(skills2).filter(skill => !skills1.has(skill));

    const totalUnique = skills1.size + skills2.size - shared.length;
    const overlapPercentage = totalUnique > 0 ? (shared.length * 2) / totalUnique * 100 : 0;

    return {
      shared,
      unique1,
      unique2,
      overlapPercentage
    };
  } catch (error) {
    console.error('Error calculating skill overlap:', error);
    return { shared: [], unique1: [], unique2: [], overlapPercentage: 0 };
  }
};

// Helper functions
const estimatePathTime = (nodes: GraphNode[]): string => {
  let totalMonths = 0;
  
  nodes.forEach(node => {
    if (node.metadata?.estimatedTime) {
      // Parse estimated time (e.g., "3 months", "1 year")
      const timeStr = node.metadata.estimatedTime.toLowerCase();
      if (timeStr.includes('month')) {
        totalMonths += parseInt(timeStr) || 1;
      } else if (timeStr.includes('year')) {
        totalMonths += (parseInt(timeStr) || 1) * 12;
      } else if (timeStr.includes('week')) {
        totalMonths += (parseInt(timeStr) || 1) / 4;
      }
    } else {
      // Default estimates by node type
      switch (node.type) {
        case 'skill': totalMonths += 1; break;
        case 'course': totalMonths += 0.5; break;
        case 'project': totalMonths += 2; break;
        case 'step': totalMonths += 3; break;
        default: totalMonths += 1;
      }
    }
  });

  if (totalMonths < 12) {
    return `${Math.round(totalMonths)} months`;
  } else {
    return `${Math.round(totalMonths / 12 * 10) / 10} years`;
  }
};

const estimatePathCost = (nodes: GraphNode[]): string => {
  let totalCost = 0;
  
  nodes.forEach(node => {
    if (node.type === 'course' && node.metadata?.cost) {
      totalCost += parseFloat(node.metadata.cost) || 0;
    }
  });

  if (totalCost === 0) return 'Free';
  return `$${totalCost.toLocaleString()}`;
};

const estimatePathDifficulty = (nodes: GraphNode[]): 'beginner' | 'intermediate' | 'advanced' => {
  const avgWeight = nodes.reduce((sum, node) => sum + (node.weight || 1), 0) / nodes.length;
  
  if (avgWeight <= 1.5) return 'beginner';
  if (avgWeight <= 2.5) return 'intermediate';
  return 'advanced';
};