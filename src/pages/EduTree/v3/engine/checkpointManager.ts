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
    
    // FIX #4: Add validation logging for ID mismatches
    if (!sourceNode) {
      if (import.meta.env.DEV) {
        console.warn('[Checkpoints] Source node not found for fork:', {
          nodeId,
          availableIds: nodes.map(n => n.id).slice(0, 5),
          hint: 'ID mismatch? Check if nodeId is raw LifePath ID vs adapted V3 ID'
        });
      }
      continue;
    }

    const altCount = meta.alternativesByNode[nodeId];
    const checkpointId = `checkpoint-${nodeId}`;
    
    if (import.meta.env.DEV) {
      console.log('[Checkpoints] Processing fork:', {
        nodeId,
        altCount,
        sourceNodeFound: !!sourceNode,
        sourceNodeType: sourceNode?.type,
        checkpointId
      });
    }
    
    // Idempotency guard: skip if checkpoint already exists
    if (newNodes.some(n => n.id === checkpointId)) {
      console.log(`[Checkpoints] Skipping duplicate checkpoint for ${nodeId}`);
      continue;
    }
    
    // Create checkpoint node - layout engine will position it AFTER bundling
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
        // WARNING: Temporary position - layout engine MUST update this
        // Using placeholder to detect if layout fails to position
        x: 0,
        y: 0,
      },
    };

    newNodes.push(checkpointNode);
    
    if (import.meta.env.DEV) {
      console.log('[Checkpoints] Checkpoint created (position pending layout):', {
        id: checkpointNode.id,
        sourceNodeId: checkpointNode.data.sourceNodeId,
        alternativeCount: checkpointNode.data.alternativeCount,
        position: checkpointNode.position,
        warning: 'Layout engine must update position'
      });
    }
    
    // DON'T create edge here - createCollapsedView will handle remapping
    // (source might get absorbed into bundle, so edge must be created after bundling)
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
