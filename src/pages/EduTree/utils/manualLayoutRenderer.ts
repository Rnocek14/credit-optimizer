/**
 * Manual Layout Renderer - Pure position application
 * No algorithms, just direct coordinate mapping from database
 */

import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { V2RequirementBlock, V2Edge } from '../data/seedDataV2';

export interface V2NodeData {
  title: string;
  ruleType: string;
  levelYear: number;
  area: string;
  creditsNeeded?: number;
  trackId?: string | null;
  programId?: string | null;
  isVirtual?: boolean;
  junctionType?: 'program' | 'track';
  phaseAPlan?: {
    lane: 'up' | 'down' | undefined;
    col: number;
    x: number;
    y: number;
  };
  [key: string]: unknown; // Index signature for ReactFlow compatibility
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
      programId: block.program_id,
      isVirtual: block.is_virtual,
      junctionType: block.is_virtual ? (block.id.includes('program') ? 'program' : 'track') : undefined
    },
    // Add default handles for edge connections
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false, // Prevent user from moving manually positioned nodes
    selectable: true
  }));
}

/**
 * Build lane mapping from blocks data (data-driven approach)
 */
function buildLaneMapping(blocks: V2RequirementBlock[]): Record<string, 'up' | 'down'> {
  const laneByTarget: Record<string, 'up' | 'down'> = {};
  
  for (const block of blocks) {
    // Derive lane from program/track IDs
    const lane = 
      block.track_id === 'se' || block.program_id === 'bs_cs' ? 'up' :
      block.track_id === 'ds' || block.program_id === 'bs_it' ? 'down' : 
      undefined;
    
    if (lane) {
      laneByTarget[block.id] = lane;
    }
  }
  
  return laneByTarget;
}

/**
 * Convert V2 edges to ReactFlow edges with multi-gate support
 */
export function edgesToReactFlowEdges(edges: V2Edge[], blocks: V2RequirementBlock[]): Edge[] {
  const laneByTarget = buildLaneMapping(blocks);
  
  return edges.map((edge) => {
    const isFromGate = edge.source.startsWith('gate-');
    const targetLane = laneByTarget[edge.target];
    
    // Only set sourceHandle for gate edges going to nodes with lanes
    // Do NOT set sourceHandle for edges going TO gates or gates without target lanes
    let sourceHandle: string | undefined = undefined;
    if (isFromGate && targetLane && !edge.target.startsWith('gate-')) {
      sourceHandle = targetLane === 'up' ? 'out-se' : 'out-ds';
    }

    return {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      sourceHandle, // only for gate->node edges with valid lanes
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
  
  // Create nodes with phase A planning data
  const nodes = blocksToNodes(blocks).map(node => {
    const block = blocks.find(b => b.id === node.id);
    if (!block || block.is_virtual) return node;
    
    // Compute phase A plan for future grid mode
    const lane: 'up' | 'down' | undefined = 
      block.track_id === 'se' || block.program_id === 'bs_cs' ? 'up' :
      block.track_id === 'ds' || block.program_id === 'bs_it' ? 'down' : 
      undefined;
    
    const col = block.level_year;
    const colX = { 1: 200, 2: 600, 3: 1300, 4: 1700 }[col] || 600;
    const rowY = lane === 'up' ? (col === 3 ? 240 : col === 4 ? 80 : 240) :
                 lane === 'down' ? (col === 3 ? 480 : col === 4 ? 640 : 480) :
                 360; // shared/gate row
    
    return {
      ...node,
      data: {
        ...node.data,
        phaseAPlan: { lane, col, x: colX, y: rowY }
      }
    };
  });
  
  const reactFlowEdges = edgesToReactFlowEdges(edges, blocks);
  
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