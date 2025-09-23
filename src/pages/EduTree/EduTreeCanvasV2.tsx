/**
 * EduTree Canvas V2 - Clean slate implementation
 * Bypasses all legacy layout systems when flags are active
 */

import React, { useCallback, useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
import { ReactFlow, useNodesState, useEdgesState, useReactFlow, Background, Controls, MiniMap, MarkerType, Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { useEduTreeV2Data } from './hooks/useEduTreeV2Data';
import { useApplyDimmingV2 } from './hooks/useApplyDimmingV2';
import { applyManualLayout, validateNoOverlaps, type V2NodeData } from './utils/manualLayoutRenderer';
import { exposeGridValidation } from './utils/deterministicGrid';
import { decideGatePositions } from './utils/divergence';
import { validateEduTreeDataModel, assertNoDanglingHeaders, assertGateX, assertHandlesOnce } from './data/validation';
import { runRegressionChecks } from './utils/regressionChecks';
import { runSmokeTest } from './utils/smokeTest';
import { assertNoInvisibleMetroEdges } from './utils/assertNoInvisibleMetroEdges';
import { useFeatureFlags } from '@/lib/featureFlags';
import { type FilterMode } from './data/seedDataV2';
import { LaneHeaders } from './components/LaneHeaders';
import { EdgeLegend } from './components/EdgeLegend';
import HeaderNode from './nodes/HeaderNode';
import GateEdge from './edges/GateEdge';
import GateBranchEdge from './edges/GateBranchEdge';
import MetroGateEdge from './edges/MetroGateEdge';
import { DevToggle } from './components/DevToggle';
import { ReactFlowErrorBoundary } from '@/components/ReactFlowErrorBoundary';
import { PathHighlightProvider, usePathHighlight } from './ctx/PathHighlightContext';
import { useReactFlowEventDebugger } from './hooks/useReactFlowEventDebugger';
import { useTrackComparison } from './hooks/useTrackComparison';
import { ComparisonLegend } from './components/ComparisonLegend';
import { DebugHUD } from './components/DebugHUD';
import { CompareModeHeader } from './components/CompareModeHeader';
import { EnhancedControls } from './components/EnhancedControls';
import { ProgressIndicator } from './components/ProgressIndicator';
import HighlightDiagnostics from './dev/HighlightDiagnostics';
import { TranscriptUploadDemo } from './components/TranscriptUploadDemo';
import { HudLayer, HudDock } from './components/HudLayer';
import { CompactDevPanel } from './components/CompactDevPanel';
import { ComparePicker, useCompareOptions, parseCompareUrl } from './components/ComparePicker';
import './components/StabilityStyles.css';
import './styles/trackOverlay.css';
import './styles/reactFlowFix.css';

type DevOverrides = {
  filterMode?: FilterMode;
  eduTreeLayoutMode?: 'legacy' | 'manual_v1' | 'grid_v2';
  eduTreeV2Grid?: boolean;
};

import { EvidenceBadges } from './components/EvidenceBadges';

// Node components for V2
const RequirementNode = ({ data }: { data: V2NodeData }) => {
  const blockData = data as any; // Type assertion for now - V2NodeData might not have all fields yet
  const blockId = blockData?.block?.id ?? blockData?.id ?? data?.id ?? 'unknown';
  const creditsNeeded = blockData?.creditsNeeded ?? blockData?.block?.creditsNeeded ?? null;
  const catalogCourseIds = blockData?.block?.catalogCourseIds ?? blockData?.catalogCourseIds ?? undefined;

  return (
    <div className="px-4 py-3 bg-background border-2 border-border rounded-lg shadow-sm min-w-[180px] relative">
      <div className="font-semibold text-sm text-foreground mb-1">{data.title}</div>
      <div className="text-xs text-muted-foreground">
        Year {data.levelYear} • {data.area}
      </div>
      {data.creditsNeeded && (
        <div className="text-xs text-muted-foreground mt-1">
          {data.creditsNeeded} credits
        </div>
      )}
      {data.trackId && (
        <div className="text-xs font-medium text-primary mt-1">
          {data.trackId.toUpperCase()}
        </div>
      )}
      
      {/* Evidence overlay (non-interactive) */}
      <EvidenceBadges
        blockId={blockId}
        creditsNeeded={creditsNeeded}
        catalogCourseIds={catalogCourseIds}
      />
    </div>
  );
};

const GateNode = ({ data }: { data: V2NodeData }) => {
  const gateType = data.junctionType || (data.title?.includes('Program') ? 'program' : 'track');
  const gateTitle = gateType === 'program' ? 'Program Gate' : 'Track Gate';
  
  // Show chosen program/track in single-rail mode
  let subtitle = gateType === 'program' ? 'Choose Program' : 'Choose Track';
  if (data.singleRailStraight) {
    if (gateType === 'program') {
      subtitle = data.programId === 'bs_cs' ? 'BS Computer Science chosen' : 
                  data.programId === 'bs_it' ? 'BS Information Technology chosen' : 
                  'Program chosen';
    } else {
      subtitle = data.trackId === 'se' ? 'Software Engineering chosen' : 
                  data.trackId === 'ds' ? 'Data Science chosen' : 
                  'Track chosen';
    }
  }
  
  const singleRailStraight = data.singleRailStraight;
  
  return (
    <div className="rounded-xl border border-dashed border-primary/60 bg-background/70 backdrop-blur px-4 py-3 shadow-sm min-w-[220px] text-sm relative">
      <div className="text-xs uppercase tracking-wide opacity-70">Year {data.levelYear}</div>
      <div className="font-semibold">{gateTitle}</div>
      <div className="mt-1 text-xs opacity-70">{subtitle}</div>

      {/* Handles - show appropriate handles based on mode */}
      {!singleRailStraight && (
        <>
          <Handle id="out-se" type="source" position={Position.Top} />
          <Handle id="out-ds" type="source" position={Position.Bottom} />
          <Handle 
            id="out" 
            type="source" 
            position={Position.Right}
            style={{ 
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0,
              width: 1,
              height: 1
            }}
          />
        </>
      )}
      {singleRailStraight && (
        <Handle 
          id="out" 
          type="source" 
          position={Position.Right}
          style={{ 
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0,
            width: 1,
            height: 1
          }}
        />
      )}
      {/* target handle */}
      <Handle 
        id="in" 
        type="target" 
        position={Position.Left}
        style={{ 
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          width: 1,
          height: 1
        }}
      />
    </div>
  );
};

const nodeTypes = {
  requirement: RequirementNode,
  gate: GateNode,
  header: HeaderNode
};

const edgeTypes = {
  gate: GateEdge,
  gateBranch: GateBranchEdge,
  metroGate: MetroGateEdge
};

// Improved shallow equality functions to prevent layout churn
function shallowEqualNodes(a: any[], b: any[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const A = a[i], B = b[i];
    if (A.id !== B.id || A.type !== B.type || A.hidden !== B.hidden) return false;
    if (A.position?.x !== B.position?.x || A.position?.y !== B.position?.y) return false;
  }
  return true;
}

interface EduTreeCanvasV2Props {
  filterMode?: FilterMode;
  overrideFilterMode?: FilterMode;
  overrideFlags?: Partial<{ 
    eduTreeV2Grid: boolean; 
    eduTreeLayoutMode: "legacy"|"manual_v1"|"grid_v2"; 
  }>;
}

export default function EduTreeCanvasV2({ 
  filterMode = null, 
  overrideFilterMode,
  overrideFlags 
}: EduTreeCanvasV2Props) {
  return (
    <PathHighlightProvider filterMode={overrideFilterMode ?? filterMode ?? 'compare-tracks'}>
      <EduTreeCanvasV2Content 
        filterMode={filterMode}
        overrideFilterMode={overrideFilterMode}
        overrideFlags={overrideFlags}
      />
    </PathHighlightProvider>
  );
}

function EduTreeCanvasV2Content({ 
  filterMode = null, 
  overrideFilterMode,
  overrideFlags 
}: EduTreeCanvasV2Props) {
  const flags = useFeatureFlags();
  const pathHighlight = usePathHighlight();
  const compareOptions = useCompareOptions();
  
  // Dev panel state (always available in dev)
  const [showDev, setShowDev] = useState(true);
  const [dev, setDev] = useState<DevOverrides>({});

  // Initialize selections from URL on mount
  useEffect(() => {
    const { primarySelection, secondarySelection } = parseCompareUrl();
    if (primarySelection) pathHighlight.setPrimarySelection(primarySelection);
    if (secondarySelection) pathHighlight.setSecondarySelection(secondarySelection);
  }, []);
  
  // Use dev overrides first, then props overrides, then feature flags
  const effectiveFlags = {
    eduTreeV2Grid: dev.eduTreeV2Grid ?? overrideFlags?.eduTreeV2Grid ?? flags.eduTreeV2Grid,
    eduTreeLayoutMode: dev.eduTreeLayoutMode ?? overrideFlags?.eduTreeLayoutMode ?? flags.eduTreeLayoutMode,
  };
  
  // Use dev override filter mode when provided, then props, then default
  const effectiveFilterMode = dev.filterMode ?? overrideFilterMode ?? filterMode;
  
  // Track comparison logic for compare-any mode
  const trackComparisonEnabled = effectiveFilterMode === 'compare-any';
  const primaryTrackId = pathHighlight.primarySelection?.kind === 'track' ? pathHighlight.primarySelection.id as any : undefined;
  const comparisonTrackId = pathHighlight.secondarySelection?.kind === 'track' ? pathHighlight.secondarySelection.id as any : undefined;
  
  const { blocks, edges, isLoading, isV2Mode, filterMode: currentFilterMode } = useEduTreeV2Data(effectiveFilterMode);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const fitViewCalled = useRef(false);
  const gatePositionsRef = useRef<any>(null);
  
  // Enhanced React Flow monitoring and recovery system
  const eventDebugger = useReactFlowEventDebugger({
    enabled: process.env.NODE_ENV === 'development',
    recoveryEnabled: true,
    onCorruptionDetected: (details) => {
      console.error('[EduTreeV2] React Flow corruption detected:', details);
      
      // Force re-render of safe edges if corruption is detected
      if (details.corruptionCount < 3) {
        setTimeout(() => {
          console.log('[EduTreeV2] Triggering edge refresh due to corruption');
          setEdges(prev => [...prev]);
        }, 100);
      }
    }
  });

  
  // COMPREHENSIVE Edge sanitization to prevent React Flow event system corruption
  const safeEdges = React.useMemo(() => {
    const visibleIds = new Set((nodes || []).filter(n => !n.hidden).map(n => n.id));
    
    // ULTRA-AGGRESSIVE edge filtering - prevent ALL problematic edges
    const filtered = (flowEdges || []).filter(edge => {
      // 1. Validate edge exists and has required properties
      if (!edge || typeof edge.id !== 'string' || !edge.source || !edge.target) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[EduTreeV2] Filtered malformed edge:', edge);
        }
        return false;
      }
      
      // 2. Check for valid source and target nodes
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[EduTreeV2] Filtered dangling edge:', edge.id);
        }
        return false;
      }
      
      // 3. REFINED handle validation - surgical precision to avoid over-filtering
      const sourceHandle = edge.sourceHandle;
      const targetHandle = edge.targetHandle;
      
      // Better handle validation - only flag truly problematic values
      const badHandle = (h: unknown) =>
        h == null ||
        h === 'null' || h === 'undefined' || h === 'NaN' ||
        (typeof h === 'string' && h.trim() === '');
      
      // Only enforce handle checks on edges that actually require handles
      const needsHandles = (e: any) => e.type !== 'default' || e.sourceHandle !== undefined || e.targetHandle !== undefined;
      
      const hasProblematicHandles = needsHandles(edge) && (badHandle(sourceHandle) || badHandle(targetHandle));
      
      if (hasProblematicHandles) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[EduTreeV2] CRITICAL: Filtered edge with toxic handles:', {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            sourceHandleType: typeof edge.sourceHandle,
            targetHandleType: typeof edge.targetHandle
          });
        }
        return false;
      }
      
      // 4. Additional React Flow corruption prevention
      if (edge.source === edge.target) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[EduTreeV2] Filtered self-loop edge:', edge.id);
        }
        return false;
      }
      
      return true;
    });
    
    // 5. Final corruption check - ensure no problematic edges survive
    const finalFiltered = filtered.filter(edge => {
      const stillProblematic = (
        edge.sourceHandle === 'null' ||
        edge.targetHandle === 'null' ||
        (typeof edge.sourceHandle === 'string' && edge.sourceHandle.trim() === '') ||
        (typeof edge.targetHandle === 'string' && edge.targetHandle.trim() === '')
      );
      
      if (stillProblematic && process.env.NODE_ENV === 'development') {
        console.error('[EduTreeV2] EMERGENCY: Final filter caught problematic edge:', edge);
        return false;
      }
      
      return true;
    });
    
    if (process.env.NODE_ENV === 'development') {
      const removedCount = (flowEdges || []).length - finalFiltered.length;
      if (removedCount > 0) {
        console.warn('[EduTreeV2] Comprehensive filter removed', removedCount, 'problematic edges');
        
        // Log details of what was filtered for debugging
        const problemEdges = (flowEdges || []).filter(e => !finalFiltered.includes(e));
        console.group('[EduTreeV2] Filtered edges details:');
        problemEdges.forEach(edge => {
          console.warn('Filtered:', {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          });
        });
        console.groupEnd();
      }
    }
    
    return finalFiltered;
  }, [nodes, flowEdges]);

  // Then apply dimming to the safe edges (hook called at top level)
  const { nodes: processedNodes, edges: processedEdges } = useApplyDimmingV2({ nodes: nodes || [], edges: safeEdges });

  // Node position validation - prevent NaN/∞ coordinates
  const safeNodes = useMemo(() => {
    const isFiniteNum = (v: any) => Number.isFinite(v);
    const okNode = (n: any) => n?.position && isFiniteNum(n.position.x) && isFiniteNum(n.position.y);
    
    const validNodes = (processedNodes || []).filter(okNode);
    const invalidNodes = (processedNodes || []).filter(n => !okNode(n));
    
    if (process.env.NODE_ENV === 'development' && invalidNodes.length > 0) {
      console.error('[EduTreeV2] Invalid node positions filtered:', 
        invalidNodes.map(n => ({ id: n.id, pos: n.position }))
      );
    }
    
    return validNodes;
  }, [processedNodes]);

  // Runtime debugging tools for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Make debugging tools available on window
      (window as any).getNodes = () => safeNodes;
      (window as any).getEdges = () => processedEdges;
      (window as any).checkReactFlowPane = () => {
        const pane = document.querySelector('.react-flow__pane');
        if (pane) {
          const style = window.getComputedStyle(pane);
          console.log('React Flow Pane Debug:', {
            element: pane,
            pointerEvents: style.pointerEvents,
            touchAction: style.touchAction,
            position: style.position,
            zIndex: style.zIndex
          });
        }
        return pane;
      };
      (window as any).checkInvalidNodes = () => {
        return safeNodes.filter(n => !Number.isFinite(n.position?.x) || !Number.isFinite(n.position?.y));
      };
    }
  }, [safeNodes, processedEdges]);

  // Store the ACTUAL rendered arrays for diagnostics
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).__dimmedNodes__ = processedNodes;
      (window as any).__safeEdges__ = processedEdges;
      (window as any).__originalEdges__ = flowEdges;
      (window as any).__filteredEdges__ = safeEdges;
    }
  }, [processedNodes, processedEdges, flowEdges, safeEdges]);

  // Track comparison integration for compare-any mode
  const trackComparisonResults = useTrackComparison({
    nodes: safeNodes,
    edges: processedEdges,
    primaryTrackId,
    comparisonTrackId,
    overlayEnabled: trackComparisonEnabled
  });

  // Use highlighted nodes/edges when track comparison is active
  const finalNodes = trackComparisonEnabled ? trackComparisonResults.highlightedNodes : safeNodes;
  const finalEdges = trackComparisonEnabled ? trackComparisonResults.highlightedEdges : processedEdges;

  // Swap tracks handler
  const handleSwapTracks = useCallback(() => {
    if (pathHighlight.primarySelection && pathHighlight.secondarySelection) {
      const temp = pathHighlight.primarySelection;
      pathHighlight.setPrimarySelection(pathHighlight.secondarySelection);
      pathHighlight.setSecondarySelection(temp);
    }
  }, [pathHighlight]);
  
  // Calculate single-rail mode flags - handles both program and track level
  const presentTracks = new Set(blocks.map(b => b.track_id).filter(Boolean));
  const presentPrograms = new Set(blocks.map(b => b.program_id).filter(Boolean));
  const singleTrack = presentTracks.size === 1;
  const singleProgram = presentPrograms.size === 1;
  const singleRailStraight = effectiveFlags.eduTreeV2Grid && effectiveFlags.eduTreeLayoutMode === 'grid_v2' && (singleTrack || singleProgram);
  const usePlan = effectiveFlags.eduTreeV2Grid && effectiveFlags.eduTreeLayoutMode === 'grid_v2' && (singleTrack || singleProgram);
  
  // 1) Stable key for blocks content (order-insensitive, content-based)
  const blocksKey = useMemo(
    () => JSON.stringify([...blocks].sort((a,b)=>a.id.localeCompare(b.id)).map(b => ({
      id: b.id, y: b.level_year, p: b.program_id ?? null, t: b.track_id ?? null, v: !!b.is_virtual
    }))),
    [blocks]
  );

  // 2) Programs (stable array, only changes when content changes)
  const programs = useMemo(
    () => Array.from(new Set(blocks.map(b => b.program_id).filter(Boolean))) as ('bs_cs' | 'bs_it')[],
    [blocksKey]
  );

  // 3) TracksByProgram (ultra-stable via key + freeze)
  const tracksKey = useMemo(() => JSON.stringify(
    programs.map(p => [p, Array.from(new Set(blocks.filter(b => b.program_id===p && b.track_id).map(b => b.track_id!)))])
  ), [blocksKey, programs.join('|')]);

  const tracksByProgram = useMemo(() => {
    const map: Record<'bs_cs'|'bs_it', ('se'|'ds')[]> = { bs_cs: [], bs_it: [] };
    for (const [p, arr] of JSON.parse(tracksKey) as ['bs_cs'|'bs_it', ('se'|'ds')[]][]) map[p] = arr;
    return Object.freeze(map);
  }, [tracksKey]);

  // 4) Gate positions: only emit a new object when content actually changes
  function stableReturn<T>(prevRef: React.MutableRefObject<T|null>, next: T): T {
    const same = prevRef.current && JSON.stringify(prevRef.current) === JSON.stringify(next);
    if (!same) prevRef.current = next;
    return prevRef.current as T;
  }
  
  const gatePositions = useMemo(() => {
    const cols = { y1: 200, y2: 600, y3: 1300, y4: 1700, pg: 400, tg: 900 };
    const next = decideGatePositions({ blocks, programs, tracksByProgram, cols });
    return stableReturn(gatePositionsRef, next);
  }, [blocksKey, programs.join('|'), tracksKey]);
  
  // FitView key for determining when to reset fitView flag
  const fitViewKey = `${effectiveFilterMode}|${programs.join('|')}|${tracksKey}|${gatePositions.showPG?1:0}|${gatePositions.showTG?1:0}`;
  

  // Apply manual layout when data changes
  useEffect(() => {
    if (!isV2Mode || blocks.length === 0) {
      console.log('[EduTreeV2] Not in V2 mode or no blocks, skipping layout');
      return;
    }
    
    console.log('[EduTreeV2] Applying manual layout for', blocks.length, 'blocks');
    
    // Expose grid validation tools for development
    exposeGridValidation();
    
    // Run validation with gate positions for development
    if (process.env.NODE_ENV === 'development') {
      const validation = validateEduTreeDataModel(gatePositions);
      if (!validation.success) {
        console.warn('[EduTreeV2] Validation issues detected:', validation);
      }
    }
      
    console.log('[EduTreeV2] Layout mode:', { 
      presentTracks: [...presentTracks],
      presentPrograms: [...presentPrograms], 
      singleTrack,
      singleProgram, 
      singleRailStraight,
      usePlan,
      layoutMode: effectiveFlags.eduTreeLayoutMode,
      gatePositions
    });
    
    applyManualLayout(
      blocks,
      edges,
      (newNodes, newEdges) => {
        console.log('[EduTreeV2] Setting nodes and edges:', { 
          nodes: newNodes.length, 
          edges: newEdges.length 
        });
        
        // Apply gate positioning decisions with proper guards and dimming
        const withGatePlacement = (nodes: typeof newNodes) => nodes.map(n => {
          if (n.id === 'gate-y2-programs') {
            if (!gatePositions.showPG || gatePositions.pgX == null) return { ...n, hidden: true };
            return { ...n, position: { x: gatePositions.pgX, y: 360 }, hidden: false };
          }
          if (n.id === 'gate-y3-tracks') {
            if (!gatePositions.showTG || gatePositions.tgX == null) return { ...n, hidden: true };
            return { ...n, position: { x: gatePositions.tgX, y: 360 }, hidden: false };
          }
          return n;
        });
        
        // Apply grid layout if conditions met
        const finalNodes = usePlan ? withGatePlacement(newNodes).map(n => {
          // Skip header nodes - they don't have phaseAPlan
          if (n.type === 'header') {
            return n;
          }
          if (n.data?.isVirtual) {
            // Add singleRailStraight flag to gate nodes
            return { 
              ...n, 
              data: { ...n.data, singleRailStraight } 
            };
          }
          const p = (n.data as V2NodeData)?.phaseAPlan;
          if (!p) { 
            console.warn('[V2] Missing phaseAPlan for', n.id); 
            return n; 
          }
          return { 
            ...n, 
            position: { x: p.x, y: p.y }, 
            data: { ...n.data, hasGridLayout: true, singleRailStraight } 
          };
        }) : withGatePlacement(newNodes).map(n => ({ ...n, data: { ...n.data, singleRailStraight } }));
        
        // No need to filter edges here - filtering happens in manualLayoutRenderer
        
        // Prevent layout churn with shallow equality checks
        setNodes(prev => shallowEqualNodes(prev, finalNodes) ? prev : finalNodes);
        setEdges(prev => prev.length === newEdges.length && prev.every((e,i) => e.id === newEdges[i].id) ? prev : newEdges);
        
        // Store nodes in window for validation utilities  
        if (process.env.NODE_ENV === 'development') {
          (window as any).__flowNodes__ = finalNodes;
          (window as any).__flowEdges__ = newEdges;
          (window as any).gatePositions = gatePositions;
        }
        
        // Validate no overlaps (acceptance criteria)
        const validation = validateNoOverlaps(finalNodes);
        if (validation.hasOverlaps) {
          console.warn('[EduTreeV2] Node overlaps detected:', validation.overlaps);
        } else {
          console.log('[EduTreeV2] ✓ No node overlaps - acceptance criteria met');
        }
      },
      () => {
        // fitView is now handled by separate useEffect
      },
      usePlan, // Use deterministic grid anchors when in single-rail grid mode
      singleRailStraight, // Pass single-rail straight flag
      effectiveFilterMode || 'compare-tracks', // Pass filter mode for header routing  
      flags.eduTreeV2EdgeKinds ?? true, // Pass V2 edge kinds flag (default true)
      gatePositions // Pass gate positioning decisions
    );
  }, [blocksKey, edges, isV2Mode, setNodes, setEdges, effectiveFlags.eduTreeV2Grid, effectiveFlags.eduTreeLayoutMode, usePlan, singleRailStraight, effectiveFilterMode, flags.eduTreeV2EdgeKinds, gatePositions]);
  
  // Update handle internals using useLayoutEffect to prevent micro "pop"
  useLayoutEffect(() => {
    const visibleGateIds = nodes.filter(n => n.type === 'gate' && !n.hidden).map(n => n.id);
    visibleGateIds.forEach(updateNodeInternals);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[EduTreeV2] Updated handle internals for visible gate nodes:', visibleGateIds);
      
      // Run GPT's validation functions
      try {
        assertNoDanglingHeaders({ edges: flowEdges, nodes });
        assertGateX({ 
          nodes, 
          gatePositions, 
          cols: { y1: 200, y2: 600, y3: 1300, y4: 1700 } 
        });
        assertHandlesOnce(nodes);
        
        // Run comprehensive regression checks
        runRegressionChecks({
          edges: flowEdges,
          nodes,
          gatePositions,
          cols: { y1: 200, y2: 600, y3: 1300, y4: 1700 }
        });
        
        // Run ChatGPT's smoke test
        runSmokeTest();
        
        // Assert no invisible metro edges (development only)
        if (!assertNoInvisibleMetroEdges(nodes, flowEdges)) {
          console.warn('[EduTreeV2] Invisible metro edges detected - check edge filtering logic');
        }
      } catch (e) {
        console.warn('[EduTreeV2] Validation assertion failed:', e);
      }
    }
  }, [nodes, updateNodeInternals, flowEdges, gatePositions]);
  
  // Reset fitView flag when meaningful context changes
  useEffect(() => { 
    fitViewCalled.current = false; 
  }, [fitViewKey]);
  
  // Run fitView once per meaningful context
  useEffect(() => {
    if (!fitViewCalled.current && nodes.length > 0) { 
      fitView(); 
      fitViewCalled.current = true; 
    }
  }, [nodes, flowEdges, fitView]);
  
  const onConnect = useCallback(() => {
    // Prevent new connections in manual mode
    console.log('[EduTreeV2] Manual mode - connections disabled');
  }, []);
  
  if (!isV2Mode) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">EduTree V2 Disabled</div>
          <div className="text-sm">
            Add <code>?eduTreeV2Grid=true&eduTreeLayoutMode=manual_v1</code> to enable
          </div>
        </div>
      </div>
    );
  }
  
  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No Layout Data</div>
          <div className="text-sm">Manual layout seed not loaded</div>
        </div>
      </div>
  );
  }
  
  return (
    <ReactFlowErrorBoundary
      onError={(error) => {
        console.error('[EduTreeV2] React Flow error:', error);
      }}
    >
      <>
        <div className="h-full w-full edu-tree-canvas">
        {/* Dynamic Lane Headers - hide in single-rail straight mode */}
        {!singleRailStraight && (() => {
          const getLaneHeaders = () => {
            switch (filterMode) {
              case 'compare-programs':
                return {
                  upper: '▲ BS Computer Science',
                  lower: '▼ BS Information Technology'
                };
              case 'compare-tracks':
              default:
                return {
                  upper: '▲ Software Engineering Lane',
                  lower: '▼ Data Science Lane'
                };
            }
          };
          
          const headers = getLaneHeaders();
          return (
            <>
              <div className="absolute top-4 left-[1300px] text-xs opacity-70 z-10 pointer-events-none">
                <div className="bg-background/80 px-2 py-1 rounded border">
                  {headers.upper}
                </div>
              </div>
              <div className="absolute bottom-4 left-[1300px] text-xs opacity-70 z-10 pointer-events-none">
                <div className="bg-background/80 px-2 py-1 rounded border">
                  {headers.lower}
                </div>
              </div>
            </>
          );
        })()}

      {/* Midline spine at gate row */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ 
          top: 360, 
          height: 2, 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' 
        }}
      />

      {/* Faint horizontal lane dividers - hide in single-rail straight mode */}
      {!singleRailStraight && (
        <>
          <div className="absolute top-0 left-[1250px] w-[500px] h-[200px] bg-primary/5 rounded-lg pointer-events-none" />
          <div className="absolute top-[400px] left-[1250px] w-[500px] h-[300px] bg-secondary/5 rounded-lg pointer-events-none" />
        </>
      )}

        <ReactFlow
          nodes={finalNodes}
          edges={finalEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          minZoom={0.3}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1.0 }}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          selectionOnDrag={false}
          edgesFocusable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => {
            // Store React Flow instance for recovery
            (window as any).__reactFlowInstance__ = instance;
          }}
        >
        >
          <Background />
          <Controls />
        </ReactFlow>
      
        {/* Edge Type Legend - show in compare modes */}
        <EdgeLegend show={filterMode === 'compare-tracks' || filterMode === 'compare-programs'} />

        {/* Debug info in bottom corner */}
        <div className="absolute bottom-4 left-4 bg-background/90 border rounded p-2 text-xs text-muted-foreground">
          <div>V2 Multi-Gate Mode • nodes {processedNodes.length} • edges {processedEdges.length}</div>
          <div>Filter: {currentFilterMode || 'compare-tracks'}</div>
          <div>Flags: V2Grid={String(effectiveFlags.eduTreeV2Grid)}, Mode={effectiveFlags.eduTreeLayoutMode}, EdgeKinds={String(flags.eduTreeV2EdgeKinds)}</div>
          <div>Headers: {processedNodes.filter(n => n.type === 'header').length} • Gates: {processedNodes.filter(n => n.type === 'gate' && !n.hidden).length}</div>
        </div>


        {/* Unified HUD System - No More Overlaps */}
        <HudLayer>
          {/* Top-Right Stack */}
          <HudDock corner="TR" index={0}>
            <CompactDevPanel 
              dev={dev} 
              setDev={setDev} 
              effectiveFlags={effectiveFlags}
            />
          </HudDock>

          {/* Bottom-Right Stack */}
          <HudDock corner="BR" index={0}>
            <TranscriptUploadDemo />
          </HudDock>

          <HudDock corner="BR" index={1} className="text-xs opacity-80 bg-black/40 px-2 py-1 rounded">
            Mode: {effectiveFlags.eduTreeLayoutMode} • Tracks: {([...new Set(blocks.map(b => b.track_id).filter(Boolean))]).join(',') || 'shared'} • Programs: {([...new Set(blocks.map(b => b.program_id).filter(Boolean))]).join(',') || 'shared'}
          </HudDock>

          {/* Top-Left Stack - Professional Compare Picker */}
          <HudDock corner="TL" index={0} className="w-auto max-w-[90vw]">
            <ComparePicker
              options={compareOptions}
              valueA={pathHighlight.primarySelection}
              valueB={pathHighlight.secondarySelection}
              setA={pathHighlight.setPrimarySelection}
              setB={pathHighlight.setSecondarySelection}
              onEnsureCompareAny={() => {
                const p = new URLSearchParams(window.location.search);
                p.set("filterMode", "compare-any");
                history.replaceState(null, "", `?${p.toString()}`);
                setDev(d => ({ ...d, filterMode: 'compare-any' }));
              }}
              className="w-full"
            />
          </HudDock>

          <HudDock corner="TR" index={1}>
            <EnhancedControls 
              isVisible={true}
              viewMode={effectiveFilterMode === 'compare-tracks' ? 'comparison' : effectiveFilterMode === 'compare-programs' ? 'comparison' : 'overview'}
              onViewModeChange={(mode) => {
                const filterMode = mode === 'comparison' ? 'compare-tracks' : mode === 'overview' ? null : 'compare-tracks';
                setDev(d => ({ ...d, filterMode }));
              }}
              showCompleted={true}
              showPrerequisites={true}
              layoutDensity="comfortable"
              onLayoutDensityChange={() => {}}
              progressStats={{
                completed: processedNodes.filter(n => n.data?.completed).length,
                inProgress: processedNodes.filter(n => n.data?.inProgress).length,
                total: processedNodes.length
              }}
            />
          </HudDock>

          <HudDock corner="BR" index={2}>
            <ProgressIndicator
              completed={processedNodes.filter(n => n.data?.completed).length}
              inProgress={processedNodes.filter(n => n.data?.inProgress).length}
              total={processedNodes.length}
              trackName={presentTracks.size === 1 ? Array.from(presentTracks)[0]?.toUpperCase() : "Multiple Tracks"}
              showDetails={true}
              size="md"
            />
          </HudDock>

          {/* Bottom-Left Stack - Dev Only */}
          {process.env.NODE_ENV === 'development' && (
            <HudDock corner="BL" index={0}>
              <HighlightDiagnostics />
            </HudDock>
          )}
        </HudLayer>
      </div>
      </>
    </ReactFlowErrorBoundary>
  );
}
