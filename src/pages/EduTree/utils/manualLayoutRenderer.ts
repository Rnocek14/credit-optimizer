/**
 * Manual Layout Renderer - Pure position application
 * No algorithms, just direct coordinate mapping from database
 */

import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { V2RequirementBlock, V2Edge } from '../data/seedDataV2';
import { applyDeterministicGrid, type Lane } from './deterministicGrid';

type SourceHandle = 'out-se' | 'out-ds' | undefined;

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
  singleTrackStraight?: boolean;
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
function buildLaneMapping(blocks: V2RequirementBlock[]): Record<string, Lane> {
  const laneByTarget: Record<string, Lane> = {};

  for (const block of blocks) {
    // Prefer explicit lane from seed
    const explicit = (block as any).lane as Lane | undefined;

    // Fallback: derive from program/track IDs
    const derived: Lane | undefined =
      block.track_id === 'se' || block.program_id === 'bs_cs' ? 'up' :
      block.track_id === 'ds' || block.program_id === 'bs_it' ? 'down' :
      undefined;

    const lane = explicit ?? derived;
    if (lane) laneByTarget[block.id] = lane;
  }

  return laneByTarget;
}

/**
 * Convert V2 edges to ReactFlow edges with multi-gate support
 */
export function edgesToReactFlowEdges(edges: V2Edge[], blocks: V2RequirementBlock[], singleTrackStraight: boolean = false): Edge[] {
  const laneByTarget = buildLaneMapping(blocks);

  return edges.map((edge) => {
    const isFromGate = edge.source.startsWith('gate-');
    const targetLane = laneByTarget[edge.target];

    // Compute sourceHandle for gate nodes based on target lane
    let sourceHandle: string | undefined = undefined;
    if (edge.source.startsWith('gate-')) {
      if (singleTrackStraight) {
        // In single-track straight mode, no source handle for horizontal flow
        sourceHandle = undefined;
      } else {
        const targetBlock = blocks.find(b => b.id === edge.target);
        const targetLane = laneByTarget[edge.target];
        if (targetLane) {
          sourceHandle = targetLane === 'up' ? 'out-se' : 'out-ds';
        } else if (targetBlock?.track_id === 'se') {
          sourceHandle = 'out-se';
        } else if (targetBlock?.track_id === 'ds') {
          sourceHandle = 'out-ds';
        }
        
        if (!sourceHandle && !edge.target.startsWith('gate-')) {
          console.warn('[V2] Gate edge missing lane for target:', edge.target, targetBlock?.track_id);
        }
      }
    }

    return {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      sourceHandle, // Always computed, never from seed
      type: 'step',
      animated: false,
      style: { stroke: 'rgba(255,255,255,0.85)', strokeWidth: 3, strokeLinecap: 'round' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.85)' }
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
  fitView: () => void,
  useGridAnchors: boolean = false,
  singleTrackStraight: boolean = false
): void {
  console.log('[ManualLayout] Applying direct positions for', blocks.length, 'blocks', 
    useGridAnchors ? '(with grid anchors)' : '(manual positions)');
  
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
    
    // Original manual coordinates as fallback
    const manualX = { 1: 200, 2: 600, 3: 1300, 4: 1700 }[col] || 600;
    const manualY = lane === 'up' ? (col === 3 ? 240 : col === 4 ? 80 : 240) :
                    lane === 'down' ? (col === 3 ? 480 : col === 4 ? 640 : 480) :
                    360; // shared/gate row
    
    // Apply deterministic grid if enabled
    const gridCoords = applyDeterministicGrid(col, lane, manualX, manualY, useGridAnchors, singleTrackStraight);
    
    if (useGridAnchors && process.env.NODE_ENV === 'development') {
      console.log(`[Grid] ${node.id}: lane=${lane}, col=${col}, coords=(${gridCoords.x},${gridCoords.y})`);
    }
    
    return {
      ...node,
      data: {
        ...node.data,
        phaseAPlan: { lane, col, x: gridCoords.x, y: gridCoords.y }
      }
    };
  });
  
  // Apply vertical stacking for single-track straight mode to prevent overlaps
  if (useGridAnchors && singleTrackStraight) {
    const CENTER_BY_YEAR: Record<number, number> = { 1: 360, 2: 360, 3: 360, 4: 360 };
    const ROW_GAP = 140; // generous gap to avoid overlap

    // Priority helps put "Core" near the midline
    const PRIORITY: Record<string, number> = {
      foundation: 0,
      core: 1,          // CS Core, IT Core, SE/DS Core
      track_core: 2,
      elective_pool: 3, // electives
      gen_ed: 4,
      capstone: 5,
    };

    // group by year (skip virtual nodes)
    const byYear = new Map<number, typeof nodes>();
    nodes.forEach(n => {
      if (n.data?.isVirtual) return;
      const col = n.data?.phaseAPlan?.col;
      if (!col) return;
      if (!byYear.has(col)) byYear.set(col, []);
      byYear.get(col)!.push(n);
    });

    // symmetrical fan-out around center
    byYear.forEach((list, year) => {
      // stable sort: priority, then id
      list.sort((a, b) => {
        const pa = PRIORITY[a.data?.ruleType ?? ''] ?? 99;
        const pb = PRIORITY[b.data?.ruleType ?? ''] ?? 99;
        return pa - pb || String(a.id).localeCompare(String(b.id));
      });

      const centerY = CENTER_BY_YEAR[year] ?? 360;
      const n = list.length;
      for (let i = 0; i < n; i++) {
        const offset = (i - (n - 1) / 2) * ROW_GAP;
        const p = list[i].data!.phaseAPlan!;
        p.y = centerY + offset;   // update plan Y
        // Also update the actual position
        list[i].position.y = p.y;
      }
    });
  }
  
  const reactFlowEdges = edgesToReactFlowEdges(edges, blocks, singleTrackStraight);
  
  // Final sanitizer: ensure no bad handles survive regardless of source
  const clean = (h: unknown): SourceHandle =>
    h === 'out-se' || h === 'out-ds' ? (h as 'out-se'|'out-ds') : undefined;

  const sanitizedEdges = reactFlowEdges.map(e => ({
    ...e,
    sourceHandle: clean(e.sourceHandle),
    targetHandle: clean((e as any).targetHandle) // we don't use targetHandle but sanitize anyway
  }));
  
  // Apply immediately - no delays or animations
  onApply(nodes, sanitizedEdges);
  
  // Debug: expose to window for validation tests (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).__flowNodes__ = nodes;
    (window as any).__flowEdges__ = sanitizedEdges;
  }
  
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