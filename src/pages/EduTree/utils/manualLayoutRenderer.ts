/**
 * Manual Layout Renderer - Pure position application
 * No algorithms, just direct coordinate mapping from database
 */

import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { V2RequirementBlock, V2Edge } from '../data/seedDataV2';

export interface V2NodeData extends Record<string, unknown> {
  title: string;
  ruleType: string;
  levelYear: number;
  area: string;
  creditsNeeded?: number;
  trackId?: string | null;
  isVirtual?: boolean;
}

/**
 * Convert V2 blocks to ReactFlow nodes with direct position mapping
 * No layout computation - just applies stored coordinates
 */
export function blocksToNodes(blocks: V2RequirementBlock[]): Node<V2NodeData>[] {
  return blocks.map(block => ({
    id: block.id,
    type: block.is_virtual ? 'gate' : 'requirement',
    position: {
      x: block.position_x,
      y: block.position_y
    },
    data: {
      title: block.title,
      ruleType: block.rule_type,
      levelYear: block.level_year,
      area: block.area,
      creditsNeeded: block.credits_needed,
      trackId: block.track_id,
      isVirtual: block.is_virtual
    },
    // Add default handles for edge connections
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false, // Prevent user from moving manually positioned nodes
    selectable: true
  }));
}

/**
 * Convert V2 edges to ReactFlow edges
 * Direct mapping with consistent styling
 */
export function edgesToReactFlowEdges(edges: V2Edge[]): Edge[] {
  return edges.map((edge) => {
    const isFromGate = edge.source === 'divergence-gate';
    const toSE = /(^y3-se-)|(-se-)/.test(edge.target);
    const sourceHandle = isFromGate ? (toSE ? 'out-se' : 'out-ds') : undefined;

    return {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      sourceHandle, // only for gate edges
      type: 'step',
      animated: false,
      style: {
        stroke: 'rgba(255,255,255,0.85)',
        strokeWidth: 3,
        strokeLinecap: 'round'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'rgba(255,255,255,0.85)'
      }
    };
  });
}

/**
 * Apply manual layout - just set positions and call fitView once
 * No continuous layout fighting or algorithm interference
 */
export function applyManualLayout(
  blocks: V2RequirementBlock[],
  edges: V2Edge[],
  onApply: (nodes: Node<V2NodeData>[], edges: Edge[]) => void,
  fitView: () => void
): void {
  console.log('[ManualLayout] Applying direct positions for', blocks.length, 'blocks');
  
  const nodes = blocksToNodes(blocks);
  const reactFlowEdges = edgesToReactFlowEdges(edges);
  
  // Apply immediately - no delays or animations
  onApply(nodes, reactFlowEdges);
  
  // Fit view once after positions are set
  setTimeout(() => {
    fitView();
    console.log('[ManualLayout] Applied positions and fitted view');  
  }, 100);
}

/**
 * Validate that no nodes overlap (acceptance criteria)
 */
export function validateNoOverlaps(nodes: Node[]): { hasOverlaps: boolean; overlaps: Array<{ node1: string; node2: string }> } {
  const overlaps: Array<{ node1: string; node2: string }> = [];
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 80;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      // Check for overlap using bounding boxes
      const overlap = !(
        node1.position.x + NODE_WIDTH < node2.position.x ||
        node2.position.x + NODE_WIDTH < node1.position.x ||
        node1.position.y + NODE_HEIGHT < node2.position.y ||
        node2.position.y + NODE_HEIGHT < node1.position.y
      );
      
      if (overlap) {
        overlaps.push({ node1: node1.id, node2: node2.id });
      }
    }
  }
  
  return {
    hasOverlaps: overlaps.length > 0,
    overlaps
  };
}