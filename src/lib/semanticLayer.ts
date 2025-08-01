import { supabase } from '@/integrations/supabase/client';

// Semantic layer interfaces
export interface SemanticNode {
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

export interface SubstitutionOption {
  original_node: SemanticNode;
  alternatives: SemanticNode[];
  substitution_score: number;
  cost_benefit_ratio: number;
  skill_equivalence: number;
  user_preference_match?: number;
}

export interface PivotOpportunity {
  from_job_id: string;
  to_job_id: string;
  skill_overlap_percentage: number;
  bridge_skills: string[];
  transition_difficulty: number;
  roi_score: number;
  estimated_transition_time: number;
}

export interface UserContext {
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
  current_job_id?: string;
  target_salary_range?: [number, number];
}

export class SemanticCareerEngine {
  
  /**
   * Phase 2A: Advanced Semantic Layer Implementation
   */
  static async buildSemanticGraph(): Promise<SemanticNode[]> {
    const { data: nodes } = await supabase
      .from('career_graph_nodes')
      .select('*')
      .eq('active', true);
    
    if (!nodes) return [];
    
    return nodes.map(node => ({
      id: node.id,
      title: node.title,
      type: node.node_type,
      semantic_tags: node.semantic_tags || [],
      skill_cluster: this.inferSkillCluster(node),
      substitution_group_id: node.substitution_group_id,
      semantic_strength: node.ai_confidence_score || 0.5,
      context_metadata: {
        difficulty_level: node.difficulty_level,
        market_demand_score: node.market_demand_score,
        cost_estimate: node.cost_estimate,
        estimated_time_hours: node.estimated_time_hours,
        prerequisite_ids: node.prerequisite_ids,
        industry_alignment: node.industry_alignment,
        location_multipliers: node.location_multipliers,
      }
    }));
  }

  /**
   * Smart Substitution Engine
   */
  static async findSubstitutions(
    nodeId: string, 
    userContext: UserContext = {}
  ): Promise<SubstitutionOption[]> {
    const semanticNodes = await this.buildSemanticGraph();
    const targetNode = semanticNodes.find(n => n.id === nodeId);
    
    if (!targetNode) return [];
    
    // Find nodes in the same substitution group or with similar semantic tags
    const alternatives = semanticNodes.filter(node => 
      node.id !== nodeId && (
        node.substitution_group_id === targetNode.substitution_group_id ||
        this.calculateSemanticSimilarity(targetNode, node) > 0.7
      )
    );
    
    const substitutionOptions: SubstitutionOption[] = alternatives.map(alt => ({
      original_node: targetNode,
      alternatives: [alt],
      substitution_score: this.calculateSubstitutionScore(targetNode, alt),
      cost_benefit_ratio: this.calculateCostBenefit(targetNode, alt),
      skill_equivalence: this.calculateSkillEquivalence(targetNode, alt),
      user_preference_match: this.calculateUserPreferenceMatch(alt, userContext)
    }));
    
    return substitutionOptions.sort((a, b) => b.substitution_score - a.substitution_score);
  }

  /**
   * Phase 2B: Advanced Pivot Intelligence
   */
  static async findPivotOpportunities(
    fromJobId: string,
    userContext: UserContext = {}
  ): Promise<PivotOpportunity[]> {
    // Get all PIVOT_TO edges from the current job
    const { data: pivotEdges } = await supabase
      .from('career_graph_edges')
      .select(`
        *,
        from_node:career_graph_nodes!from_id(*),
        to_node:career_graph_nodes!to_id(*)
      `)
      .eq('from_id', fromJobId)
      .eq('edge_type', 'PIVOT_TO');
    
    if (!pivotEdges) return [];
    
    const opportunities: PivotOpportunity[] = [];
    
    for (const edge of pivotEdges) {
      const skillOverlap = await this.calculateSkillOverlap(fromJobId, edge.to_id);
      const bridgeSkills = await this.findBridgeSkills(fromJobId, edge.to_id);
      
      opportunities.push({
        from_job_id: fromJobId,
        to_job_id: edge.to_id,
        skill_overlap_percentage: skillOverlap,
        bridge_skills: bridgeSkills,
        transition_difficulty: this.calculateTransitionDifficulty(edge),
        roi_score: edge.roi_score || 0.5,
        estimated_transition_time: edge.time_cost_hours || 0
      });
    }
    
    return opportunities.sort((a, b) => 
      (b.skill_overlap_percentage * b.roi_score) - (a.skill_overlap_percentage * a.roi_score)
    );
  }

  /**
   * Calculate skill overlap between two jobs
   */
  static async calculateSkillOverlap(jobId1: string, jobId2: string): Promise<number> {
    const [skills1, skills2] = await Promise.all([
      this.getJobRequiredSkills(jobId1),
      this.getJobRequiredSkills(jobId2)
    ]);
    
    const intersection = skills1.filter(skill => skills2.includes(skill));
    const union = [...new Set([...skills1, ...skills2])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * Find bridge skills that enable pivots
   */
  static async findBridgeSkills(fromJobId: string, toJobId: string): Promise<string[]> {
    const [fromSkills, toSkills] = await Promise.all([
      this.getJobRequiredSkills(fromJobId),
      this.getJobRequiredSkills(toJobId)
    ]);
    
    return toSkills.filter(skill => !fromSkills.includes(skill));
  }

  /**
   * Phase 2C: Enhanced User Context Integration
   */
  static async personalizeRecommendations(
    learningPaths: any[],
    userContext: UserContext
  ): Promise<any[]> {
    return learningPaths.map(path => ({
      ...path,
      personalization_score: this.calculatePersonalizationScore(path, userContext),
      time_feasibility: this.calculateTimeFeasibility(path, userContext),
      budget_feasibility: this.calculateBudgetFeasibility(path, userContext),
      location_relevance: this.calculateLocationRelevance(path, userContext),
      adapted_nodes: path.nodes.map((node: any) => 
        this.adaptNodeToUser(node, userContext)
      )
    }))
    .sort((a, b) => b.personalization_score - a.personalization_score);
  }

  /**
   * Phase 2D: Validation & Quality Assurance
   */
  static async validateGraphIntegrity(): Promise<{
    circularDependencies: string[];
    orphanedNodes: string[];
    brokenPaths: string[];
    validationScore: number;
  }> {
    const circularDeps = await this.detectCircularDependencies();
    const orphanedNodes = await this.findOrphanedNodes();
    const brokenPaths = await this.validatePathFeasibility();
    
    const totalIssues = circularDeps.length + orphanedNodes.length + brokenPaths.length;
    const validationScore = Math.max(0, 1 - (totalIssues / 100)); // Normalize to 0-1
    
    return {
      circularDependencies: circularDeps,
      orphanedNodes,
      brokenPaths,
      validationScore
    };
  }

  // Helper methods
  private static inferSkillCluster(node: any): string {
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

  private static calculateSemanticSimilarity(node1: SemanticNode, node2: SemanticNode): number {
    const tags1 = new Set(node1.semantic_tags);
    const tags2 = new Set(node2.semantic_tags);
    const intersection = new Set([...tags1].filter(tag => tags2.has(tag)));
    const union = new Set([...tags1, ...tags2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private static calculateSubstitutionScore(original: SemanticNode, alternative: SemanticNode): number {
    const semanticSim = this.calculateSemanticSimilarity(original, alternative);
    const typeSim = original.type === alternative.type ? 1 : 0.5;
    const difficultySim = 1 - Math.abs(
      (original.context_metadata.difficulty_level || 1) - 
      (alternative.context_metadata.difficulty_level || 1)
    ) / 5;
    
    return (semanticSim * 0.5 + typeSim * 0.3 + difficultySim * 0.2);
  }

  private static calculateCostBenefit(original: SemanticNode, alternative: SemanticNode): number {
    const originalCost = original.context_metadata.cost_estimate || 0;
    const altCost = alternative.context_metadata.cost_estimate || 0;
    const originalDemand = original.context_metadata.market_demand_score || 0.5;
    const altDemand = alternative.context_metadata.market_demand_score || 0.5;
    
    if (originalCost === 0) return altDemand - altCost / 1000;
    return (altDemand / Math.max(altCost, 1)) / (originalDemand / Math.max(originalCost, 1));
  }

  private static calculateSkillEquivalence(node1: SemanticNode, node2: SemanticNode): number {
    if (node1.type !== node2.type) return 0.5;
    return this.calculateSemanticSimilarity(node1, node2);
  }

  private static calculateUserPreferenceMatch(node: SemanticNode, userContext: UserContext): number {
    const prefs = userContext.learning_style_preferences;
    if (!prefs) return 0.5;
    
    let score = 0.5;
    if (node.type === 'course' && prefs.prefers_courses) score += 0.3;
    if (node.type === 'project' && prefs.prefers_projects) score += 0.3;
    if (node.type === 'certification' && prefs.prefers_certifications) score += 0.3;
    
    return Math.min(1, score);
  }

  private static async getJobRequiredSkills(jobId: string): Promise<string[]> {
    const { data: edges } = await supabase
      .from('career_graph_edges')
      .select('to_id')
      .eq('from_id', jobId)
      .eq('edge_type', 'REQUIRES_SKILL');
    
    return edges?.map(e => e.to_id) || [];
  }

  private static calculateTransitionDifficulty(edge: any): number {
    return edge.difficulty_multiplier || 1.0;
  }

  private static calculatePersonalizationScore(path: any, userContext: UserContext): number {
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

  private static calculateTimeFeasibility(path: any, userContext: UserContext): number {
    if (!userContext.time_constraint_months) return 1;
    
    const pathMonths = path.total_time / (40 * 4);
    return Math.max(0, 1 - Math.abs(pathMonths - userContext.time_constraint_months) / userContext.time_constraint_months);
  }

  private static calculateBudgetFeasibility(path: any, userContext: UserContext): number {
    if (!userContext.budget_limit) return 1;
    
    return path.total_cost <= userContext.budget_limit ? 1 : userContext.budget_limit / path.total_cost;
  }

  private static calculateLocationRelevance(path: any, userContext: UserContext): number {
    if (!userContext.location) return 1;
    
    // Check if path nodes have location-specific relevance
    return path.nodes.some((node: any) => 
      node.location_multipliers && node.location_multipliers[userContext.location!] > 1
    ) ? 1.2 : 1.0;
  }

  private static adaptNodeToUser(node: any, userContext: UserContext): any {
    const adapted = { ...node };
    
    // Apply location multipliers
    if (userContext.location && node.location_multipliers) {
      const multiplier = node.location_multipliers[userContext.location] || 1;
      adapted.market_demand_score = (node.market_demand_score || 0.5) * multiplier;
    }
    
    // Adjust based on user's existing skills
    if (userContext.current_skills?.includes(node.id)) {
      adapted.completion_status = 'completed';
      adapted.estimated_time_hours = 0;
    }
    
    return adapted;
  }

  private static async detectCircularDependencies(): Promise<string[]> {
    // Simplified circular dependency detection
    const { data: edges } = await supabase
      .from('career_graph_edges')
      .select('from_id, to_id')
      .in('edge_type', ['requires', 'REQUIRES_SKILL']);
    
    if (!edges) return [];
    
    const graph = new Map<string, string[]>();
    edges.forEach(edge => {
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

  private static async findOrphanedNodes(): Promise<string[]> {
    // Get all node IDs that appear in edges
    const { data: edgeNodes } = await supabase
      .from('career_graph_edges')
      .select('from_id, to_id');
    
    if (!edgeNodes) return [];
    
    const connectedNodes = new Set([
      ...edgeNodes.map(e => e.from_id),
      ...edgeNodes.map(e => e.to_id)
    ]);
    
    // Get all nodes
    const { data: allNodes } = await supabase
      .from('career_graph_nodes')
      .select('id');
    
    if (!allNodes) return [];
    
    return allNodes
      .filter(node => !connectedNodes.has(node.id))
      .map(node => node.id);
  }

  private static async validatePathFeasibility(): Promise<string[]> {
    // Check for paths that have impossible requirements
    // This is a simplified implementation
    return []; // Placeholder
  }
}