import type { Node, Edge } from '@xyflow/react';

/**
 * Layout Stabilizer - Circuit Breaker for Visual Scrambling
 * Prevents multiple competing layout systems from causing visual chaos
 */

let layoutFreeze = false;
let frozenPositions: Map<string, { x: number; y: number }> = new Map();

export interface LayoutStabilizerOptions {
  enableFreeze: boolean;
  debug?: boolean;
}

/**
 * Stabilizes node positions to prevent visual scrambling
 */
export function stabilizeLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutStabilizerOptions = { enableFreeze: true }
): { nodes: Node[]; edges: Edge[]; isStabilized: boolean } {
  const { enableFreeze, debug = false } = options;
  
  if (!enableFreeze) {
    return { nodes, edges, isStabilized: false };
  }
  
  // First pass: capture positions
  if (!layoutFreeze && nodes.length > 0) {
    console.log('[LayoutStabilizer] Capturing positions and enabling freeze');
    nodes.forEach(node => {
      if (node.position) {
        frozenPositions.set(node.id, { x: node.position.x, y: node.position.y });
      }
    });
    layoutFreeze = true;
  }
  
  // Apply frozen positions to prevent any movement
  const stabilizedNodes = nodes.map(node => {
    const frozenPos = frozenPositions.get(node.id);
    if (frozenPos) {
      return {
        ...node,
        position: frozenPos,
        draggable: false,
        style: {
          ...node.style,
          transition: 'none',
          transform: 'none'
        }
      };
    }
    return node;
  });
  
  const stabilizedEdges = edges.map(edge => ({
    ...edge,
    style: {
      ...edge.style,
      transition: 'none'
    }
  }));
  
  if (debug) {
    console.log('[LayoutStabilizer] Positions stabilized:', {
      frozenCount: frozenPositions.size,
      isStabilized: layoutFreeze
    });
  }
  
  return {
    nodes: stabilizedNodes,
    edges: stabilizedEdges,
    isStabilized: layoutFreeze
  };
}

/**
 * Resets the layout stabilizer (for mode changes)
 */
export function resetLayoutStabilizer() {
  layoutFreeze = false;
  frozenPositions.clear();
  console.log('[LayoutStabilizer] Reset - unfrozen');
}

/**
 * Forces immediate stabilization for emergency stops
 */
export function emergencyStabilize(nodes: Node[]): Node[] {
  console.log('[LayoutStabilizer] EMERGENCY STABILIZE');
  layoutFreeze = true;
  
  return nodes.map(node => ({
    ...node,
    draggable: false,
    style: {
      ...node.style,
      position: 'absolute',
      transition: 'none !important',
      transform: 'none !important',
      willChange: 'auto'
    }
  }));
}