/**
 * Lane Packing Utilities - Eliminate overlaps within lanes
 * Applies GPT's recommended per-lane packing to prevent node collisions
 */

import { type Node } from '@xyflow/react';
import { packLane } from './deterministicGrid';

export interface LanePackingConfig {
  enabled: boolean;
  nodeHeight: number;
  gapBetweenNodes: number;
  lanes: {
    Y3L: { x: number; topY: number };
    Y3R: { x: number; topY: number };
    Y4L: { x: number; topY: number };
    Y4R: { x: number; topY: number };
  };
}

/**
 * Default lane packing configuration based on dynamic track spreading
 */
export function createLanePackingConfig(): LanePackingConfig {
  const COL_W = 280, COL_GAP = 120, TRACK_SPREAD = 240;
  const y3L = 600 + COL_W + COL_GAP - TRACK_SPREAD/2;  // SE lane (left)
  const y3R = 600 + COL_W + COL_GAP + TRACK_SPREAD/2;  // DS lane (right)
  
  return {
    enabled: true,
    nodeHeight: 120,  // Standard node height
    gapBetweenNodes: 24,  // 24px gap between nodes
    lanes: {
      Y3L: { x: y3L, topY: 200 },      // SE Y3 lane - start higher
      Y3R: { x: y3R, topY: 520 },      // DS Y3 lane - start lower
      Y4L: { x: y3L, topY: 120 },      // SE Y4 lane - start even higher
      Y4R: { x: y3R, topY: 600 }       // DS Y4 lane - start even lower
    }
  };
}

/**
 * Apply per-lane packing to eliminate overlaps
 * Groups nodes by lane and applies vertical packing within each lane
 */
export function applyLanePacking(nodes: Node[], config: LanePackingConfig): Node[] {
  if (!config.enabled || nodes.length === 0) {
    return nodes;
  }

  // Create a copy to avoid mutating original nodes
  const packedNodes = nodes.map(n => ({ ...n, position: { ...n.position } }));
  
  // Group nodes by lane (X position within tolerance)
  const tolerance = 50; // Allow for slight positioning differences
  const laneGroups = {
    Y3L: [] as typeof packedNodes,
    Y3R: [] as typeof packedNodes,
    Y4L: [] as typeof packedNodes,
    Y4R: [] as typeof packedNodes,
    other: [] as typeof packedNodes
  };

  packedNodes.forEach(node => {
    const x = node.position.x;
    const data = node.data as any;
    const year = data?.levelYear || data?.level_year || 0;
    
    // Skip gate nodes, headers, and non-course nodes
    if (node.type === 'gate' || node.type === 'header' || data?.isVirtual) {
      laneGroups.other.push(node);
      return;
    }

    // Classify by lane based on X position and year
    if (year === 3) {
      if (Math.abs(x - config.lanes.Y3L.x) < tolerance) {
        laneGroups.Y3L.push(node);
      } else if (Math.abs(x - config.lanes.Y3R.x) < tolerance) {
        laneGroups.Y3R.push(node);
      } else {
        laneGroups.other.push(node);
      }
    } else if (year === 4) {
      if (Math.abs(x - config.lanes.Y4L.x) < tolerance) {
        laneGroups.Y4L.push(node);
      } else if (Math.abs(x - config.lanes.Y4R.x) < tolerance) {
        laneGroups.Y4R.push(node);
      } else {
        laneGroups.other.push(node);
      }
    } else {
      laneGroups.other.push(node);
    }
  });

  // Apply packing to each lane
  Object.entries(laneGroups).forEach(([laneKey, laneNodes]) => {
    if (laneKey === 'other' || laneNodes.length === 0) return;
    
    const laneConfig = config.lanes[laneKey as keyof typeof config.lanes];
    if (laneConfig) {
      console.log(`[LanePacking] Packing ${laneNodes.length} nodes in lane ${laneKey} starting at Y=${laneConfig.topY}`);
      packLane(laneNodes, laneConfig.topY, config.nodeHeight, config.gapBetweenNodes);
    }
  });

  // Log packing results for debugging
  const packedCount = Object.values(laneGroups).reduce((sum, group, i) => 
    i < 4 ? sum + group.length : sum, 0);
  
  if (packedCount > 0) {
    console.log(`[LanePacking] Applied packing to ${packedCount} nodes across ${4} lanes`);
  }

  return packedNodes;
}

/**
 * Validate that lane packing eliminated overlaps
 * Returns overlap detection results for debugging
 */
export function validateLanePacking(nodes: Node[]): {
  hasOverlaps: boolean;
  overlaps: Array<{ nodeA: string; nodeB: string; distance: number }>;
} {
  const overlaps: Array<{ nodeA: string; nodeB: string; distance: number }> = [];
  const nodeHeight = 120;
  const minGap = 24;
  const minDistance = nodeHeight + minGap;

  // Check each pair of nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      
      // Skip non-course nodes
      if (nodeA.type !== 'requirement' || nodeB.type !== 'requirement') continue;
      if (nodeA.hidden || nodeB.hidden) continue;
      
      const dx = Math.abs(nodeA.position.x - nodeB.position.x);
      const dy = Math.abs(nodeA.position.y - nodeB.position.y);
      
      // Check if nodes are in the same lane (similar X) and potentially overlapping (close Y)
      if (dx < 50 && dy < minDistance) {
        overlaps.push({
          nodeA: nodeA.id,
          nodeB: nodeB.id, 
          distance: dy
        });
      }
    }
  }

  return {
    hasOverlaps: overlaps.length > 0,
    overlaps
  };
}