import { PathfindingResult, GraphNode, GraphEdge } from '@/types/lifePathGraph';

export interface OverlapAnalysis {
  nodeUsage: Record<string, {
    count: number;
    paths: string[];
    goals: string[];
  }>;
  edgeUsage: Record<string, {
    count: number;
    paths: string[];
    goals: string[];
  }>;
  sharedSegments: {
    nodeIds: string[];
    goals: string[];
    description: string;
    credits: number;
    time: number;
    cost: number;
  }[];
}

export function calculatePathOverlap(
  pathfindingResults: Record<string, PathfindingResult>,
  goals: { id: string; name: string }[] = []
): OverlapAnalysis {
  const nodeUsage: Record<string, any> = {};
  const edgeUsage: Record<string, any> = {};
  const sharedSegments: any[] = [];

  // Count usage across all goals and path types
  Object.entries(pathfindingResults).forEach(([goalId, result]) => {
    const goalName = goals.find(g => g.id === goalId)?.name || goalId;
    
    // Process different path types
    const pathTypes = ['fastest', 'cheapest', 'creditMaximized'];
    pathTypes.forEach(pathType => {
      const path = result[pathType as keyof PathfindingResult] as any;
      if (path?.nodeIds) {
        const pathKey = `${goalId}-${pathType}`;
        
        // Count node usage
        path.nodeIds.forEach((nodeId: string) => {
          if (!nodeUsage[nodeId]) {
            nodeUsage[nodeId] = { count: 0, paths: [], goals: [] };
          }
          nodeUsage[nodeId].count++;
          nodeUsage[nodeId].paths.push(pathKey);
          if (!nodeUsage[nodeId].goals.includes(goalName)) {
            nodeUsage[nodeId].goals.push(goalName);
          }
        });

        // Count edge usage (approximate based on sequential nodes)
        for (let i = 0; i < path.nodeIds.length - 1; i++) {
          const edgeKey = `${path.nodeIds[i]}->${path.nodeIds[i + 1]}`;
          if (!edgeUsage[edgeKey]) {
            edgeUsage[edgeKey] = { count: 0, paths: [], goals: [] };
          }
          edgeUsage[edgeKey].count++;
          edgeUsage[edgeKey].paths.push(pathKey);
          if (!edgeUsage[edgeKey].goals.includes(goalName)) {
            edgeUsage[edgeKey].goals.push(goalName);
          }
        }
      }
    });
  });

  // Identify shared segments (consecutive nodes used by multiple goals)
  const multiGoalNodes = Object.entries(nodeUsage)
    .filter(([_, usage]) => usage.goals.length > 1)
    .map(([nodeId]) => nodeId);

  // Find consecutive shared nodes to create segments
  const goalEntries = Object.entries(pathfindingResults);
  if (goalEntries.length >= 2) {
    const [goal1, goal2] = goalEntries;
    const path1 = goal1[1].fastest?.nodeIds || [];
    const path2 = goal2[1].fastest?.nodeIds || [];
    
    // Find longest common subsequences
    const commonSubsequences = findCommonSubsequences(path1, path2);
    commonSubsequences.forEach(sequence => {
      if (sequence.length >= 2) { // Only consider segments of 2+ nodes
        sharedSegments.push({
          nodeIds: sequence,
          goals: [goal1[0], goal2[0]],
          description: `Shared foundation (${sequence.length} steps)`,
          credits: sequence.length * 3, // Estimate
          time: sequence.length * 4, // Estimate weeks
          cost: sequence.length * 1500 // Estimate
        });
      }
    });
  }

  return {
    nodeUsage,
    edgeUsage, 
    sharedSegments
  };
}

function findCommonSubsequences(path1: string[], path2: string[]): string[][] {
  const subsequences: string[][] = [];
  
  for (let i = 0; i < path1.length; i++) {
    const currentSequence: string[] = [];
    let j = path2.indexOf(path1[i]);
    
    if (j !== -1) {
      let k = i;
      while (k < path1.length && j < path2.length && path1[k] === path2[j]) {
        currentSequence.push(path1[k]);
        k++;
        j++;
      }
      
      if (currentSequence.length >= 2) {
        subsequences.push(currentSequence);
      }
    }
  }
  
  return subsequences;
}

export function calculateNodeOverlapCount(
  nodeId: string,
  pathfindingResults: Record<string, PathfindingResult>
): number {
  let count = 0;
  
  Object.values(pathfindingResults).forEach(result => {
    if (result.fastest?.nodeIds.includes(nodeId)) count++;
    if (result.cheapest?.nodeIds.includes(nodeId) && 
        !result.fastest?.nodeIds.includes(nodeId)) count++;
    if (result.creditMaximized?.nodeIds.includes(nodeId) && 
        !result.fastest?.nodeIds.includes(nodeId) && 
        !result.cheapest?.nodeIds.includes(nodeId)) count++;
  });
  
  return count;
}

export function getSharedGoals(
  nodeId: string,
  pathfindingResults: Record<string, PathfindingResult>,
  goalNames: Record<string, string> = {}
): string[] {
  const goals: string[] = [];
  
  Object.entries(pathfindingResults).forEach(([goalId, result]) => {
    const pathTypes = [result.fastest, result.cheapest, result.creditMaximized];
    if (pathTypes.some(path => path?.nodeIds.includes(nodeId))) {
      goals.push(goalNames[goalId] || goalId);
    }
  });
  
  return [...new Set(goals)];
}