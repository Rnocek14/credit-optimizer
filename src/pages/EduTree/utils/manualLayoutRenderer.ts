/**
 * Manual Layout Renderer - Pure position application
 * No algorithms, just direct coordinate mapping from database
 */

import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { V2RequirementBlock, V2Edge, EdgeKind } from '../data/seedDataV2';
import { applyDeterministicGrid, type Lane } from './deterministicGrid';
import { applyLanePacking, createLanePackingConfig, validateLanePacking } from './lanePackingUtils';
import { HeaderNodeData } from '../nodes/HeaderNode';
import { type GatePositions } from './divergence';

type SourceHandle = 'out' | 'out-se' | 'out-ds' | undefined;

export interface V2NodeData {
  title: string;
  ruleType: string;
  levelYear: number;
  area: string;
  creditsNeeded?: number;
  trackId?: string | null;
  programId?: string | null;
  // Add snake_case versions for dimming compatibility
  track_id?: string | null;
  program_id?: string | null;
  isVirtual?: boolean;
  junctionType?: 'program' | 'track';
  singleRailStraight?: boolean;
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
export function blocksToNodes(blocks: V2RequirementBlock[], singleRailStraight: boolean = false): Node<V2NodeData>[] {
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
      // Add snake_case versions for dimming compatibility
      track_id: block.track_id,
      program_id: block.program_id,
      isVirtual: block.is_virtual,
      junctionType: block.is_virtual ? (block.id.includes('program') ? 'program' : 'track') : undefined,
      singleRailStraight
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
 * Convert V2 edges to ReactFlow edges with educational edge kinds and header routing
 */
export function edgesToReactFlowEdges(
  edges: V2Edge[],
  blocks: V2RequirementBlock[],
  opts: {
    singleRailStraight: boolean;
    filterMode: string;
    useV2EdgeKinds: boolean;
    laneByTarget: Record<string, 'up' | 'down' | undefined>;
    gatePositions?: GatePositions;
  }
): Edge[] {
  const { singleRailStraight, filterMode, useV2EdgeKinds, laneByTarget, gatePositions } = opts;
  
  // Edge styling by kind (educational standards)
  const styleFor = (kind: EdgeKind) => {
    switch (kind) {
      case 'coreq':
        return { 
          strokeWidth: 3, 
          strokeDasharray: undefined, 
          markerStart: MarkerType.ArrowClosed, 
          markerEnd: MarkerType.ArrowClosed, 
          opacity: 1 
        };
      case 'advisory':
        return { 
          strokeWidth: 2, 
          strokeDasharray: '6 6', 
          markerStart: undefined, 
          markerEnd: MarkerType.ArrowClosed, 
          opacity: 0.65 
        };
      case 'gate':
        return { 
          strokeWidth: 4, 
          strokeDasharray: undefined, 
          markerStart: undefined, 
          markerEnd: MarkerType.ArrowClosed, 
          opacity: 1 
        };
      case 'prereq':
      default:
        return { 
          strokeWidth: 3, 
          strokeDasharray: undefined, 
          markerStart: undefined, 
          markerEnd: MarkerType.ArrowClosed, 
          opacity: 1 
        };
    }
  };

  // Check if headers will exist before remapping  
  const willHaveProgramHeaders = filterMode === 'compare-programs' && useV2EdgeKinds;
  const willHaveTrackHeaders = filterMode === 'compare-tracks' && useV2EdgeKinds;

  console.log('[EdgeFilter] Header availability check:', {
    filterMode,
    useV2EdgeKinds,
    willHaveProgramHeaders,
    willHaveTrackHeaders,
    gatePositions: gatePositions ? {
      showPG: gatePositions.showPG,
      showTG: gatePositions.showTG
    } : 'none'
  });

  // Reroute gate edges to header nodes in compare modes (only if headers exist)
  const remapGateTarget = (edge: V2Edge): string => {
    const kind: EdgeKind = edge.kind ?? (edge.source.startsWith('gate-') ? 'gate' : 'prereq');
    
    if (kind !== 'gate' || !useV2EdgeKinds) return edge.target;
    
    if (willHaveProgramHeaders) {
      const targetBlock = blocks.find(b => b.id === edge.target);
      if (targetBlock?.program_id === 'bs_cs') return 'program-header:bs_cs';
      if (targetBlock?.program_id === 'bs_it') return 'program-header:bs_it';
    } else if (willHaveTrackHeaders) {
      const targetBlock = blocks.find(b => b.id === edge.target);
      if (targetBlock?.track_id === 'se') return 'track-header:se';
      if (targetBlock?.track_id === 'ds') return 'track-header:ds';
    }
    
    return edge.target; // single-rail or fallback
  };

  // Create set of visible node IDs for edge validation
  const nodeById = new Map(blocks.map(b => [b.id, b]));
  const isVisible = (id: string) => {
    // Check if it's a header node (always visible when created)
    if (id.startsWith('program-header:') || id.startsWith('track-header:')) return true;
    
    // Check gate visibility with detailed logging
    if (id === 'gate-y2-programs') {
      const visible = gatePositions ? gatePositions.showPG : false;
      console.log('[NodeVisibility] Program gate visibility check:', { id, visible, gatePositions });
      return visible;
    }
    if (id === 'gate-y3-tracks') {
      const visible = gatePositions ? gatePositions.showTG : false;
      console.log('[NodeVisibility] Track gate visibility check:', { id, visible, gatePositions });
      return visible;
    }
    
    // Check if node exists in blocks
    return nodeById.has(id);
  };

  return edges.filter((edge) => {
    // Filter out edges for hidden gates
    if (gatePositions) {
      if (edge.source === 'gate-y2-programs' && !gatePositions.showPG) {
        console.log('[EdgeFilter] Filtering out edge from hidden program gate:', edge.source);
        return false;
      }
      if (edge.source === 'gate-y3-tracks' && !gatePositions.showTG) {
        console.log('[EdgeFilter] Filtering out edge from hidden track gate:', edge.source);
        return false;
      }
    }
    
    console.log('[EdgeFilter] Edge check:', {
      edgeId: edge.source + '->' + edge.target,
      isGateEdge: edge.source.startsWith('gate-'),
      gatePositions: gatePositions ? {
        showPG: gatePositions.showPG,
        showTG: gatePositions.showTG
      } : 'none'
    });
    
    // Never keep a metroGate edge if either endpoint isn't visible
    const kind: EdgeKind = edge.kind ?? (edge.source.startsWith('gate-') ? 'gate' : 'prereq');
    if (kind === 'gate' && edge.source.startsWith('gate-')) {
      const target = remapGateTarget(edge);
      if (!isVisible(edge.source) || !isVisible(target)) {
        console.log('[EdgeFilter] Filtering out invisible metro edge:', {
          source: edge.source,
          target,
          sourceVisible: isVisible(edge.source),
          targetVisible: isVisible(target)
        });
        return false;
      }
    }
    
    // Filter out any edge where either endpoint doesn't exist
    const originalTarget = edge.target;
    const remappedTarget = remapGateTarget(edge);
    if (!isVisible(edge.source) || !isVisible(remappedTarget)) {
      console.log('[EdgeFilter] Filtering out edge with missing endpoint:', {
        source: edge.source,
        originalTarget,
        remappedTarget,
        sourceVisible: isVisible(edge.source),
        targetVisible: isVisible(remappedTarget)
      });
      return false;
    }
    
    return true;
  }).map((edge) => {
    const kind: EdgeKind = edge.kind ?? (edge.source.startsWith('gate-') ? 'gate' : 'prereq');
    const target = remapGateTarget(edge);
    const styling = useV2EdgeKinds ? styleFor(kind) : {
      strokeWidth: 3,
      strokeDasharray: undefined,
      markerStart: undefined,
      markerEnd: MarkerType.ArrowClosed,
      opacity: 1
    };

    // Determine if this is a compare mode for smooth routing
    const isCompare = filterMode === 'compare-tracks' || filterMode === 'compare-programs';
    const isGateEdge = edge.source.startsWith('gate-');
    const isHeaderTarget = edge.target.startsWith('track-header:') || edge.target.startsWith('program-header:');

    // Compute sourceHandle for gate nodes based on target lane
    let sourceHandle: string | undefined = undefined;
    let sourcePosition: Position | undefined = undefined;
    
    if (isGateEdge) {
      // PRIORITY 1: Gate-to-header edges ALWAYS use middle-right handle
      if (isHeaderTarget) {
        sourceHandle = 'out';
        sourcePosition = Position.Right;
      }
      // PRIORITY 2: Single-rail mode uses middle-right handle
      else if (singleRailStraight) {
        sourceHandle = 'out';
        sourcePosition = Position.Right;
      }
      // PRIORITY 3: Compare modes with V2 edge kinds use middle-right for clean routing
      else if (isCompare && useV2EdgeKinds) {
        sourceHandle = 'out';
        sourcePosition = Position.Right;
      }
      // FALLBACK: Legacy lane-based routing
      else {
        const targetLane = laneByTarget[edge.target];
        
        if (targetLane === 'up') {
          sourceHandle = 'out-se';
          sourcePosition = Position.Top;
        } else if (targetLane === 'down') {
          sourceHandle = 'out-ds';
          sourcePosition = Position.Bottom;
        } else {
          sourceHandle = 'out';
          sourcePosition = Position.Right;
        }
      }
    }

    // Enhanced edge type selection - use metroGate for gate-to-header routing
    const edgeType = singleRailStraight ? 'straight' : 
                     (isCompare && isGateEdge && isHeaderTarget) ? 'metroGate' : 
                     (isCompare ? 'smoothstep' : 'step');

    // Refined arrow styling - smaller arrows for cleaner appearance (14-16px as recommended)
    const arrowSize = { width: 15, height: 15 };

    // Set targetHandle for gate-to-header edges
    const targetHandle = (isGateEdge && isHeaderTarget) ? 'in' : undefined;

    // Debug logging for handle assignment (development only)
    if (import.meta.env.DEV && edge.source.includes('y3-se-core')) {
      console.log('[DEBUG] Edge handle assignment:', {
        edgeId: `${edge.source}-${target}`,
        isGateEdge,
        isHeaderTarget,
        sourceHandle,
        targetHandle,
        edgeSource: edge.source,
        edgeTarget: target
      });
    }

    // Use deterministic ID for metro edges to prevent remount churn
    const edgeId = edgeType === 'metroGate' ? `metro:${edge.source}->${target}` : `${edge.source}-${target}`;
    
    const edgeObject: any = {
      id: edgeId,
      source: edge.source,
      target,
      type: edgeType,
      animated: false,
      
      style: { 
        stroke: 'rgba(255,255,255,0.85)', 
        strokeWidth: styling.strokeWidth, 
        strokeLinecap: 'round',
        strokeDasharray: styling.strokeDasharray,
        opacity: styling.opacity,
        // Subtle drop shadow for visual separation
        filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.35))'
      },
      // Rounded corners for smooth metro-style routing in compare modes
      pathOptions: isCompare ? { borderRadius: 18, offset: 8 } : undefined,
      markerStart: styling.markerStart ? { 
        type: styling.markerStart, 
        color: 'rgba(255,255,255,0.85)',
        ...arrowSize
      } : undefined,
      markerEnd: styling.markerEnd ? { 
        type: styling.markerEnd, 
        color: 'rgba(255,255,255,0.85)',
        ...arrowSize
      } : undefined,
      // Add endpoint label for metro edges
      data: edgeType === 'metroGate' && isHeaderTarget ? {
        endpointLabel: sourceHandle === 'out-se' ? 'SE' : sourceHandle === 'out-ds' ? 'DS' : null
      } : undefined
    };

    // Only set handles when they are actually needed and valid - comprehensive null check
    if (typeof sourceHandle === 'string' && 
        sourceHandle !== 'null' && 
        sourceHandle !== '' && 
        sourceHandle !== 'undefined' && 
        sourceHandle !== null &&
        sourceHandle !== 'false' &&
        sourceHandle.length > 0 &&
        !['null', 'undefined', 'false', ''].includes(sourceHandle)) {
      edgeObject.sourceHandle = sourceHandle;
    }
    if (sourcePosition !== undefined) {
      edgeObject.sourcePosition = sourcePosition;
    }
    
    // Guard for metro edge target handles - only set when header target is confirmed
    if (edgeType === 'metroGate' && isHeaderTarget && targetHandle === 'in') {
      edgeObject.targetHandle = targetHandle;
    } else if (targetHandle !== undefined && edgeType !== 'metroGate') {
      edgeObject.targetHandle = targetHandle;
    }

    return edgeObject;
  });
}

/**
 * Create header nodes for lane identification in compare modes
 */
function createHeaderNodes(opts: {
  filterMode: string;
  gatePositions?: GatePositions;
  singleRailStraight: boolean;
  useV2EdgeKinds: boolean;
}): Node[] {
  const { filterMode, gatePositions, singleRailStraight, useV2EdgeKinds } = opts;

  // Always create headers in compare modes when V2 edge kinds are enabled
  // Remove singleRailStraight restriction for better header visibility
  if (!useV2EdgeKinds) return []; 

  // use standard lane positioning
  const Y_UP = 240;
  const Y_DOWN = 480;
  const X_OFFSET = -60; // offset headers left of gate position

  // Create headers when in appropriate compare mode, regardless of gate visibility
  if (filterMode === 'compare-programs') {
    // Use default position if gates not available
    const x = gatePositions?.pgX ? gatePositions.pgX + X_OFFSET : 340; 
    return [
      {
        id: 'program-header:bs_cs',
        type: 'header',
        position: { x, y: Y_UP - 70 },
        data: { 
          label: 'BS Computer Science',
          program_id: 'bs_cs', // Add metadata for dimming
          track_id: null
        },
        draggable: false,
        selectable: false,
        style: { zIndex: 1000 },
        targetPosition: Position.Left
      },
      {
        id: 'program-header:bs_it',
        type: 'header',
        position: { x, y: Y_DOWN + 70 },
        data: { 
          label: 'BS Information Technology',
          program_id: 'bs_it', // Add metadata for dimming
          track_id: null
        },
        draggable: false,
        selectable: false,
        style: { zIndex: 1000 },
        targetPosition: Position.Left
      }
    ];
  }

  if (filterMode === 'compare-tracks') {
    // Use default position if gates not available
    const x = gatePositions?.tgX ? gatePositions.tgX + X_OFFSET : 840;
    return [
      {
        id: 'track-header:se',
        type: 'header', 
        position: { x, y: Y_UP - 70 },
        data: { 
          label: 'Software Engineering',
          track_id: 'se', // Add metadata for dimming
          program_id: null
        },
        draggable: false,
        selectable: false,
        style: { zIndex: 1000 },
        targetPosition: Position.Left
      },
      {
        id: 'track-header:ds',
        type: 'header',
        position: { x, y: Y_DOWN + 70 },
        data: { 
          label: 'Data Science',
          track_id: 'ds', // Add metadata for dimming
          program_id: null
        },
        draggable: false,
        selectable: false,
        style: { zIndex: 1000 },
        targetPosition: Position.Left
      }
    ];
  }

  return []; // No headers for other modes
}
/**
 * Apply manual layout - just set positions and call fitView once
 * No continuous layout fighting or algorithm interference
 */
export function applyManualLayout(
  blocks: V2RequirementBlock[],
  edges: V2Edge[],
  onApply: (nodes: Node[], edges: Edge[]) => void,
  fitView: () => void,
  useGridAnchors: boolean = false,
  singleRailStraight: boolean = false,
  filterMode: string = '',
  useV2EdgeKinds: boolean = false,
  gatePositions?: GatePositions
): void {
  console.log('[ManualLayout] Applying direct positions for', blocks.length, 'blocks', 
    useGridAnchors ? '(with grid anchors)' : '(manual positions)',
    useV2EdgeKinds ? '(with V2 edge kinds)' : '(legacy edges)');
      console.log('[ManualLayout] Parameters:', {
        singleRailStraight, 
        filterMode, 
        useV2EdgeKinds,
        gatePositions: gatePositions ? {
          showPG: gatePositions.showPG,
          showTG: gatePositions.showTG,
          pgX: gatePositions.pgX,
          tgX: gatePositions.tgX
        } : null
      });
      
      if (!useV2EdgeKinds && (filterMode === 'compare-tracks' || filterMode === 'compare-programs')) {
        console.warn('[ManualLayout] WARNING: V2 edge kinds disabled in compare mode - headers won\'t be created!');
      }
  
  // Create column anchors with dynamic track spreading
  const COL_W = 280, COL_GAP = 120, TRACK_SPREAD = 240;
  const y3Center = 600 + COL_W + COL_GAP; // Center between Y3L and Y3R
  const cols = { 
    y1: 200, 
    pg: 400, 
    y2: 600, 
    tg: 900, 
    y3: y3Center,  // Use center for header positioning
    y4: y3Center   // Y4 maintains same center as Y3
  };
  
  // Create header nodes with dynamic positioning based on gate visibility
  const headerNodes = createHeaderNodes({
    filterMode,
    gatePositions,
    singleRailStraight,
    useV2EdgeKinds
  });
  
  // Create nodes with phase A planning data
  const nodes = blocksToNodes(blocks, singleRailStraight).map(node => {
    const block = blocks.find(b => b.id === node.id);
    if (!block || block.is_virtual) return node;
    
    // Compute phase A plan for future grid mode
    const lane: 'up' | 'down' | undefined = 
      block.track_id === 'se' || block.program_id === 'bs_cs' ? 'up' :
      block.track_id === 'ds' || block.program_id === 'bs_it' ? 'down' : 
      undefined;
    
    const col = block.level_year;
    
    // Original manual coordinates with dynamic track spreading
    const manualX = { 1: 200, 2: 600, 3: y3Center, 4: y3Center }[col] || 600;
    const manualY = lane === 'up' ? (col === 3 ? 240 : col === 4 ? 80 : 240) :
                    lane === 'down' ? (col === 3 ? 480 : col === 4 ? 640 : 480) :
                    360; // shared/gate row
    
    // Apply deterministic grid if enabled
    const gridCoords = applyDeterministicGrid(col, lane, manualX, manualY, useGridAnchors, singleRailStraight);
    
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
  
  // Apply vertical stacking for single-rail straight mode to prevent overlaps
  if (useGridAnchors && singleRailStraight) {
    const CENTER_BY_YEAR: Record<number, number> = { 1: 360, 2: 360, 3: 360, 4: 360 };
    
    // Deterministic vertical order by year and type (so SE/DS look identical)
    const ORDER_BY_YEAR_AND_TYPE: Record<number, Record<string, number>> = {
      1: { foundation: 0, core: 1, gen_ed: 2 },          // Y1: foundation on spine, core below, gen_ed further
      2: { core: 0, elective_pool: 1, gen_ed: 2 },       // Y2: core on spine, electives below
      3: { track_core: 0, elective_pool: 1 },            // Y3: track core on spine, electives below  
      4: { capstone: 0 },                                // Y4: capstone on spine
    };
    
    const orderFor = (year: number, type?: string) =>
      (ORDER_BY_YEAR_AND_TYPE[year]?.[type ?? ''] ?? 99);

    // group by year (skip virtual nodes)
    const byYear = new Map<number, typeof nodes>();
    nodes.forEach(n => {
      if (n.data?.isVirtual) return;
      const col = n.data?.phaseAPlan?.col;
      if (!col) return;
      if (!byYear.has(col)) byYear.set(col, []);
      byYear.get(col)!.push(n);
    });

    // symmetrical fan-out around center with adaptive spacing
    byYear.forEach((list, year) => {
      // stable sort: year-specific order, then id
      list.sort((a, b) => {
        const ya = a.data?.phaseAPlan?.col ?? 0;
        const yb = b.data?.phaseAPlan?.col ?? 0;
        const pa = orderFor(ya, a.data?.ruleType);
        const pb = orderFor(yb, b.data?.ruleType);
        return pa - pb || String(a.id).localeCompare(String(b.id));
      });

      // Adaptive row gap - more spacing for crowded years
      const baseGap = 120;
      const ROW_GAP = Math.min(180, baseGap + Math.max(0, list.length - 3) * 12);

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
  
  // Build lane mapping for edge routing
  const laneByTarget = buildLaneMapping(blocks);
  
  const reactFlowEdges = edgesToReactFlowEdges(edges, blocks, {
    singleRailStraight,
    filterMode,
    useV2EdgeKinds,
    laneByTarget,
    gatePositions
  });
  
  // Combine regular nodes with header nodes
  let allNodes = [...nodes, ...headerNodes];
  
  // Apply lane packing to eliminate overlaps if using grid anchors and not in single-rail mode
  if (useGridAnchors && !singleRailStraight) {
    console.log('[ManualLayout] Applying lane packing to eliminate overlaps');
    const lanePackingConfig = createLanePackingConfig();
    allNodes = applyLanePacking(allNodes, lanePackingConfig);
    
    // Validate packing results in development
    if (process.env.NODE_ENV === 'development') {
      const validation = validateLanePacking(allNodes);
      if (validation.hasOverlaps) {
        console.warn('[ManualLayout] Lane packing did not eliminate all overlaps:', validation.overlaps);
      } else {
        console.log('[ManualLayout] ✓ Lane packing successfully eliminated overlaps');
      }
    }
  }
  
  // ULTRA-DEFENSIVE handle sanitization - prevent ALL forms of corruption
  const cleanSource = (h: unknown): SourceHandle => {
    // COMPREHENSIVE validation - catch EVERY possible problematic case
    
    // 1. Type validation
    if (typeof h !== 'string') {
      if (import.meta.env.DEV && h !== undefined) {
        console.error('[SANITIZER] Non-string sourceHandle:', { value: h, type: typeof h });
      }
      return undefined;
    }
    
    // 2. Null-string variations (the main culprit)
    const nullStrings = ['null', 'undefined', 'NaN', 'false', 'true'];
    if (nullStrings.includes(h)) {
      if (import.meta.env.DEV) {
        console.error('[SANITIZER] Null-string sourceHandle detected:', h);
      }
      return undefined;
    }
    
    // 3. Empty/whitespace validation
    if (h === '' || h.trim() === '' || h.length === 0) {
      if (import.meta.env.DEV) {
        console.error('[SANITIZER] Empty sourceHandle detected:', { value: h, length: h.length });
      }
      return undefined;
    }
    
    // 4. Pattern matching for corruption
    const corruptionPatterns = [
      /null/i,
      /undefined/i,
      /NaN/i,
      /^\s*$/,
      /^[0-9]+$/,  // Pure numbers
      /[{}[\]()]/,  // Object/array remnants
    ];
    
    const hasCorruption = corruptionPatterns.some(pattern => pattern.test(h));
    if (hasCorruption) {
      if (import.meta.env.DEV) {
        console.error('[SANITIZER] Corrupted sourceHandle pattern detected:', h);
      }
      return undefined;
    }
    
    // 5. Strict whitelist - ONLY allow known good values
    const validHandles: SourceHandle[] = ['out', 'out-se', 'out-ds'];
    if (validHandles.includes(h as SourceHandle)) {
      return h as SourceHandle;
    }
    
    // 6. Everything else is invalid and potentially corrupting
    if (import.meta.env.DEV) {
      console.error('[SANITIZER] Unknown sourceHandle value rejected:', { 
        value: h, 
        type: typeof h,
        length: h.length,
        charCodes: Array.from(h).map(c => c.charCodeAt(0))
      });
    }
    
    return undefined;
  };

  const cleanTarget = (h: unknown): string | undefined => {
    // COMPREHENSIVE validation for target handles
    
    // 1. Type validation
    if (typeof h !== 'string') {
      if (import.meta.env.DEV && h !== undefined) {
        console.error('[SANITIZER] Non-string targetHandle:', { value: h, type: typeof h });
      }
      return undefined;
    }
    
    // 2. Null-string variations
    const nullStrings = ['null', 'undefined', 'NaN', 'false', 'true'];
    if (nullStrings.includes(h)) {
      if (import.meta.env.DEV) {
        console.error('[SANITIZER] Null-string targetHandle detected:', h);
      }
      return undefined;
    }
    
    // 3. Empty/whitespace validation
    if (h === '' || h.trim() === '' || h.length === 0) {
      if (import.meta.env.DEV) {
        console.error('[SANITIZER] Empty targetHandle detected:', { value: h, length: h.length });
      }
      return undefined;
    }
    
    // 4. Pattern matching for corruption
    const corruptionPatterns = [
      /null/i,
      /undefined/i,
      /NaN/i,
      /^\s*$/,
      /^[0-9]+$/,  // Pure numbers
      /[{}[\]()]/,  // Object/array remnants
    ];
    
    const hasCorruption = corruptionPatterns.some(pattern => pattern.test(h));
    if (hasCorruption) {
      if (import.meta.env.DEV) {
        console.error('[SANITIZER] Corrupted targetHandle pattern detected:', h);
      }
      return undefined;
    }
    
    // 5. Strict whitelist - ONLY allow 'in' for targets
    if (h === 'in') {
      return 'in';
    }
    
    // 6. Everything else is invalid
    if (import.meta.env.DEV) {
      console.error('[SANITIZER] Invalid targetHandle value rejected:', { 
        value: h, 
        type: typeof h,
        length: h.length,
        charCodes: Array.from(h).map(c => c.charCodeAt(0))
      });
    }
    
    return undefined;
  };

  const sanitizedEdges = reactFlowEdges
    .map(e => {
      const sourceHandle = cleanSource(e.sourceHandle);
      const targetHandle = cleanTarget(e.targetHandle);
      
      // Skip edges with invalid handles completely
      if (sourceHandle === undefined && e.sourceHandle !== undefined) {
        if (import.meta.env.DEV) {
          console.warn('[EDGE SKIP] Dropping edge with invalid sourceHandle:', {
            edgeId: e.id,
            sourceHandle: e.sourceHandle,
            source: e.source,
            target: e.target
          });
        }
        return null; // Skip this edge entirely
      }
      
      if (targetHandle === undefined && e.targetHandle !== undefined) {
        if (import.meta.env.DEV) {
          console.warn('[EDGE SKIP] Dropping edge with invalid targetHandle:', {
            edgeId: e.id,
            targetHandle: e.targetHandle,
            source: e.source,
            target: e.target
          });
        }
        return null; // Skip this edge entirely
      }
      
      // Build sanitized edge, completely omitting keys that are undefined
      const sanitizedEdge: any = { ...e };
      
      // Only set handles if they are valid
      if (sourceHandle !== undefined) {
        sanitizedEdge.sourceHandle = sourceHandle;
      } else {
        delete sanitizedEdge.sourceHandle;
      }
      
      if (targetHandle !== undefined) {
        sanitizedEdge.targetHandle = targetHandle;
      } else {
        delete sanitizedEdge.targetHandle;
      }
      
      return sanitizedEdge;
    })
    .filter(Boolean); // Remove null entries from dropped edges
  
  // Apply immediately - no delays or animations
  console.log('[ManualLayout] Node breakdown:', {
    blocks: nodes.length,
    headers: headerNodes.length,
    total: allNodes.length
  });
  console.log('[ManualLayout] Edge validation complete, delivering', sanitizedEdges.length, 'edges to React Flow');
  
  // Final validation - log any remaining problematic edges
  if (import.meta.env.DEV) {
    const problematicEdges = sanitizedEdges.filter(e => 
      e.sourceHandle === 'null' || e.targetHandle === 'null'
    );
    if (problematicEdges.length > 0) {
      console.error('[CRITICAL] Still have problematic edges after sanitization:', problematicEdges);
    }
  }
  
  onApply(allNodes, sanitizedEdges);
  
  // Debug: expose to window for validation tests (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).__flowNodes__ = allNodes;
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