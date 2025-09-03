// Enhanced pathfinding algorithms for Life Path Graph

import { GraphNode, GraphEdge, UserState, ScoringConfig } from '@/types/lifePathGraph';

export interface PathScoringWeights {
  time: number;
  cost: number;
  creditLoss: number;
  difficulty: number;
  roi: number;
}

export function edgeCost(
  edge: GraphEdge, 
  weights: PathScoringWeights, 
  userState?: UserState
): number {
  const t = (edge.weights?.time ?? 0) * weights.time;
  const c = (edge.weights?.cost ?? 0) * weights.cost;
  const cl = (edge.weights?.creditLoss ?? 0) * weights.creditLoss;
  const d = (edge.weights?.difficulty ?? 0) * weights.difficulty;
  const r = (edge.weights?.roi ?? 1) * weights.roi;
  
  // Check if this is a ghost edge
  const ghost = ghostInfo(edge, userState);
  const ghostPenalty = ghost.ghost && userState && 
    !userState.completedNodeIds.includes(edge.sourceId) ? 1e6 : 0;
  
  return t + c + cl + d - r + ghostPenalty;
}

export function ghostInfo(edge: GraphEdge, userState?: UserState): { ghost: boolean; reason?: string } {
  if (!userState) return { ghost: false };
  
  // CLEP/ACE exam alternatives
  if (/CLEP|ACE/i.test(edge.metadata?.examType ?? '') && 
      edge.type === 'equivalentTo' && 
      !userState.completedNodeIds.includes(edge.sourceId)) {
    return { ghost: true, reason: 'Unlock via CLEP exam' };
  }
  
  // Exam cap exceeded
  const examCreditsUsed = userState.existingCredits
    ?.filter(c => c.nodeId.includes('clep') || c.nodeId.includes('exam'))
    ?.reduce((sum, c) => sum + c.credits, 0) ?? 0;
    
  if (edge.policy?.capCategory === 'exam' && examCreditsUsed >= 30) {
    return { ghost: true, reason: 'Exceeds exam cap (30 credits)' };
  }
  
  // Transfer cap exceeded
  const transferCreditsUsed = userState.existingCredits
    ?.filter(c => !c.nodeId.includes('clep'))
    ?.reduce((sum, c) => sum + c.credits, 0) ?? 0;
    
  if (edge.policy?.cap && transferCreditsUsed >= edge.policy.cap) {
    return { ghost: true, reason: `Exceeds transfer cap (${edge.policy.cap} credits)` };
  }
  
  return { ghost: false };
}

export function assignDepthToMainPath(
  pathNodeIds: string[], 
  nodes: Map<string, GraphNode>
): void {
  pathNodeIds.forEach((id, index) => {
    const node = nodes.get(id);
    if (node) {
      (node.attributes ||= {}).depth = index;
    }
  });
}

export function createScoringWeights(config: ScoringConfig): PathScoringWeights {
  const objectives = config.objectives;
  
  return {
    time: objectives.time.minimize ? objectives.time.weight : -objectives.time.weight,
    cost: objectives.cost.minimize ? objectives.cost.weight : -objectives.cost.weight,
    creditLoss: objectives.creditLoss.minimize ? objectives.creditLoss.weight : -objectives.creditLoss.weight,
    difficulty: objectives.difficulty.minimize ? objectives.difficulty.weight : -objectives.difficulty.weight,
    roi: objectives.roi.maximize ? objectives.roi.weight : -objectives.roi.weight,
  };
}

export function normalizeWeights(weights: PathScoringWeights): PathScoringWeights {
  const sum = Math.abs(weights.time) + Math.abs(weights.cost) + 
              Math.abs(weights.creditLoss) + Math.abs(weights.difficulty) + 
              Math.abs(weights.roi);
              
  if (sum === 0) return weights;
  
  return {
    time: weights.time / sum,
    cost: weights.cost / sum,
    creditLoss: weights.creditLoss / sum,
    difficulty: weights.difficulty / sum,
    roi: weights.roi / sum,
  };
}

export function calculatePathMetrics(
  nodeIds: string[], 
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>
): {
  totalTime: number;
  totalCost: number;
  totalCredits: number;
  creditLoss: number;
  institutionsCount: number;
  prerequisitesSatisfied: number;
} {
  let totalTime = 0;
  let totalCost = 0;
  let totalCredits = 0;
  let creditLoss = 0;
  const institutions = new Set<string>();
  let prerequisitesSatisfied = 0;
  
  for (const nodeId of nodeIds) {
    const node = nodes.get(nodeId);
    if (node) {
      totalTime += node.estimatedHours;
      totalCost += node.cost;
      totalCredits += node.credits ?? 0;
      
      if (node.institution) {
        institutions.add(node.institution);
      }
      
      prerequisitesSatisfied += node.prerequisiteIds.length;
    }
  }
  
  // Calculate credit loss from edges
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const edgeId = `${nodeIds[i]}-${nodeIds[i + 1]}`;
    const edge = edges.get(edgeId);
    if (edge) {
      creditLoss += edge.weights.creditLoss;
    }
  }
  
  return {
    totalTime: Math.round(totalTime / 40), // Convert to months
    totalCost,
    totalCredits,
    creditLoss,
    institutionsCount: institutions.size,
    prerequisitesSatisfied,
  };
}