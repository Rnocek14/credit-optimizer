/**
 * Phase 3: Checkpoint Manager
 * 
 * Injects checkpoint nodes at fork points where alternatives exist
 * Uses meta.alternativesByNode to detect where checkpoints should render
 * 
 * CRITICAL: Maintains grid alignment (8px snap) and stable IDs
 */

import type { V3Node, V3Edge } from '../types/v3';
import type { BridgeMeta } from '../data/lifePathBridge';
import { VERT } from '../utils/layoutTokensVertical';

export interface CheckpointInjectionResult {
  nodes: V3Node[];
  edges: V3Edge[];
  checkpointsAdded: number;
}

/**
 * Injects checkpoint nodes at fork points
 * Phase 3: Only adds checkpoints where alternativesByNode count >= 2
 */
export function injectCheckpoints(
  nodes: V3Node[],
  edges: V3Edge[],
  meta: BridgeMeta
): CheckpointInjectionResult {
  const newNodes: V3Node[] = [...nodes];
  const newEdges: V3Edge[] = [...edges];
  let checkpointsAdded = 0;

  // Find fork points from meta
  const forkNodeIds = Object.keys(meta.alternativesByNode).filter(
    nodeId => meta.alternativesByNode[nodeId] >= 1
  );

  if (forkNodeIds.length === 0) {
    console.log('[Checkpoints] No forks detected, skipping checkpoint injection');
    return { nodes: newNodes, edges: newEdges, checkpointsAdded: 0 };
  }

  // For each fork point, inject a checkpoint node
  for (const nodeId of forkNodeIds) {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode) continue;

    const altCount = meta.alternativesByNode[nodeId];
    
    // Create checkpoint node positioned just after the source node
    const checkpointId = `checkpoint-${nodeId}`;
    const checkpointNode: V3Node = {
      id: checkpointId,
      type: 'checkpoint',
      data: {
        tier: sourceNode.data.tier,
        tierLabel: `Checkpoint: ${altCount} alternatives`,
        title: `Choose Your Path`,
        lineage: sourceNode.data.lineage,
        alternativeCount: altCount,
        sourceNodeId: nodeId,
        showAlternatives: true,
      },
      position: {
        // Position below source node (will be adjusted by layout engine)
        x: sourceNode.position.x,
        y: sourceNode.position.y + VERT.TIER_SPACING_PX,
      },
    };

    newNodes.push(checkpointNode);
    checkpointsAdded++;

    console.log(`[Checkpoints] Added checkpoint for ${nodeId} with ${altCount} alternatives`);
  }

  console.log(`[Checkpoints] Injection complete: ${checkpointsAdded} checkpoints added`);

  return {
    nodes: newNodes,
    edges: newEdges,
    checkpointsAdded,
  };
}

/**
 * Phase 3 helper: Get alternatives for a checkpoint node
 * Returns empty array if not a checkpoint or no alternatives found
 */
export function getCheckpointAlternatives(
  checkpointNode: V3Node,
  allNodes: V3Node[]
): V3Node[] {
  if (checkpointNode.type !== 'checkpoint') return [];
  
  const sourceNodeId = checkpointNode.data.sourceNodeId;
  if (!sourceNodeId) return [];

  // In Phase 3, we'll need the original GraphNode alternatives
  // For now, return empty (will be populated when drawer is implemented)
  return [];
}
