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

// New validation functions for pivot roadmap ID uniqueness

interface RoadmapStep {
  id?: string;
  title: string;
  description?: string;
  skills_needed?: string[];
  estimated_time?: string;
  estimated_cost?: string;
}

interface PivotPath {
  new_career: string;
  shared_skills: string[];
  missing_skills: string[];
  roi_score: number;
  estimated_time: string;
  estimated_cost: string;
  reasoning: string;
}

interface ValidationResult {
  isValid: boolean;
  uniqueIds: boolean;
  conflicts: string[];
  duplicatedIds: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Test function to verify that pivot roadmap generates unique IDs
 * and can be merged without conflicts
 */
export const testPivotRoadmapIdUniqueness = async (): Promise<ValidationResult> => {
  console.log("🔍 Testing Pivot Roadmap ID Uniqueness and Merging...");
  
  const result: ValidationResult = {
    isValid: true,
    uniqueIds: true,
    conflicts: [],
    duplicatedIds: [],
    warnings: [],
    recommendations: []
  };

  try {
    const { supabase } = await import("@/integrations/supabase/client");

    // Step 1: Get existing skill tree data
    console.log("📊 Fetching existing skill tree data...");
    
    const [skillsResponse, stepsResponse, existingRoadmapResponse] = await Promise.all([
      supabase.from('skills').select('id, name').limit(100),
      supabase.from('career_steps').select('id, title').limit(50),
      supabase.from('roadmap_step_skills').select('skill_id, roadmap_step_id').limit(100)
    ]);

    const existingSkillIds = new Set(skillsResponse.data?.map(s => s.id) || []);
    const existingStepIds = new Set(stepsResponse.data?.map(s => s.id) || []);
    const existingRoadmapIds = new Set(existingRoadmapResponse.data?.map(r => r.roadmap_step_id) || []);

    console.log(`📈 Existing data counts:`, {
      skills: existingSkillIds.size,
      steps: existingStepIds.size,
      roadmaps: existingRoadmapIds.size
    });

    // Step 2: Generate multiple pivot roadmaps
    console.log("🚀 Generating multiple pivot roadmaps...");
    
    const testScenarios = [
      {
        current_career: "Software Engineer",
        user_skills: ["JavaScript", "React", "Python"],
        preferred_locations: ["San Francisco", "New York"]
      },
      {
        current_career: "Data Analyst", 
        user_skills: ["SQL", "Excel", "Python"],
        preferred_locations: ["Austin", "Seattle"]
      },
      {
        current_career: "UX Designer",
        user_skills: ["Figma", "User Research", "Prototyping"],
        preferred_locations: ["London", "Berlin"]
      }
    ];

    const generatedRoadmaps: any[] = [];
    const allGeneratedIds = new Set<string>();
    const idCollisions = new Set<string>();

    for (const scenario of testScenarios) {
      // Generate pivot paths
      const pivotResponse = await supabase.functions.invoke('recommend-pivot-paths', {
        body: scenario
      });

      if (pivotResponse.error) {
        result.warnings.push(`Failed to generate pivot for ${scenario.current_career}: ${pivotResponse.error.message}`);
        continue;
      }

      const pivotData = pivotResponse.data;
      if (!pivotData.pivots || pivotData.pivots.length === 0) {
        result.warnings.push(`No pivots generated for ${scenario.current_career}`);
        continue;
      }

      // For each pivot, generate a roadmap
      for (const pivot of pivotData.pivots.slice(0, 2)) { // Test first 2 pivots per scenario
        const roadmapResponse = await supabase.functions.invoke('generate-roadmap', {
          body: {
            goal: pivot.new_career,
            user_skills: pivot.shared_skills,
            max_time: "6 months",
            max_budget: "$1000"
          }
        });

        if (roadmapResponse.error) {
          result.warnings.push(`Failed to generate roadmap for ${pivot.new_career}: ${roadmapResponse.error.message}`);
          continue;
        }

        const roadmapData = roadmapResponse.data;
        if (roadmapData.success && roadmapData.roadmaps) {
          generatedRoadmaps.push({
            scenario: scenario.current_career,
            pivot: pivot.new_career,
            roadmap: roadmapData.roadmaps
          });

          // Extract and check IDs from all roadmap paths
          const paths = [
            roadmapData.roadmaps.fastest_path,
            roadmapData.roadmaps.lowest_cost_path,
            roadmapData.roadmaps.highest_roi_path
          ].filter(Boolean);

          for (const path of paths) {
            if (path.steps) {
              for (const step of path.steps) {
                // Generate deterministic ID for each step
                const stepId = generateStepId(step, pivot.new_career);
                
                // Check for ID conflicts
                if (allGeneratedIds.has(stepId)) {
                  idCollisions.add(stepId);
                  result.duplicatedIds.push(stepId);
                }
                
                allGeneratedIds.add(stepId);
                
                // Check against existing database IDs
                if (existingStepIds.has(stepId)) {
                  result.conflicts.push(`Step ID ${stepId} conflicts with existing career step`);
                }
                if (existingRoadmapIds.has(stepId)) {
                  result.conflicts.push(`Step ID ${stepId} conflicts with existing roadmap step`);
                }

                // Check skill IDs if they exist
                if (step.skills_needed) {
                  for (const skillName of step.skills_needed) {
                    const skillId = generateSkillId(skillName);
                    if (existingSkillIds.has(skillId)) {
                      // This is actually good - we want to reuse existing skills
                      console.log(`✅ Reusing existing skill: ${skillName} (${skillId})`);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Step 3: Analyze results
    console.log(`📊 Analysis Results:`, {
      totalGeneratedIds: allGeneratedIds.size,
      duplicatedIds: result.duplicatedIds.length,
      conflicts: result.conflicts.length,
      roadmapsGenerated: generatedRoadmaps.length
    });

    // Step 4: Test merge simulation
    console.log("🔄 Testing merge simulation...");
    const mergeTest = simulateSkillTreeMerge(generatedRoadmaps, {
      existingSkillIds,
      existingStepIds,
      existingRoadmapIds
    });

    result.isValid = result.conflicts.length === 0 && result.duplicatedIds.length === 0;
    result.uniqueIds = result.duplicatedIds.length === 0;

    // Generate recommendations
    if (result.duplicatedIds.length > 0) {
      result.recommendations.push("Implement better ID generation strategy to prevent duplicates");
      result.recommendations.push("Consider using UUIDs or timestamp-based IDs for generated content");
    }

    if (result.conflicts.length > 0) {
      result.recommendations.push("Add ID conflict resolution in merge logic");
      result.recommendations.push("Implement ID namespace separation between generated and existing content");
    }

    if (allGeneratedIds.size === 0) {
      result.warnings.push("No IDs were generated - check roadmap generation logic");
    }

    result.recommendations.push(`Generated ${allGeneratedIds.size} unique IDs across ${generatedRoadmaps.length} roadmaps`);

    return result;

  } catch (error) {
    console.error("❌ Error testing pivot roadmap ID uniqueness:", error);
    result.isValid = false;
    result.warnings.push(`Test failed with error: ${error.message}`);
    return result;
  }
};

/**
 * Generate a deterministic ID for a roadmap step
 */
function generateStepId(step: RoadmapStep, careerGoal: string): string {
  // Create a deterministic ID based on step content and career goal
  const content = `${careerGoal}_${step.title}`.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
  
  // Add a hash suffix to ensure uniqueness
  const hash = simpleHash(JSON.stringify(step));
  return `gen_step_${content}_${hash}`;
}

/**
 * Generate a deterministic ID for a skill
 */
function generateSkillId(skillName: string): string {
  return skillName.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Simple hash function for ID generation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

/**
 * Simulate merging generated roadmap content into existing skill tree
 */
function simulateSkillTreeMerge(
  generatedRoadmaps: any[],
  existingData: {
    existingSkillIds: Set<string>;
    existingStepIds: Set<string>;
    existingRoadmapIds: Set<string>;
  }
): { success: boolean; mergedCount: number; conflictCount: number } {
  
  let mergedCount = 0;
  let conflictCount = 0;

  for (const roadmapData of generatedRoadmaps) {
    const roadmap = roadmapData.roadmap;
    const paths = [
      roadmap.fastest_path,
      roadmap.lowest_cost_path,
      roadmap.highest_roi_path
    ].filter(Boolean);

    for (const path of paths) {
      if (path.steps) {
        for (const step of path.steps) {
          const stepId = generateStepId(step, roadmapData.pivot);
          
          if (existingData.existingStepIds.has(stepId) || 
              existingData.existingRoadmapIds.has(stepId)) {
            conflictCount++;
            console.warn(`⚠️  Merge conflict for step: ${step.title} (${stepId})`);
          } else {
            mergedCount++;
            console.log(`✅ Successfully merged step: ${step.title} (${stepId})`);
          }
        }
      }
    }
  }

  return {
    success: conflictCount === 0,
    mergedCount,
    conflictCount
  };
}

/**
 * Validate that generated content can be displayed without visual duplication
 */
export const validateVisualUniqueness = (roadmapData: any): {
  isValid: boolean;
  duplicatePositions: number;
  duplicateTitles: string[];
} => {
  const positions = new Set<string>();
  const titles = new Map<string, number>();
  let duplicatePositions = 0;
  const duplicateTitles: string[] = [];

  const paths = [
    roadmapData.fastest_path,
    roadmapData.lowest_cost_path,
    roadmapData.highest_roi_path
  ].filter(Boolean);

  for (const path of paths) {
    if (path.steps) {
      for (const [index, step] of path.steps.entries()) {
        // Check for position conflicts (same index in multiple paths)
        const positionKey = `${index}`;
        if (positions.has(positionKey)) {
          duplicatePositions++;
        }
        positions.add(positionKey);

        // Check for title duplicates
        const titleCount = titles.get(step.title) || 0;
        titles.set(step.title, titleCount + 1);
        if (titleCount > 0) {
          duplicateTitles.push(step.title);
        }
      }
    }
  }

  return {
    isValid: duplicatePositions === 0 && duplicateTitles.length === 0,
    duplicatePositions,
    duplicateTitles
  };
};
