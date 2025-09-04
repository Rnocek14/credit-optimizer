import { GraphEdge, GraphNode, UserState } from '@/types/lifePathGraph';

export interface GhostInfo {
  isGhost: boolean;
  reason?: string;
  details?: {
    time?: string;
    cost?: string;
    cap?: string;
    requirement?: string;
  };
}

export function determineGhostStatus(
  node: GraphNode,
  userState?: UserState,
  allowGhost: boolean = false
): GhostInfo {
  // Safety guard: don't block rendering when no user state
  if (!userState) {
    return { isGhost: false };
  }
  
  if (allowGhost) {
    return { isGhost: false };
  }

  // CLEP/Exam alternatives that exceed caps
  if (node.type === 'exam' && node.tags.includes('clep')) {
    const examCreditsUsed = userState?.existingCredits
      .filter(c => c.nodeId.includes('clep') || c.nodeId.includes('exam'))
      .reduce((sum, c) => sum + c.credits, 0) || 0;
    
    const examCap = 30; // Standard exam cap
    if (examCreditsUsed + (node.credits || 0) > examCap) {
      return {
        isGhost: true,
        reason: `Exceeds exam cap (${examCap}cr)`,
        details: {
          cap: `${examCreditsUsed}/${examCap} used`
        }
      };
    }
  }

  // Budget constraints
  if (userState?.preferences.maxCost && node.cost > userState.preferences.maxCost) {
    return {
      isGhost: true,
      reason: 'Exceeds budget',
      details: {
        cost: `$${node.cost.toLocaleString()}`
      }
    };
  }

  // Time constraints
  if (userState?.preferences.maxTimeMonths) {
    const nodeTimeMonths = Math.ceil(node.estimatedHours / 40); // Assuming 40 hours per month
    if (nodeTimeMonths > userState.preferences.maxTimeMonths) {
      return {
        isGhost: true,
        reason: 'Exceeds time limit',
        details: {
          time: `${nodeTimeMonths} months`
        }
      };
    }
  }

  // Modality constraints
  if (userState?.preferences.preferredModality && 
      userState.preferences.preferredModality !== 'any' &&
      node.modality !== userState.preferences.preferredModality) {
    return {
      isGhost: true,
      reason: `Requires ${node.modality} attendance`,
      details: {
        requirement: `User prefers ${userState.preferences.preferredModality}`
      }
    };
  }

  // Prerequisites not met
  const unmetPrereqs = node.prerequisiteIds.filter(prereqId => 
    !userState?.completedNodeIds.includes(prereqId) &&
    !userState?.inProgressNodeIds.includes(prereqId)
  );

  if (unmetPrereqs.length > 0) {
    return {
      isGhost: true,
      reason: 'Prerequisites not met',
      details: {
        requirement: `${unmetPrereqs.length} missing prerequisites`
      }
    };
  }

  return { isGhost: false };
}

export function determineEdgeGhostStatus(
  edge: GraphEdge,
  sourceNode: GraphNode,
  targetNode: GraphNode,
  userState?: UserState,
  allowGhost: boolean = false
): GhostInfo {
  if (allowGhost) {
    return { isGhost: false };
  }

  // Transfer cap violations
  if (edge.type === 'creditTransfersTo' && edge.policy) {
    const { cap, capCategory } = edge.policy;
    
    if (cap && capCategory) {
      let creditsUsed = 0;
      
      if (capCategory === 'exam') {
        creditsUsed = userState?.existingCredits
          .filter(c => c.nodeId.includes('clep') || c.nodeId.includes('exam'))
          .reduce((sum, c) => sum + c.credits, 0) || 0;
      } else if (capCategory === 'transfer') {
        creditsUsed = userState?.existingCredits
          .filter(c => c.institution !== userState.preferences.currentInstitution)
          .reduce((sum, c) => sum + c.credits, 0) || 0;
      }
      
      if (creditsUsed + (sourceNode.credits || 0) > cap) {
        return {
          isGhost: true,
          reason: `Exceeds ${capCategory} cap (${cap}cr)`,
          details: {
            cap: `${creditsUsed}/${cap} used`
          }
        };
      }
    }
  }

  // Residency requirement violations
  if (edge.type === 'stacksInto' && targetNode.policy?.residencyCredits) {
    const residencyMet = userState?.existingCredits
      .filter(c => c.institution === targetNode.institution)
      .reduce((sum, c) => sum + c.credits, 0) || 0;
    
    if (residencyMet < targetNode.policy.residencyCredits) {
      return {
        isGhost: true,
        reason: `Violates residency requirement`,
        details: {
          requirement: `≥${targetNode.policy.residencyCredits}cr at ${targetNode.institution}`
        }
      };
    }
  }

  return { isGhost: false };
}

export function generateGhostAlternatives(
  node: GraphNode,
  allNodes: GraphNode[],
  userState?: UserState
): GraphNode[] {
  const alternatives: GraphNode[] = [];

  // Find equivalent courses/exams
  const equivalents = allNodes.filter(otherNode => 
    otherNode.id !== node.id &&
    otherNode.skillOutcomes.some(skill => node.skillOutcomes.includes(skill))
  );

  // Find CLEP alternatives for courses
  if (node.type === 'course') {
    const clepAlternatives = allNodes.filter(otherNode =>
      otherNode.type === 'exam' &&
      otherNode.tags.includes('clep') &&
      otherNode.skillOutcomes.some(skill => node.skillOutcomes.includes(skill))
    );
    alternatives.push(...clepAlternatives);
  }

  // Find different modality options
  const modalityAlternatives = allNodes.filter(otherNode =>
    otherNode.id !== node.id &&
    otherNode.title === node.title &&
    otherNode.modality !== node.modality
  );
  alternatives.push(...modalityAlternatives);

  return alternatives.slice(0, 3); // Limit to top 3 alternatives
}