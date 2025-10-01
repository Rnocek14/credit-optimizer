/**
 * Manual Layout Renderer - Pure position application
 * No algorithms, just direct coordinate mapping from database
 */

import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { V2RequirementBlock, V2Edge, EdgeKind } from '../data/seedDataV2';
import type { CourseOption } from '../hooks/useRequirementOptionsBatch';

type RFNode = Node;
type RFEdge = Edge;

export function buildVisibleEdges(nodes: RFNode[], rawEdges: RFEdge[]) {
  const nodeMap = new Map(nodes.filter(n => !n.hidden).map(n => [n.id, n]));
  const safeEdges = rawEdges.filter(e => {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    if (!s || !t) return false;
    if ((s.data?.is_header || s.data?.is_ghost) || (t.data?.is_header || t.data?.is_ghost)) return false;
    return true;
  });
  return safeEdges;
}
import { applyDeterministicGrid, getReservedColsByYear, type Lane } from './deterministicGrid';
import { laneXs, applyLanePackingFinal, NODE_HEIGHT, LANE_GAP } from './layoutTokens';
import { HeaderNodeData } from '../nodes/HeaderNode';
import { type GatePositions } from './divergence';
import { createGhostNodeData } from './ghostNodeInjector';

type SourceHandle = 'out' | 'out-se' | 'out-ds' | undefined;

import { fixHandle } from './edgeCleanup';

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
  // Ghost node specific data
  isEmptyYear?: boolean;
  year?: number;
  reason?: 'accelerated' | 'no-track' | 'direct-progression';
  nextYear?: number;
  programName?: string;
  phaseAPlan?: {
    lane: 'up' | 'down' | undefined;
    col: number;
    x: number;
    y: number;
  };
  // Phase 2: Marketplace integration fields
  optionsCount?: number;
  hasAceCredit?: boolean;
  hasClep?: boolean;
  selectedCourse?: {
    id: string;
    provider: string;
    title: string;
    cost: number;
  };
  planProgress?: {
    creditsEarned: number;
    creditsNeeded: number;
  };
  // Course-aware fields (Phase A complete)
  options?: any[]; // Array of CourseOption objects
  transferRules?: any[]; // Array of transfer rule objects
  selectedCourseId?: string; // User's selected course ID
  // Data version for React identity tracking
  __v?: string;
  [key: string]: unknown; // Index signature for ReactFlow compatibility
}

/**
 * Convert V2 blocks to ReactFlow nodes with direct position mapping
 * No layout computation - just applies stored coordinates
 */
export function blocksToNodes(
  blocks: V2RequirementBlock[], 
  singleRailStraight: boolean = false,
  selectedPrograms?: string[],
  dataVersion?: string,
  optionsByBlock?: Map<string, any[]>,
  transferRulesByBlock?: Map<string, any[]>,
  userPlanSelections?: any[]
): Node<V2NodeData>[] {
  
  // Course-aware: Build selections map for quick lookup
  const selectionsByBlock = new Map<string, any>();
  if (userPlanSelections) {
    userPlanSelections.forEach(sel => {
      const blockId = String(sel.requirement_id ?? sel.block_id ?? '').toLowerCase();
      if (blockId) selectionsByBlock.set(blockId, sel);
    });
  }
  
  // GUARD B — Render-time kill switch: Drop any remaining ghosts for non-selected programs
  let safeBlocks = blocks;
  if (selectedPrograms && selectedPrograms.length > 0) {
    const selected = new Set(selectedPrograms);
    const beforeGhosts = blocks.filter(b => b.is_empty_year === true);
    
    safeBlocks = blocks.filter(b => {
      const isGhost = b.is_empty_year === true;
      if (!isGhost) return true;
      if (!b.program_id) return false;
      return selected.has(b.program_id); // render only ghosts for selected programs
    });
    
    const afterGhosts = safeBlocks.filter(b => b.is_empty_year === true);
    console.log('[GuardB] Ghost filtering applied:', {
      selectedPrograms,
      before: beforeGhosts.map(g => ({ id: g.id, program_id: g.program_id })),
      after: afterGhosts.map(g => ({ id: g.id, program_id: g.program_id }))
    });
  }
  
  return safeBlocks.map(block => {
    const baseNode = {
      id: block.id,
      position: {
        x: block.position_x,
        y: block.position_y
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
      selectable: true
    };

    if (block.is_empty_year) {
      const ghostData = createGhostNodeData(
        block.program_id || '',
        block.level_year,
        block.level_year + 1
      );
      
      return {
        ...baseNode,
        type: 'emptyYear',
        data: {
          title: block.title,
          ruleType: block.rule_type,
          levelYear: block.level_year,
          area: block.area,
          isEmptyYear: true,
          ...ghostData
        } as V2NodeData
      };
    }

    // Helper to convert to number without masking undefined - MORE PERMISSIVE
    const asNum = (v: any) => {
      // Explicitly handle undefined/null
      if (v === null || v === undefined) return undefined;
      // Handle empty string
      if (v === '') return undefined;
      // Try to convert to number
      const num = Number(v);
      // Only reject if NaN, but accept 0
      if (Number.isNaN(num)) {
        console.warn('[blocksToNodes] Could not convert to number:', { blockId: block.id, value: v, type: typeof v });
        return undefined;
      }
      return num;
    };
    
    // Build marketplace signature for reliable re-render detection
    const oc = asNum((block as any).optionsCount);
    const ace = (block as any).hasAceCredit ? 1 : 0;
    const clep = (block as any).hasClep ? 1 : 0;
    const sel = (block as any).selectedCourse?.id ?? '∅';
    const mpSig = `${oc ?? '∅'}|${ace}|${clep}|${sel}`;
    
    // Course-aware: Get options and transfer rules for this block
    // Try all known keys (uuid, slug, dbId) for map lookup
    const idKey = String(block.id || '').toLowerCase();
    const slugKey = String((block as any).slug || '').toLowerCase();
    const dbIdKey = String((block as any).dbId || (block as any).db_id || '').toLowerCase();
    const keys = [idKey, slugKey, dbIdKey].filter(Boolean);
    const pickFromMap = <T,>(m?: Map<string, T>) => {
      if (!m) return undefined as unknown as T;
      for (const k of keys) { const v = m.get(k); if (v) return v; }
      return undefined as unknown as T;
    };
    const courseOptions = pickFromMap<CourseOption[]>(optionsByBlock) ?? [];
    const transferRules = pickFromMap<any[]>(transferRulesByBlock) ?? [];
    const selection = pickFromMap<any>(selectionsByBlock);
    
    // Build transfer rules map by course ID for efficient lookup
    const byCourse = new Map<string, any>();
    transferRules.forEach((r: any) => {
      const courseId = String(r.courseId ?? r.course_id ?? '');
      if (courseId) byCourse.set(courseId, r);
    });
    
    // Merge course options with transfer state and sort by priority
    const options = courseOptions
      .map((c: any) => {
        const tr = byCourse.get(c.courseId) || {};
        return {
          ...c,
          transfer: {
            state: tr.transferState ?? tr.transfer_state ?? 'unknown',
            score: tr.score ?? undefined
          }
        };
      })
      .sort((a: any, b: any) =>
        // Sort by: transfer score desc, ACE desc, CLEP desc
        (b.transfer?.score ?? 0) - (a.transfer?.score ?? 0) ||
        (b.evidence?.ace ? 1 : 0) - (a.evidence?.ace ? 1 : 0) ||
        (b.evidence?.clep ? 1 : 0) - (a.evidence?.clep ? 1 : 0)
      )
      .slice(0, 3); // Take top 3
    
    // [ACCEPTANCE TEST] Log enrichment for first 5 blocks with data
    if (process.env.NODE_ENV === 'development' && (courseOptions.length > 0 || transferRules.length > 0 || selection)) {
      const blockIndex = safeBlocks.indexOf(block);
      if (blockIndex < 5) {
        console.log('[blocksToNodes][ENRICH]', {
          blockId: block.id,
          blockIndex,
          optionsCount: courseOptions.length,
          transferRulesCount: transferRules.length,
          selectedCourseId: selection?.course_id,
          sampleOption: courseOptions[0]?.code,
          sampleTransfer: transferRules[0]?.transferState,
          mergedOptions: options.length,
          topOption: options[0]?.code,
          topTransferState: options[0]?.transfer?.state,
          dataVersion
        });
      }
    }
    
    // DIAGNOSTIC: Log marketplace data mapping - MORE DETAILED
    if (process.env.NODE_ENV === 'development') {
      const blockIndex = safeBlocks.indexOf(block);
      // Log first 10 blocks AND any block with marketplace data
      if (blockIndex < 10 || oc !== undefined) {
        console.log('[blocksToNodes] Marketplace data mapping:', {
          blockId: block.id,
          blockIndex,
          rawOptionsCount: (block as any).optionsCount,
          rawType: typeof (block as any).optionsCount,
          convertedOc: oc,
          ocIsFinite: Number.isFinite(oc),
          ocIsZero: oc === 0,
          hasAceCredit: (block as any).hasAceCredit,
          hasClep: (block as any).hasClep,
          mpSig,
          willRenderPill: Number.isFinite(oc) && oc! > 0
        });
      }
    }
    
    const nodeData: V2NodeData = {
      id: block.id,
      block: {
        id: block.id,
        creditsNeeded: block.credits_needed ?? null,
        catalogCourseIds: (block as any).catalogCourseIds
      },
      title: block.title,
      ruleType: block.rule_type,
      levelYear: block.level_year,
      area: block.area,
      creditsNeeded: block.credits_needed,
      trackId: block.track_id,
      programId: block.program_id,
      track_id: block.track_id,
      program_id: block.program_id,
      isVirtual: block.is_virtual,
      junctionType: block.is_virtual ? (block.id.includes('program') ? 'program' : 'track') : undefined,
      singleRailStraight,
      // Marketplace fields from enriched blocks - DON'T mask undefined
      optionsCount: oc,
      hasAceCredit: (block as any).hasAceCredit ?? undefined,
      hasClep: (block as any).hasClep ?? undefined,
      selectedCourse: (block as any).selectedCourse,
      // Marketplace signature for re-render detection
      mpSig,
      // Course-aware: Add merged options with transfer state, transfer rules, and selection
      options: options,
      transferRules: transferRules,
      selectedCourseId: selection?.course_id,
      // Data version for React identity tracking
      __v: dataVersion ?? (block as any).__v,
      // Fallback ID for debugging
      _rfNodeId: block.id
    };
    
    return {
      ...baseNode,
      type: block.is_virtual ? 'gate' : 'requirement',
      data: nodeData
    };
  });
  
  // [ACCEPTANCE TEST] Log final enriched nodes (sample first 3 with data)
  if (process.env.NODE_ENV === 'development') {
    const enrichedSample = safeBlocks
      .map(block => {
        const blockIdNormalized = String(block.id).toLowerCase();
        const courseOptions = optionsByBlock?.get(blockIdNormalized) ?? [];
        const transferRules = transferRulesByBlock?.get(blockIdNormalized) ?? [];
        const selection = selectionsByBlock.get(blockIdNormalized);
        
        // Reconstruct merged options to match what was set on node.data
        const byCourse = new Map<string, any>();
        transferRules.forEach((r: any) => {
          const courseId = String(r.courseId ?? r.course_id ?? '');
          if (courseId) byCourse.set(courseId, r);
        });
        const mergedOptions = courseOptions.map((c: any) => {
          const tr = byCourse.get(c.courseId) || {};
          return {
            ...c,
            transfer: {
              state: tr.transferState ?? tr.transfer_state ?? 'unknown',
              score: tr.score ?? undefined
            }
          };
        }).slice(0, 3);
        
        return {
          id: block.id,
          title: block.title,
          optionsCount: courseOptions.length,
          opt0: mergedOptions[0]?.code,
          transfer0: mergedOptions[0]?.transfer?.state,
          selectedCourseId: selection?.course_id,
          __v: dataVersion
        };
      })
      .filter(b => b.optionsCount > 0 || b.selectedCourseId)
      .slice(0, 3);
      
    if (enrichedSample.length > 0) {
      console.log('[EduTree][FINAL NODES]', enrichedSample);
    }
  }
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

    // Only set handles when they are actually needed and valid - use fixHandle for defense-in-depth
    const normalizedSourceHandle = fixHandle(sourceHandle);
    const normalizedTargetHandle = fixHandle(targetHandle);
    
    if (normalizedSourceHandle !== null) {
      edgeObject.sourceHandle = normalizedSourceHandle;
    }
    if (sourcePosition !== undefined) {
      edgeObject.sourcePosition = sourcePosition;
    }
    
    // Guard for metro edge target handles - only set when header target is confirmed
    if (edgeType === 'metroGate' && isHeaderTarget && normalizedTargetHandle === 'in') {
      edgeObject.targetHandle = normalizedTargetHandle;
    } else if (normalizedTargetHandle !== null && edgeType !== 'metroGate') {
      edgeObject.targetHandle = normalizedTargetHandle;
    }

    return edgeObject;
  });
}

/**
 * Create header nodes for lane identification in compare modes
 * DISABLED: Canvas remains header-free, labels shown only in ComparePicker widget
 */
function createHeaderNodes(opts: {
  filterMode: string;
  gatePositions?: GatePositions;
  singleRailStraight: boolean;
  useV2EdgeKinds: boolean;
}): Node[] {
  // Always return empty array - no header nodes rendered on canvas
  // All track/program labeling handled by off-canvas ComparePicker widget
  return [];
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
  gatePositions?: GatePositions,
  selectedPrograms?: string[],
  dataVersion?: string,
  optionsByBlock?: Map<string, any[]>,
  transferRulesByBlock?: Map<string, any[]>,
  userPlanSelections?: any[]
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
  
  // Create column anchors with centralized layout tokens  
  const viewW = 1800; // Default viewport width, could be made dynamic
  const lanes = laneXs(viewW);
  const cols = { 
    y1: lanes.y1, 
    pg: lanes.gatePG, 
    y2: lanes.y2, 
    tg: lanes.gateTG, 
    y3: lanes.gateTG,  // Use track gate position for header centering
    y4: lanes.gateTG   // Y4 headers also center at track gate
  };
  
  // Create header nodes with dynamic positioning based on gate visibility
  const headerNodes = createHeaderNodes({
    filterMode,
    gatePositions,
    singleRailStraight,
    useV2EdgeKinds
  });
  
  // Create nodes with phase A planning data (blocks are pre-filtered)
  const processedNodes = blocksToNodes(
    blocks, 
    singleRailStraight, 
    selectedPrograms,
    dataVersion,
    optionsByBlock,
    transferRulesByBlock,
    userPlanSelections
  ).map(node => {
    const block = blocks.find(b => b.id === node.id);
    if (!block || block.is_virtual || block.is_empty_year) return node;
    
    // Debug: Log ghost nodes that make it to rendering
    if (block.is_empty_year === true) {
      console.log('[DEBUG] Ghost node in rendering:', {
        id: block.id,
        program_id: block.program_id,
        is_empty_year: (block as any).is_empty_year
      });
    }
    
    // Robust block key resolution (uuid / slug / dbId)
    const bid = String((node as any)?.data?.block?.id ?? node.id ?? (node as any)?.data?._rfNodeId ?? '').toLowerCase();
    const slugKey = String((node as any)?.data?.block?.slug ?? (node as any)?.data?.slug ?? (block as any)?.slug ?? '').toLowerCase();
    const dbIdKey = String((node as any)?.data?.block?.dbId ?? (node as any)?.data?.block?.db_id ?? (block as any)?.dbId ?? '').toLowerCase();
    const keys = [bid, slugKey, dbIdKey].filter(Boolean);

    const pick = <T,>(m?: Map<string, T>): T | undefined => {
      if (!m) return undefined;
      for (const k of keys) {
        const v = m.get(k);
        if (v) return v;
      }
      return undefined;
    };

    const rawOptions = pick(optionsByBlock) ?? [];
    const transferRules = pick(transferRulesByBlock) ?? [];

    // Merge per-course transfer metadata
    const byCourse = new Map<string, any>();
    transferRules.forEach((r: any) => {
      const cid = String(r.courseId ?? r.course_id ?? '').toLowerCase();
      if (cid) byCourse.set(cid, r);
    });

    const mergedOptions = rawOptions
      .map((c: any) => {
        const cid = String(c.courseId ?? c.course_id ?? c.id ?? '').toLowerCase();
        const tr = byCourse.get(cid) || {};
        return {
          ...c,
          transfer: {
            state: tr.transferState ?? tr.transfer_state ?? 'unknown',
            score: tr.score ?? undefined,
          },
        };
      })
      .sort(
        (a: any, b: any) =>
          (b.transfer?.score ?? 0) - (a.transfer?.score ?? 0) ||
          (b.evidence?.ace ? 1 : 0) - (a.evidence?.ace ? 1 : 0) ||
          (b.evidence?.clep ? 1 : 0) - (a.evidence?.clep ? 1 : 0)
      )
      .slice(0, 3);

    if (process.env.NODE_ENV === 'development' && mergedOptions.length > 0) {
      console.log('[nodes][enriched]', {
        id: bid || node.id,
        count: rawOptions.length,
        resolved: mergedOptions.length,
        top: mergedOptions[0]?.code,
        topState: mergedOptions[0]?.transfer?.state,
        pillPreview: mergedOptions.slice(0, 2).map(x => x.code || x.title),
      });
    }
    
    // Compute phase A plan for future grid mode
    const lane: 'up' | 'down' | undefined = 
      block.track_id === 'se' || block.program_id === 'bs_cs' ? 'up' :
      block.track_id === 'ds' || block.program_id === 'bs_it' ? 'down' : 
      undefined;
    
    const col = block.level_year;
    
    // Original manual coordinates with centralized lane positions
    const lanes = laneXs(viewW);
    const manualX = { 1: lanes.y1, 2: lanes.y2, 3: lanes.gateTG, 4: lanes.gateTG }[col] || lanes.y2;
    const manualY = lane === 'up' ? (col === 3 ? 240 : col === 4 ? 80 : 240) :
                    lane === 'down' ? (col === 3 ? 480 : col === 4 ? 640 : 480) :
                    360; // shared/gate row
    
    // Apply deterministic grid if enabled, pass viewport width
    const gridCoords = applyDeterministicGrid(col, lane, manualX, manualY, useGridAnchors, singleRailStraight, viewW);
    
    if (useGridAnchors && process.env.NODE_ENV === 'development') {
      console.log(`[Grid] ${node.id}: lane=${lane}, col=${col}, coords=(${gridCoords.x},${gridCoords.y})`);
    }
    
    return {
      ...node,
      data: {
        ...node.data,
        // Top-level for backward compatibility
        options: mergedOptions,
        transferRules: transferRules,
        optionsCount: rawOptions.length,
        __v: dataVersion,
        // Preserve marketplace signature
        mpSig: (node as any).data?.mpSig,
        // Marketplace subtree that NodeOptionsPill expects
        marketplace: {
          ...(node as any).data?.marketplace,
          count: rawOptions.length,
          resolved: mergedOptions.length,
          sticky: mergedOptions.length,
          options: mergedOptions,
          allow: true,
          show: rawOptions.length > 0,
        },
        phaseAPlan: { lane, col, x: gridCoords.x, y: gridCoords.y }
      }
    };
  });
  
  // PHASE 1: Hard Guard Filter - Belt-and-suspenders for program comparison
  const isProgramCompare = filterMode === 'compare-programs';
  const isGate = (n: any) => n.type === 'gate' || String(n.id).startsWith('gate-');
  
  console.log('[ManualLayout] Before hard guard filter:', {
    nodeCount: processedNodes.length,
    isProgramCompare,
    filterMode
  });
  
  // DEBUG: Check IT nodes before hard guard filter
  const itNodesPre = processedNodes.filter(n => {
    const block = blocks.find(b => b.id === n.id);
    return block?.program_id === 'bs_it';
  });
  console.log('[DEBUG] IT nodes before hard guard filter:', {
    count: itNodesPre.length,
    nodes: itNodesPre.map(n => {
      const block = blocks.find(b => b.id === n.id);
      return {
        id: n.id,
        type: n.type,
        program_id: block?.program_id,
        track_id: block?.track_id,
        level_year: block?.level_year,
        position_y: n.position?.y
      };
    })
  });
  
  // Debug logging - show blocks before filtering
  if (isProgramCompare) {
    console.table(processedNodes.map(n => {
      const block = blocks.find(b => b.id === n.id);
      return {
        id: n.id,
        type: n.type,
        year: block?.level_year,
        program_id: block?.program_id,
        track_id: block?.track_id,
        isGate: isGate(n)
      };
    }));
  }
  
  const nodes = processedNodes.filter(n => {
    if (!isProgramCompare) return true;
    const block = blocks.find(b => b.id === n.id);
    const tid = block?.track_id;
    const pid = block?.program_id;
    
    // CRITICAL FIX: IT nodes (bs_it) should ALWAYS be allowed, even if they somehow have track_id
    if (pid === 'bs_it') {
      console.log('[DEBUG] Allowing IT node through hard guard filter:', { id: n.id, program_id: pid, track_id: tid });
      return true;
    }
    
    // CRITICAL FIX: CS track nodes should be allowed when bs_cs is selected
    if (tid && pid === 'bs_cs' && selectedPrograms.includes('bs_cs')) {
      console.log('[DEBUG] Allowing CS track node through hard guard filter:', { id: n.id, program_id: pid, track_id: tid });
      return true;
    }
    
    return isGate(n) || !tid; // allow only non-track nodes + gates (original logic)
  });
  
  // DEBUG: Check IT nodes after hard guard filter
  const itNodesPost = nodes.filter(n => {
    const block = blocks.find(b => b.id === n.id);
    return block?.program_id === 'bs_it';
  });
  console.log('[DEBUG] IT nodes after hard guard filter:', {
    count: itNodesPost.length,
    nodes: itNodesPost.map(n => {
      const block = blocks.find(b => b.id === n.id);
      return {
        id: n.id,
        type: n.type,
        program_id: block?.program_id,
        track_id: block?.track_id,
        level_year: block?.level_year,
        position_y: n.position?.y
      };
    })
  });
  
  console.log('[ManualLayout] After hard guard filter:', {
    originalCount: processedNodes.length,
    filteredCount: nodes.length,
    removed: processedNodes.length - nodes.length,
    itNodesRemoved: itNodesPre.length - itNodesPost.length
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
  
  // DIAGNOSTIC: Expose pre-layout nodes for debugging
  if (process.env.NODE_ENV === 'development') {
    (window as any).__preLayoutNodes = nodes.map(n => ({
      id: n.id,
      type: n.type,
      optionsCount: n.data?.optionsCount,
      mpSig: n.data?.mpSig,
    }));
  }
  
  // Apply comprehensive lane packing at the very end (after all positioning tweaks)
  if (useGridAnchors && !singleRailStraight) {
    console.log('[ManualLayout] Applying final lane packing to eliminate overlaps');
    applyLanePackingFinal(allNodes, viewW);
    
    // Minimal validation logging (dev only)
    if (process.env.NODE_ENV === 'development') {
      const requirementNodes = allNodes.filter(n => n.type === 'requirement');
      const packedCount = requirementNodes.filter(n => 
        n.data?.levelYear === 3 || n.data?.levelYear === 4
      ).length;
      if (packedCount > 0) {
        console.log(`[ManualLayout] ✓ Lane packing applied to ${packedCount} Y3/Y4 nodes`);
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
  
  // DEBUG: Analyze node positions by lane for viewport planning
  const nodesByLane = {
    up: allNodes.filter(n => n.position?.y && n.position.y < 360),
    middle: allNodes.filter(n => n.position?.y && n.position.y >= 360 && n.position.y < 400),
    down: allNodes.filter(n => n.position?.y && n.position.y >= 400)
  };
  
  const itNodesInDown = nodesByLane.down.filter(n => {
    const block = blocks.find(b => b.id === n.id);
    return block?.program_id === 'bs_it';
  });
  
  console.log('[ManualLayout] Node distribution by lane:', {
    up: nodesByLane.up.length,
    middle: nodesByLane.middle.length, 
    down: nodesByLane.down.length,
    itNodesInDown: itNodesInDown.length,
    itNodePositions: itNodesInDown.map(n => ({ id: n.id, y: n.position?.y })),
    totalYRange: {
      min: Math.min(...allNodes.filter(n => n.position?.y).map(n => n.position!.y)),
      max: Math.max(...allNodes.filter(n => n.position?.y).map(n => n.position!.y))
    }
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
  
  // DIAGNOSTIC: Final exposure of post-layout nodes for debugging
  if (process.env.NODE_ENV === 'development') {
    (window as any).__postLayoutNodes = allNodes.map(n => ({
      id: n.id,
      type: n.type,
      optionsCount: n.data?.optionsCount,
      mpSig: n.data?.mpSig,
    }));
    
    const pre = (window as any).__preLayoutNodes?.slice(0, 5) || [];
    const post = (window as any).__postLayoutNodes?.slice(0, 5) || [];
    console.log('[ManualLayout] Data preservation check:');
    console.table(pre);
    console.table(post);
  }
  
  onApply(allNodes, sanitizedEdges);
  
  // Debug: expose to window for validation tests (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).__flowNodes__ = allNodes;
    (window as any).__flowEdges__ = sanitizedEdges;
    
    // Console assertion: verify no header nodes are rendered on canvas
    const hasHeaders = allNodes.some(n => n.type === 'header' || n.id.includes('-header:'));
    console.assert(!hasHeaders, '[REGRESSION] Header nodes should not be rendered on canvas - all labeling should be in ComparePicker widget');
  }
  
  // Note: fitView is handled by useFrameLockedFitView hook - no need to call it here
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