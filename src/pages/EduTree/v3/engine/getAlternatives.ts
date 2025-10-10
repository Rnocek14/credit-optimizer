/**
 * Phase 3b: Alternative Retrieval & Ranking
 * 
 * Fetches alternatives from the LifePath graph and ranks them
 * Used by AlternativesDrawer to show checkpoint options
 */

import type { GraphNode, GraphEdge } from '@/types/lifePathGraph';
import { RANKING_WEIGHTS } from './rankingWeights';

export interface RankedAlternative {
  node: GraphNode;
  rank: number;
  score: number;
  prerequisiteStatus: 'ready' | 'locked' | 'waiver';
  missingPrereqs?: string[];
}

/**
 * Gets alternatives for a checkpoint's source node
 */
export function getAlternativesForNode(
  sourceNodeId: string,
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  completedNodeIds: string[] = []
): RankedAlternative[] {
  // Find all alternative edges from this source
  const alternativeEdges = allEdges.filter(
    e => e.sourceId === sourceNodeId && e.type === 'alternative'
  );

  if (alternativeEdges.length === 0) {
    console.log(`[Alternatives] No alternatives found for node: ${sourceNodeId}`);
    return [];
  }

  console.log(`[Alternatives] Found ${alternativeEdges.length} alternative edges for ${sourceNodeId}`);

  // Get the target nodes
  const alternatives = alternativeEdges
    .map(edge => {
      const node = allNodes.find(n => n.id === edge.targetId);
      if (!node) {
        console.warn(`[Alternatives] Target node not found: ${edge.targetId}`);
        return null;
      }
      return node;
    })
    .filter((n): n is GraphNode => n !== null);

  // Rank each alternative
  const rankedAlternatives = alternatives.map(node => {
    const score = calculateScore(node);
    const prereqStatus = checkPrerequisites(node, allNodes, allEdges, completedNodeIds);
    
    return {
      node,
      rank: 0, // Will be set after sorting
      score,
      prerequisiteStatus: prereqStatus.status,
      missingPrereqs: prereqStatus.missing,
    };
  });

  // Sort by score (descending)
  rankedAlternatives.sort((a, b) => b.score - a.score);

  // Assign ranks
  rankedAlternatives.forEach((alt, index) => {
    alt.rank = index + 1;
  });

  console.log('[Alternatives] Ranked alternatives:', {
    count: rankedAlternatives.length,
    top: rankedAlternatives.slice(0, 3).map(a => ({
      title: a.node.title,
      rank: a.rank,
      score: a.score.toFixed(2),
      status: a.prerequisiteStatus
    }))
  });

  return rankedAlternatives;
}

/**
 * Calculate weighted score for an alternative
 * Higher score = better option
 */
function calculateScore(node: GraphNode): number {
  // Normalize credits (0-1, higher is better)
  const creditsScore = Math.min((node.credits ?? 0) / 120, 1);

  // Normalize time (0-1, lower is better, so invert)
  const timeScore = 1 - Math.min(node.estimatedHours / 2000, 1);

  // Normalize cost (0-1, lower is better, so invert)
  const costScore = 1 - Math.min(node.cost / 50000, 1);

  // Normalize outcome alignment (0-1, more outcomes is better)
  const outcomeScore = Math.min((node.skillOutcomes?.length ?? 0) / 10, 1);

  // Weighted sum
  const score =
    RANKING_WEIGHTS.CREDITS_KEPT * creditsScore +
    RANKING_WEIGHTS.TIME_WEEKS * timeScore +
    RANKING_WEIGHTS.COST_USD * costScore +
    RANKING_WEIGHTS.OUTCOME_ALIGNMENT * outcomeScore;

  return score;
}

/**
 * Check if prerequisites are met for a node
 */
function checkPrerequisites(
  node: GraphNode,
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  completedNodeIds: string[]
): { status: 'ready' | 'locked' | 'waiver'; missing: string[] } {
  // Check for waiver tags (null-safe)
  const hasWaiver = (node.tags ?? []).some(tag => 
    tag.includes('waiver') || tag.includes('clep') || tag.includes('ace')
  );

  if (hasWaiver) {
    return { status: 'waiver', missing: [] };
  }

  // Find prerequisite edges
  const prereqEdges = allEdges.filter(
    e => e.targetId === node.id && e.type === 'requires'
  );

  if (prereqEdges.length === 0) {
    // No prerequisites = ready
    return { status: 'ready', missing: [] };
  }

  // Check which prerequisites are missing
  const missingPrereqs: string[] = [];
  
  for (const edge of prereqEdges) {
    if (!completedNodeIds.includes(edge.sourceId)) {
      const prereqNode = allNodes.find(n => n.id === edge.sourceId);
      if (prereqNode) {
        missingPrereqs.push(prereqNode.title);
      }
    }
  }

  if (missingPrereqs.length === 0) {
    return { status: 'ready', missing: [] };
  }

  return { status: 'locked', missing: missingPrereqs };
}
