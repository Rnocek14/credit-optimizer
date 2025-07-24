// CORE GRAPH ENGINE: Unified Career Graph Implementation
// This implements the research-specified graph architecture

import { supabase } from "@/integrations/supabase/client";

// Core node types from research
export type NodeType = 'job' | 'skill' | 'step' | 'course' | 'project' | 'certification';

// Core edge types from research
export type EdgeType = 'requires' | 'unlocks' | 'teaches' | 'demonstrates' | 'validates' | 
                      'next_role' | 'pivot' | 'prerequisite' | 'substitution' | 'leads_to' | 'strengthens';

// Graph Node interface - unified for all 7 node types
export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  
  // Metadata
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimated_time_hours?: number;
  cost?: number;
  
  // Type-specific data
  data: JobData | SkillData | StepData | CourseData | ProjectData | CertificationData;
}

// Graph Edge interface - weighted relationships
export interface GraphEdge {
  id: string;
  from_type: NodeType;
  from_id: string;
  to_type: NodeType;
  to_id: string;
  edge_type: EdgeType;
  
  // Weighted properties from research
  importance_weight: number; // 0-10 scale
  time_cost_hours: number;
  monetary_cost: number;
  difficulty_multiplier: number;
  
  // Advanced features
  substitution_group_id?: string; // For OR logic
  pivot_via?: string; // "via MBA", etc.
  success_rate?: number;
  roi_score?: number;
  reasoning?: string;
}

// Type-specific data interfaces
export interface JobData {
  average_salary?: number;
  growth_outlook?: string;
  industry?: string;
  level?: string;
  required_skills: string[];
  preferred_skills: string[];
}

export interface SkillData {
  category: string;
  xp_value?: number;
  difficulty_level?: number;
  market_demand?: number;
}

export interface StepData {
  step_type: string;
  step_order: number;
  career_path_id?: string;
  prerequisites: string[];
}

export interface CourseData {
  platform: string;
  url?: string;
  cost?: number;
  duration?: string;
  skill_tags: string[];
}

export interface ProjectData {
  project_type: 'portfolio' | 'practice' | 'professional' | 'open_source';
  github_url?: string;
  demo_url?: string;
  skills_demonstrated: string[];
  technologies: string[];
}

export interface CertificationData {
  issuer: string;
  cost?: number;
  validity_years?: number;
  exam_url?: string;
  prep_time_hours?: number;
  skills_validated: string[];
  industry_recognition?: 'entry' | 'professional' | 'expert';
}

// Career Path interface
export interface CareerPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_time_hours: number;
  total_cost: number;
  average_difficulty: number;
  roi_score: number;
  success_probability: number;
}

// Pivot Recommendation interface
export interface PivotRecommendation {
  from_job_id: string;
  to_job_id: string;
  pivot_type: 'role_bridge' | 'skill_bridge' | 'education_bridge' | 'certification_bridge';
  pivot_mechanism: string;
  skill_overlap_percentage: number;
  estimated_transition_time: string;
  estimated_cost: number;
  success_rate: number;
  roi_score: number;
  reasoning: string;
  intermediate_roles: string[];
  required_skills: string[];
  recommended_courses: string[];
}

// Career Readiness Index
export interface CRIScore {
  user_id: string;
  target_job_id: string;
  current_score: number;
  required_score: number;
  skill_completion: number;
  step_completion: number;
  project_completion: number;
  certification_completion: number;
  experience_score: number;
  readiness_level: 'beginner' | 'developing' | 'ready' | 'overqualified';
  estimated_time_to_ready: string;
  next_priority_items: string[];
  blocking_factors: string[];
}

// Main Career Graph class
export class CareerGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  private edgesByFrom: Map<string, GraphEdge[]> = new Map();
  private edgesByTo: Map<string, GraphEdge[]> = new Map();

  constructor(nodes: GraphNode[] = [], edges: GraphEdge[] = []) {
    this.loadGraph(nodes, edges);
  }

  // Load graph data
  loadGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    console.log('📊 Loading career graph:', { nodeCount: nodes.length, edgeCount: edges.length });
    
    // Build node map
    this.nodes.clear();
    nodes.forEach(node => {
      this.nodes.set(`${node.type}:${node.id}`, node);
    });

    // Build edge maps for efficient traversal
    this.edges = edges;
    this.edgesByFrom.clear();
    this.edgesByTo.clear();

    edges.forEach(edge => {
      const fromKey = `${edge.from_type}:${edge.from_id}`;
      const toKey = `${edge.to_type}:${edge.to_id}`;

      if (!this.edgesByFrom.has(fromKey)) {
        this.edgesByFrom.set(fromKey, []);
      }
      if (!this.edgesByTo.has(toKey)) {
        this.edgesByTo.set(toKey, []);
      }

      this.edgesByFrom.get(fromKey)!.push(edge);
      this.edgesByTo.get(toKey)!.push(edge);
    });

    console.log('✅ Career graph loaded successfully');
  }

  // Get node by type and ID
  getNode(type: NodeType, id: string): GraphNode | undefined {
    return this.nodes.get(`${type}:${id}`);
  }

  // Get outgoing edges from a node
  getOutgoingEdges(type: NodeType, id: string): GraphEdge[] {
    return this.edgesByFrom.get(`${type}:${id}`) || [];
  }

  // Get incoming edges to a node
  getIncomingEdges(type: NodeType, id: string): GraphEdge[] {
    return this.edgesByTo.get(`${type}:${id}`) || [];
  }

  // Find paths from start to goal with multiple optimization criteria
  findOptimalPaths(
    startType: NodeType, 
    startId: string, 
    goalType: NodeType, 
    goalId: string,
    criteria: 'time' | 'cost' | 'difficulty' | 'roi' = 'time',
    maxPaths: number = 5
  ): CareerPath[] {
    console.log(`🔍 Finding optimal paths from ${startType}:${startId} to ${goalType}:${goalId}`);
    
    const paths: CareerPath[] = [];
    const visited = new Set<string>();
    const currentPath: GraphNode[] = [];
    const currentEdges: GraphEdge[] = [];

    const startNode = this.getNode(startType, startId);
    const goalNode = this.getNode(goalType, goalId);

    if (!startNode || !goalNode) {
      console.warn('❌ Start or goal node not found');
      return [];
    }

    // Depth-first search with path tracking
    const dfs = (currentNode: GraphNode, depth: number) => {
      if (depth > 10 || paths.length >= maxPaths) return; // Prevent infinite loops

      const nodeKey = `${currentNode.type}:${currentNode.id}`;
      
      if (visited.has(nodeKey)) return;
      visited.add(nodeKey);
      currentPath.push(currentNode);

      // Check if we reached the goal
      if (currentNode.type === goalType && currentNode.id === goalId) {
        const path = this.buildCareerPath([...currentPath], [...currentEdges]);
        paths.push(path);
        currentPath.pop();
        visited.delete(nodeKey);
        return;
      }

      // Explore outgoing edges
      const outgoingEdges = this.getOutgoingEdges(currentNode.type, currentNode.id);
      
      // Sort edges by optimization criteria
      const sortedEdges = this.sortEdgesByCriteria(outgoingEdges, criteria);

      for (const edge of sortedEdges) {
        const nextNode = this.getNode(edge.to_type, edge.to_id);
        if (nextNode) {
          currentEdges.push(edge);
          dfs(nextNode, depth + 1);
          currentEdges.pop();
        }
      }

      currentPath.pop();
      visited.delete(nodeKey);
    };

    dfs(startNode, 0);

    // Sort final paths by criteria
    return this.sortPathsByCriteria(paths, criteria);
  }

  // Sort edges by optimization criteria
  private sortEdgesByCriteria(edges: GraphEdge[], criteria: string): GraphEdge[] {
    return [...edges].sort((a, b) => {
      switch (criteria) {
        case 'time':
          return a.time_cost_hours - b.time_cost_hours;
        case 'cost':
          return a.monetary_cost - b.monetary_cost;
        case 'difficulty':
          return a.difficulty_multiplier - b.difficulty_multiplier;
        case 'roi':
          return (b.roi_score || 0) - (a.roi_score || 0);
        default:
          return b.importance_weight - a.importance_weight;
      }
    });
  }

  // Sort paths by optimization criteria
  private sortPathsByCriteria(paths: CareerPath[], criteria: string): CareerPath[] {
    return [...paths].sort((a, b) => {
      switch (criteria) {
        case 'time':
          return a.total_time_hours - b.total_time_hours;
        case 'cost':
          return a.total_cost - b.total_cost;
        case 'difficulty':
          return a.average_difficulty - b.average_difficulty;
        case 'roi':
          return b.roi_score - a.roi_score;
        default:
          return b.success_probability - a.success_probability;
      }
    });
  }

  // Build career path object with calculated metrics
  private buildCareerPath(nodes: GraphNode[], edges: GraphEdge[]): CareerPath {
    const totalTime = edges.reduce((sum, edge) => sum + edge.time_cost_hours, 0);
    const totalCost = edges.reduce((sum, edge) => sum + edge.monetary_cost, 0);
    const avgDifficulty = edges.length > 0 
      ? edges.reduce((sum, edge) => sum + edge.difficulty_multiplier, 0) / edges.length 
      : 1;
    const avgROI = edges.length > 0
      ? edges.reduce((sum, edge) => sum + (edge.roi_score || 0), 0) / edges.length
      : 0;
    const avgSuccess = edges.length > 0
      ? edges.reduce((sum, edge) => sum + (edge.success_rate || 50), 0) / edges.length
      : 50;

    return {
      nodes,
      edges,
      total_time_hours: totalTime,
      total_cost: totalCost,
      average_difficulty: avgDifficulty,
      roi_score: avgROI,
      success_probability: avgSuccess
    };
  }

  // Find pivot opportunities between two careers
  findPivotOpportunities(fromJobId: string, toJobId: string): Promise<PivotRecommendation[]> {
    console.log(`🔄 Finding pivot opportunities from ${fromJobId} to ${toJobId}`);
    
    // This would typically call the database function for pivot analysis
    return supabase.functions.invoke('find-pivot-opportunities', {
      body: { from_job_id: fromJobId, to_job_id: toJobId }
    }).then(({ data, error }) => {
      if (error) throw error;
      return data.pivots || [];
    });
  }

  // Calculate Career Readiness Index for a user
  async calculateCRI(userId: string, targetJobId: string): Promise<CRIScore> {
    console.log(`📊 Calculating CRI for user ${userId}, target job ${targetJobId}`);
    
    const { data, error } = await supabase.functions.invoke('calculate-cri', {
      body: { user_id: userId, target_job_id: targetJobId }
    });

    if (error) throw error;
    return data.cri_score;
  }

  // Validate graph integrity
  validateGraph(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for cycles in prerequisite chains
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeKey: string): boolean => {
      if (recursionStack.has(nodeKey)) {
        errors.push(`Cycle detected involving node: ${nodeKey}`);
        return true;
      }
      if (visited.has(nodeKey)) return false;

      visited.add(nodeKey);
      recursionStack.add(nodeKey);

      const [type, id] = nodeKey.split(':') as [NodeType, string];
      const prerequisites = this.getIncomingEdges(type, id)
        .filter(edge => edge.edge_type === 'prerequisite');

      for (const prereq of prerequisites) {
        const prereqKey = `${prereq.from_type}:${prereq.from_id}`;
        if (hasCycle(prereqKey)) return true;
      }

      recursionStack.delete(nodeKey);
      return false;
    };

    // Check all nodes for cycles
    for (const nodeKey of this.nodes.keys()) {
      if (!visited.has(nodeKey)) {
        hasCycle(nodeKey);
      }
    }

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    this.edges.forEach(edge => {
      connectedNodes.add(`${edge.from_type}:${edge.from_id}`);
      connectedNodes.add(`${edge.to_type}:${edge.to_id}`);
    });

    for (const nodeKey of this.nodes.keys()) {
      if (!connectedNodes.has(nodeKey)) {
        errors.push(`Orphaned node detected: ${nodeKey}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get graph statistics
  getStatistics() {
    const nodesByType = new Map<NodeType, number>();
    const edgesByType = new Map<EdgeType, number>();

    for (const node of this.nodes.values()) {
      nodesByType.set(node.type, (nodesByType.get(node.type) || 0) + 1);
    }

    for (const edge of this.edges) {
      edgesByType.set(edge.edge_type, (edgesByType.get(edge.edge_type) || 0) + 1);
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodesByType: Object.fromEntries(nodesByType),
      edgesByType: Object.fromEntries(edgesByType),
      averageConnections: this.edges.length / this.nodes.size
    };
  }
}

// Factory function to create graph from database
export async function createCareerGraphFromDatabase(careerPathId?: string): Promise<CareerGraph> {
  console.log('🏗️ Creating career graph from database');
  
  // Fetch all node types
  const [
    { data: jobs }, 
    { data: skills }, 
    { data: steps }, 
    { data: courses },
    { data: projects },
    { data: certifications },
    { data: edges }
  ] = await Promise.all([
    supabase.from('career_paths').select('*'),
    supabase.from('skills').select('*'),
    supabase.from('career_steps').select('*').eq('career_path_id', careerPathId),
    supabase.from('recommended_courses').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('certifications').select('*'),
    supabase.from('career_graph_edges').select('*')
  ]);

  // Convert to unified node format
  const nodes: GraphNode[] = [
    ...(jobs || []).map(job => ({
      id: job.id,
      type: 'job' as NodeType,
      title: job.title,
      description: job.summary,
      difficulty: job.level?.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
      cost: 0,
      data: {
        average_salary: job.average_salary,
        growth_outlook: job.growth_outlook,
        industry: job.industry,
        level: job.level,
        required_skills: job.required_skill_ids || [],
        preferred_skills: job.optional_skill_ids || []
      } as JobData
    })),
    ...(skills || []).map(skill => ({
      id: skill.id,
      type: 'skill' as NodeType,
      title: skill.name,
      description: skill.description,
      difficulty: (skill.difficulty_level === 1 ? 'beginner' : skill.difficulty_level === 2 ? 'intermediate' : 'advanced') as 'beginner' | 'intermediate' | 'advanced',
      data: {
        category: skill.category,
        xp_value: skill.xp_value,
        difficulty_level: skill.difficulty_level
      } as SkillData
    })),
    ...(steps || []).map(step => ({
      id: step.id,
      type: 'step' as NodeType,
      title: step.title,
      description: step.description,
      estimated_time_hours: parseTimeToHours(step.estimated_time),
      cost: parseCostToNumber(step.estimated_cost),
      data: {
        step_type: step.step_type,
        step_order: step.step_order,
        career_path_id: step.career_path_id,
        prerequisites: step.prerequisites || []
      } as StepData
    })),
    ...(courses || []).map(course => ({
      id: course.id,
      type: 'course' as NodeType,
      title: course.title,
      description: course.description,
      cost: parseCostToNumber(course.cost),
      data: {
        platform: course.platform,
        url: course.url,
        cost: parseCostToNumber(course.cost),
        skill_tags: course.skill_tags || []
      } as CourseData
    })),
    ...(projects || []).map(project => ({
      id: project.id,
      type: 'project' as NodeType,
      title: project.title,
      description: project.description,
      difficulty: project.difficulty as 'beginner' | 'intermediate' | 'advanced',
      estimated_time_hours: project.estimated_time_hours,
      data: {
        project_type: project.project_type,
        github_url: project.github_url,
        demo_url: project.demo_url,
        skills_demonstrated: project.skills_demonstrated || [],
        technologies: project.technologies || []
      } as ProjectData
    })),
    ...(certifications || []).map(cert => ({
      id: cert.id,
      type: 'certification' as NodeType,
      title: cert.title,
      description: cert.description,
      difficulty: cert.difficulty as 'beginner' | 'intermediate' | 'advanced',
      cost: cert.cost,
      estimated_time_hours: cert.prep_time_hours,
      data: {
        issuer: cert.issuer,
        cost: cert.cost,
        validity_years: cert.validity_years,
        exam_url: cert.exam_url,
        prep_time_hours: cert.prep_time_hours,
        skills_validated: cert.skills_validated || [],
        industry_recognition: cert.industry_recognition
      } as CertificationData
    }))
  ];

  // Convert edges
  const graphEdges: GraphEdge[] = (edges || []).map(edge => ({
    id: edge.id,
    from_type: edge.from_type as NodeType,
    from_id: edge.from_id,
    to_type: edge.to_type as NodeType,
    to_id: edge.to_id,
    edge_type: edge.edge_type as EdgeType,
    importance_weight: edge.importance_weight || 1,
    time_cost_hours: edge.time_cost_hours || 0,
    monetary_cost: edge.monetary_cost || 0,
    difficulty_multiplier: edge.difficulty_multiplier || 1,
    substitution_group_id: edge.substitution_group_id,
    pivot_via: edge.pivot_via,
    success_rate: edge.success_rate,
    roi_score: edge.roi_score,
    reasoning: edge.reasoning
  }));

  return new CareerGraph(nodes, graphEdges);
}

// Utility functions
function parseTimeToHours(timeString?: string): number {
  if (!timeString) return 0;
  const months = timeString.match(/(\d+)\s*month/i);
  const weeks = timeString.match(/(\d+)\s*week/i);
  const hours = timeString.match(/(\d+)\s*hour/i);
  
  return (months ? parseInt(months[1]) * 160 : 0) + 
         (weeks ? parseInt(weeks[1]) * 40 : 0) + 
         (hours ? parseInt(hours[1]) : 0);
}

function parseCostToNumber(costString?: string): number {
  if (!costString) return 0;
  const match = costString.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : 0;
}