/**
 * Skill Tree Data Validation and Integrity Checking
 * Prevents crashes from broken edges, orphan nodes, and circular dependencies
 */

export interface SkillTreeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  orphanNodes: string[];
  brokenEdges: Array<{ prerequisite_skill_id: string; skill_id: string }>;
  circularDependencies: string[][];
  disconnectedClusters: string[][];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface SkillEdge {
  prerequisite_skill_id: string;
  skill_id: string;
}

/**
 * Comprehensive skill tree validation
 */
export function validateSkillTree(
  skills: Skill[], 
  edges: SkillEdge[]
): SkillTreeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const orphanNodes: string[] = [];
  const brokenEdges: SkillEdge[] = [];
  
  // Create skill ID lookup for fast validation
  const skillIds = new Set(skills.map(s => s.id));
  
  // 1. Check for broken edges (references to non-existent skills)
  edges.forEach(edge => {
    if (!skillIds.has(edge.prerequisite_skill_id)) {
      brokenEdges.push(edge);
      errors.push(`Edge references non-existent prerequisite skill: ${edge.prerequisite_skill_id}`);
    }
    if (!skillIds.has(edge.skill_id)) {
      brokenEdges.push(edge);
      errors.push(`Edge references non-existent skill: ${edge.skill_id}`);
    }
  });
  
  // 2. Find orphan nodes (skills with no connections)
  const connectedSkills = new Set([
    ...edges.map(e => e.skill_id),
    ...edges.map(e => e.prerequisite_skill_id)
  ]);
  
  skills.forEach(skill => {
    if (!connectedSkills.has(skill.id)) {
      orphanNodes.push(skill.id);
      warnings.push(`Orphan skill found: ${skill.name} (${skill.id})`);
    }
  });
  
  // 3. Detect circular dependencies using DFS
  const circularDependencies = detectCircularDependencies(skills, edges);
  circularDependencies.forEach(cycle => {
    errors.push(`Circular dependency detected: ${cycle.join(' → ')}`);
  });
  
  // 4. Find disconnected clusters
  const disconnectedClusters = findDisconnectedClusters(skills, edges);
  if (disconnectedClusters.length > 1) {
    warnings.push(`Found ${disconnectedClusters.length} disconnected skill clusters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    orphanNodes,
    brokenEdges,
    circularDependencies,
    disconnectedClusters
  };
}

/**
 * Detect circular dependencies using DFS with cycle detection
 */
function detectCircularDependencies(skills: Skill[], edges: SkillEdge[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const pathStack: string[] = [];
  
  // Build adjacency list for prerequisites -> dependents
  const graph = new Map<string, string[]>();
  skills.forEach(skill => {
    graph.set(skill.id, []);
  });
  
  edges.forEach(edge => {
    const dependents = graph.get(edge.prerequisite_skill_id) || [];
    dependents.push(edge.skill_id);
    graph.set(edge.prerequisite_skill_id, dependents);
  });
  
  // DFS with cycle detection
  function dfs(skillId: string): boolean {
    if (recursionStack.has(skillId)) {
      // Found a cycle - extract the cycle path
      const cycleStart = pathStack.indexOf(skillId);
      const cycle = pathStack.slice(cycleStart).concat(skillId);
      cycles.push(cycle);
      return true;
    }
    
    if (visited.has(skillId)) {
      return false;
    }
    
    visited.add(skillId);
    recursionStack.add(skillId);
    pathStack.push(skillId);
    
    const dependents = graph.get(skillId) || [];
    for (const dependent of dependents) {
      if (dfs(dependent)) {
        // Continue to find all cycles, don't return early
      }
    }
    
    recursionStack.delete(skillId);
    pathStack.pop();
    return false;
  }
  
  // Check all skills as potential cycle entry points
  skills.forEach(skill => {
    if (!visited.has(skill.id)) {
      dfs(skill.id);
    }
  });
  
  return cycles;
}

/**
 * Find disconnected clusters using Union-Find algorithm
 */
function findDisconnectedClusters(skills: Skill[], edges: SkillEdge[]): string[][] {
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();
  
  // Initialize each skill as its own cluster
  skills.forEach(skill => {
    parent.set(skill.id, skill.id);
    rank.set(skill.id, 0);
  });
  
  function find(skillId: string): string {
    if (parent.get(skillId) !== skillId) {
      parent.set(skillId, find(parent.get(skillId)!));
    }
    return parent.get(skillId)!;
  }
  
  function union(skillA: string, skillB: string): void {
    const rootA = find(skillA);
    const rootB = find(skillB);
    
    if (rootA !== rootB) {
      const rankA = rank.get(rootA) || 0;
      const rankB = rank.get(rootB) || 0;
      
      if (rankA < rankB) {
        parent.set(rootA, rootB);
      } else if (rankA > rankB) {
        parent.set(rootB, rootA);
      } else {
        parent.set(rootB, rootA);
        rank.set(rootA, rankA + 1);
      }
    }
  }
  
  // Connect skills through edges
  edges.forEach(edge => {
    union(edge.prerequisite_skill_id, edge.skill_id);
  });
  
  // Group skills by cluster
  const clusters = new Map<string, string[]>();
  skills.forEach(skill => {
    const root = find(skill.id);
    if (!clusters.has(root)) {
      clusters.set(root, []);
    }
    clusters.get(root)!.push(skill.id);
  });
  
  return Array.from(clusters.values());
}

/**
 * Get safe skills and edges by filtering out invalid data
 */
export function getSafeSkillTreeData(
  skills: Skill[], 
  edges: SkillEdge[]
): { safeSkills: Skill[]; safeEdges: SkillEdge[] } {
  const validation = validateSkillTree(skills, edges);
  
  // Remove broken edges
  const brokenEdgeKeys = new Set(
    validation.brokenEdges.map(e => `${e.prerequisite_skill_id}-${e.skill_id}`)
  );
  
  const safeEdges = edges.filter(edge => 
    !brokenEdgeKeys.has(`${edge.prerequisite_skill_id}-${edge.skill_id}`)
  );
  
  // Keep all skills (orphan nodes are just warnings)
  const safeSkills = skills;
  
  return { safeSkills, safeEdges };
}

/**
 * Enhanced skill depth calculation with circular dependency prevention
 */
export function calculateSkillDepthsSafely(
  skills: Skill[], 
  edges: SkillEdge[]
): Map<string, number> {
  const { safeSkills, safeEdges } = getSafeSkillTreeData(skills, edges);
  const depthMap = new Map<string, number>();
  const processing = new Set<string>();
  const completed = new Set<string>();
  
  function calculateDepth(skillId: string): number {
    if (completed.has(skillId)) {
      return depthMap.get(skillId) || 0;
    }
    
    if (processing.has(skillId)) {
      // Circular dependency detected - assign depth 0 and continue
      console.warn(`Circular dependency detected for skill: ${skillId}`);
      depthMap.set(skillId, 0);
      completed.add(skillId);
      return 0;
    }
    
    processing.add(skillId);
    
    // Find all prerequisites for this skill
    const prerequisites = safeEdges.filter(edge => edge.skill_id === skillId);
    
    if (prerequisites.length === 0) {
      // Root skill
      depthMap.set(skillId, 0);
    } else {
      // Calculate depth as max prerequisite depth + 1
      const maxPrereqDepth = Math.max(
        ...prerequisites.map(edge => calculateDepth(edge.prerequisite_skill_id))
      );
      depthMap.set(skillId, maxPrereqDepth + 1);
    }
    
    processing.delete(skillId);
    completed.add(skillId);
    
    return depthMap.get(skillId) || 0;
  }
  
  // Calculate depths for all skills
  safeSkills.forEach(skill => {
    if (!completed.has(skill.id)) {
      calculateDepth(skill.id);
    }
  });
  
  return depthMap;
}
