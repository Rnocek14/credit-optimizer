import { GraphNode, GraphEdge, UserState } from '@/types/lifePathGraph';

export type GhostInfo = {
  isGhost: boolean;
  reason?: string;
  details?: Record<string, string | number>;
};

// Node-level ghosting (caps, budget, time, modality, prereqs)
export function determineNodeGhostStatus(
  node: GraphNode,
  userState?: UserState,
  allowGhost = true
): GhostInfo {
  if (allowGhost) return { isGhost: false };

  // Exam cap (e.g., CLEP)
  if (node.type === "exam") {
    const usedExamCredits =
      userState?.existingCredits
        ?.filter(c => c.nodeId.includes('exam') || c.nodeId.includes('clep'))
        .reduce((s, c) => s + (c.credits || 0), 0) || 0;

    const examCap = 30;
    if (usedExamCredits + (node.credits || 0) > examCap) {
      return {
        isGhost: true,
        reason: `Exceeds exam cap (${examCap}cr)`,
        details: { cap: `${usedExamCredits}/${examCap} used` }
      };
    }
  }

  // Budget
  if (userState?.preferences?.maxCost && node.cost) {
    if (node.cost > userState.preferences.maxCost) {
      return {
        isGhost: true,
        reason: "Exceeds budget",
        details: { cost: `$${node.cost.toLocaleString()}` }
      };
    }
  }

  // Time
  if (userState?.preferences?.maxTimeMonths && node.estimatedHours) {
    const months = Math.ceil(node.estimatedHours / 40);
    if (months > userState.preferences.maxTimeMonths) {
      return {
        isGhost: true,
        reason: "Exceeds time limit",
        details: { time: `${months} months` }
      };
    }
  }

  // Modality
  if (
    userState?.preferences?.preferredModality &&
    userState.preferences.preferredModality !== "any" &&
    node.modality &&
    node.modality !== userState.preferences.preferredModality
  ) {
    return {
      isGhost: true,
      reason: `Requires ${node.modality} attendance`,
      details: { requirement: `User prefers ${userState.preferences.preferredModality}` }
    };
  }

  // Prereqs
  const prereqs = node.prerequisiteIds || [];
  const satisfied =
    (userState?.completedNodeIds || []).concat(userState?.inProgressNodeIds || []);
  const unmet = prereqs.filter(id => !satisfied.includes(id));
  if (unmet.length > 0) {
    return {
      isGhost: true,
      reason: "Prerequisites not met",
      details: { requirement: `${unmet.length} missing prerequisites` }
    };
  }

  return { isGhost: false };
}

// Edge-level ghosting (transfer caps, residency)
export function determineEdgeGhostStatus(
  edge: GraphEdge,
  source: GraphNode,
  target: GraphNode,
  userState?: UserState,
  allowGhost = true
): GhostInfo {
  if (allowGhost) return { isGhost: false };

  if (edge.type === "creditTransfersTo" && edge.policy) {
    const cap = edge.policy?.cap;
    const capCategory = edge.policy?.capCategory || "transfer";
    if (cap) {
      const used =
        userState?.existingCredits
          ?.filter(c => (capCategory === "exam" ? (c.nodeId.includes('exam') || c.nodeId.includes('clep')) : c.institution !== userState.preferences?.currentInstitution))
          .reduce((s, c) => s + (c.credits || 0), 0) || 0;
      const next = used + (source.credits || 0);
      if (next > cap) {
        return {
          isGhost: true,
          reason: `Exceeds ${capCategory} cap (${cap}cr)`,
          details: { cap: `${used}/${cap} used` }
        };
      }
    }
  }

  if (edge.type === "stacksInto" && target.policy?.residencyCredits) {
    const need = target.policy.residencyCredits;
    const have =
      userState?.existingCredits
        ?.filter(c => c.institution === target.institutionId)
        .reduce((s, c) => s + (c.credits || 0), 0) || 0;

    if (have < need) {
      return {
        isGhost: true,
        reason: "Violates residency requirement",
        details: { requirement: `≥${need}cr at ${target.institutionId}` }
      };
    }
  }

  return { isGhost: false };
}