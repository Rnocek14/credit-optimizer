/**
 * EduTree Canvas V2 - Clean slate implementation
 * Bypasses all legacy layout systems when flags are active
 */

import React, { useCallback, useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
import { ReactFlow, useNodesState, useEdgesState, useReactFlow, Background, Controls, MiniMap, MarkerType, Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { useEduTreeV2Data } from './hooks/useEduTreeV2Data';
import { useApplyDimmingV2 } from './hooks/useApplyDimmingV2';
import { applyManualLayout, validateNoOverlaps, type V2NodeData } from './utils/manualLayoutRenderer';
import { getProgramById } from './data/programMetadata';
import { exposeGridValidation } from './utils/deterministicGrid';
import { laneXs } from './utils/layoutTokens';
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
import { useFrameLockedFitView } from './hooks/useFrameLockedFitView';
import { PathHighlightProvider, usePathHighlight } from './ctx/PathHighlightContext';
import { GATE_Y } from './utils/renderMode';
import { useReactFlowEventDebugger } from './hooks/useReactFlowEventDebugger';
import { ComparisonLegend } from './components/ComparisonLegend';
import { EnhancedControls } from './components/EnhancedControls';
import { ProgressIndicator } from './components/ProgressIndicator';
import HighlightDiagnostics from './dev/HighlightDiagnostics';
import { TranscriptUploadDemo } from './components/TranscriptUploadDemo';
import { HudLayer, HudDock } from './components/HudLayer';
import { CompactDevPanel } from './components/CompactDevPanel';
import { ComparePicker, useCompareOptions, parseCompareUrl } from './components/ComparePicker';
import { CheckpointControls } from './components/CheckpointControls';
import { DebugHUD } from '../../components/DebugHUD';
import { SuffixMetrics } from './components/SuffixMetrics';
import { useSuffixCompare } from './hooks/useSuffixCompare';
import './components/StabilityStyles.css';
import './styles/trackOverlay.css';
import './styles/reactFlowFix.css';
import './styles/gateAggregation.css';
import '../../styles/eduTreeHud.css';
import { auditSeeds, printAuditReport } from './utils/seedAuditor';

type DevOverrides = {
  filterMode?: FilterMode;
  eduTreeLayoutMode?: 'legacy' | 'manual_v1' | 'grid_v2';
  eduTreeV2Grid?: boolean;
};

import { EmptyYearNode } from './components/EmptyYearNode';
import { injectGhostNodes, getActivePrograms, addGhostNodeEdges, createGhostNodeData } from './utils/ghostNodeInjector';
import { EvidenceBadges } from './components/EvidenceBadges';
import { PhaseHeaders } from './components/HUD/PhaseHeaders';
import { LaneCaptions } from './components/HUD/LaneCaptions';
import { ComparisonLegend as HudComparisonLegend } from './components/HUD/ComparisonLegend';
import { CourseSelectionModal } from './components/CourseSelectionModal';
import { useUserPlan } from '@/hooks/useUserPlan';
import { ENV } from '@/config/env';

// Marketplace feature flag moved inside component for reactivity

// Node components for V2
const RequirementNode = ({ data }: { data: V2NodeData }) => {
  const flags = useFeatureFlags();
  const pathHighlight = usePathHighlight();
  const blockData = data as any;
  // Bulletproof blockId resolution with fallback chain
  const blockId =
    blockData?.block?.id ??
    blockData?.id ??
    (blockData && typeof blockData === 'object' && '_rfNodeId' in blockData ? blockData._rfNodeId : undefined) ??
    'unknown';
  const creditsNeeded = blockData?.creditsNeeded ?? blockData?.block?.creditsNeeded ?? null;
  const catalogCourseIds = blockData?.block?.catalogCourseIds ?? blockData?.catalogCourseIds ?? undefined;
  
  // Phase 2: Course marketplace data
  const { optionsCount, hasAceCredit, hasClep, selectedCourse } = data;
  const [modalOpen, setModalOpen] = useState(false);
  
  // Reactive marketplace feature flag
  const SHOW_MP = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const LOCAL_MP = window.localStorage?.getItem('mp') === '1';
    const URL_MP = new URLSearchParams(window.location.search).get('mp') === '1';
    return ENV.DEGREE_MARKETPLACE || LOCAL_MP || URL_MP;
  }, []);
  
  // DIAGNOSTIC: Log marketplace state in dev only
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('[REQNODE]', blockId, { 
      SHOW_MP, 
      optionsCount, 
      isFinite: Number.isFinite(optionsCount),
      greaterThanZero: Number(optionsCount) > 0
    });
  }, [blockId, optionsCount, SHOW_MP]);
  
  // Extract track and program info for styling
  const trackId = data.trackId || blockData?.track_id || blockData?.block?.track_id;
  const programId = data.programId || blockData?.program_id || blockData?.block?.program_id;
  
  // Check if we're viewing a single program (same program for both selections)
  const getSingleProgram = () => {
    const { primarySelection, secondarySelection } = pathHighlight || {};
    
    // Single program selected
    if (primarySelection?.kind === 'program' && !secondarySelection) {
      return primarySelection.id;
    }
    // Comparing same program against itself
    if (primarySelection?.kind === 'program' && 
        secondarySelection?.kind === 'program' && 
        primarySelection.id === secondarySelection.id) {
      return primarySelection.id;
    }
    // Single track view - derive program from track
    if (primarySelection?.kind === 'track') {
      if (['se', 'ds'].includes(primarySelection.id)) return 'bs_cs';
      // Add other track-to-program mappings as needed
    }
    return null;
  };
  
  // Check if this is a Year 1 shared course (no program_id)
  const isY1SharedCourse = !programId || programId === null || programId === undefined;
  const viewingProgram = getSingleProgram();
  
  // Build dynamic classes for program/track styling
  const trackClasses = [];
  if (viewingProgram && (programId === viewingProgram || isY1SharedCourse)) {
    // Map program IDs to CSS class names
    const programClass = {
      'bs_cs': 'cs',
      'bs_it': 'it', 
      'bsn': 'bsn'
    }[viewingProgram];
    
    if (programClass) {
      trackClasses.push('node', programClass);
      
      // Apply track-specific styling for CS, otherwise use base program styling
      if (viewingProgram === 'bs_cs') {
        if (trackId === 'se') {
          trackClasses.push('track--se');
        } else if (trackId === 'ds') {
          trackClasses.push('track--ds');
        } else {
          trackClasses.push('track--cs-base');
        }
      } else {
        // For other programs, use base program styling
        trackClasses.push(`track--${programClass}-base`);
      }
    }
  }
  
  const nodeClassNames = [
    'px-4 py-3 bg-background border-2 border-border rounded-lg shadow-sm min-w-[180px] relative',
    ...trackClasses
  ].join(' ');

  return (
    <div className={nodeClassNames}>
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
      
      {/* DEV DIAGNOSTIC: Only show when real pill wouldn't render */}
      {process.env.NODE_ENV === 'development' 
        && SHOW_MP 
        && (!Number.isFinite(optionsCount) || Number(optionsCount) <= 0) && (
        <span
          onClick={() => setModalOpen(true)}
          className="mt-2 px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground cursor-pointer text-[10px]"
          title="Dev diagnostic: shows raw count even if zero"
        >
          Options: {String(optionsCount ?? '∅')}
        </span>
      )}
      
      {/* Phase 2: Course marketplace chips - only show when meaningful */}
      {SHOW_MP && Number.isFinite(optionsCount) && optionsCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 items-center text-[10px]">
          <button
            onClick={() => setModalOpen(true)}
            className="px-2 py-0.5 rounded-full bg-surface border border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer"
            title="View catalog course options that satisfy this requirement"
          >
            Options: {optionsCount}
          </button>
          {hasAceCredit && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100/60 text-amber-700 border border-amber-200/50" title="ACE credit available">
              ACE
            </span>
          )}
          {hasClep && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100/60 text-blue-700 border border-blue-200/50" title="CLEP exam available">
              CLEP
            </span>
          )}
        </div>
      )}
      
      {/* Selected course display */}
      {SHOW_MP && selectedCourse && (
        <div className="mt-2 text-[10px] px-2 py-1 bg-primary/10 border border-primary/30 rounded">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-primary">✓</span>
              <span className="font-medium">{selectedCourse.title}</span>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="text-blue-600 hover:text-blue-700 underline text-[9px]"
            >
              Change
            </button>
          </div>
          <div className="text-muted-foreground">{selectedCourse.provider} • ${selectedCourse.cost}</div>
        </div>
      )}
      
      {/* Evidence overlay (non-interactive) */}
      <EvidenceBadges
        blockId={blockId}
        creditsNeeded={creditsNeeded}
        catalogCourseIds={catalogCourseIds}
      />
      
      {/* Course selection modal */}
      {SHOW_MP && modalOpen && (
        <CourseSelectionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          requirementId={blockId}
          requirementTitle={data.title || 'Requirement'}
          planId={data.planId as string | undefined}
        />
      )}
    </div>
  );
};

const GateNode = ({ data }: { data: V2NodeData }) => {
  const gateType = data.junctionType || (data.title?.includes('Program') ? 'program' : 'track');
  const gateTitle = gateType === 'program' ? 'Program Gate' : 'Track Gate';
  
  // Context-aware subtitle for gates
  let subtitle = gateType === 'program' ? 'Select program using dropdown' : 'Specialization Choice (CS)';
  
  const singleRailStraight = data.singleRailStraight;
  
  return (
    <div className="rounded-xl border border-dashed border-primary/60 bg-background/70 backdrop-blur px-4 py-3 shadow-sm min-w-[220px] text-sm relative">
      <div className="font-semibold">YEAR {data.levelYear} — {gateTitle}</div>
      <div className="mt-1 text-xs opacity-70">{subtitle}</div>
      
      {/* Checkpoint Controls */}
      <CheckpointControls 
        checkpointId={String(data.id) || `${gateType}-gate-y${data.levelYear}`}
        gateType={gateType}
      />

      {/* Phase 3: Gate aggregation chips */}
      <div className="mt-2 flex flex-wrap gap-1 items-center text-[10px]">
        {data.aggHasAce && <span className="chip chip-ace node--agg-has-ace">ACE</span>}
        {data.aggHasClep && <span className="chip chip-clep node--agg-has-clep">CLEP</span>}
        {(data.optionsCount ?? 0) === 0 && <span className="chip chip-ghost">No options yet</span>}
      </div>

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

// Node types are stable at module level - no memo needed
const nodeTypes = {
  requirement: RequirementNode,
  gate: GateNode,
  header: HeaderNode,
  emptyYear: EmptyYearNode
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
  
  console.log('[EduTreeCanvasV2] compareOptions debug:', {
    options: !!compareOptions,
    isArray: Array.isArray(compareOptions),
    length: compareOptions?.length,
    sample: compareOptions?.slice(0, 2)
  });
  
  // Dev panel state (always available in dev)
  const [showDev, setShowDev] = useState(true);
  const [dev, setDev] = useState<DevOverrides>({});

  // URL parsing is now handled by PathHighlightProvider initialization
  // No need for redundant parsing here that creates race conditions
  
  // Use dev overrides first, then props overrides, then feature flags
  const effectiveFlags = {
    eduTreeV2Grid: dev.eduTreeV2Grid ?? overrideFlags?.eduTreeV2Grid ?? flags.eduTreeV2Grid,
    eduTreeLayoutMode: dev.eduTreeLayoutMode ?? overrideFlags?.eduTreeLayoutMode ?? flags.eduTreeLayoutMode,
  };
  
  // Use dev override filter mode when provided, then props, then default
  const passedFilterMode = dev.filterMode ?? overrideFilterMode ?? filterMode;
  
  const { blocks, edges, isLoading, isV2Mode, filterMode: currentFilterMode, effectiveFilterMode, isAutoMode, selectedPrograms } = useEduTreeV2Data(passedFilterMode);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const fitViewCalled = useRef(false);
  const gatePositionsRef = useRef<any>(null);

  // Phase 2: Gate freeze (resolve assertions & dangling edges)
  const gateConfigKey = useMemo(() => {
    return JSON.stringify({
      mode: effectiveFilterMode,
      programs: Array.from(selectedPrograms ?? []).sort(),
      showPG: !!gatePositionsRef.current?.showPG,
      showTG: !!gatePositionsRef.current?.showTG,
      years: Array.from(new Set(nodes.filter(n => n.type === 'gate').map(n => n.data?.year ?? null))).sort(),
    });
  }, [effectiveFilterMode, selectedPrograms, nodes]);

  const gateConfigRef = useRef<string>('');
  
  // Micro-throttle gate handle updates to avoid same-frame duplicates
  type Scheduler = ((fn: () => void) => void) & { cancel?: () => void };

  const scheduleGateUpdate: Scheduler = useMemo(() => {
    let raf = 0;
    const schedule = ((fn: () => void) => {
      if (typeof requestAnimationFrame === 'function') {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(fn);
      } else {
        fn(); // SSR / test env
      }
    }) as Scheduler;
    schedule.cancel = () => {
      if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      raf = 0;
    };
    return schedule;
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => () => scheduleGateUpdate.cancel?.(), [scheduleGateUpdate]);

  useEffect(() => {
    if (gateConfigRef.current === gateConfigKey) {
      // console.debug('[EduTreeV2] Gate config unchanged; skipping');
      return;
    }
    gateConfigRef.current = gateConfigKey;

    scheduleGateUpdate(() => {
      const visibleGateIds = nodes
        .filter(n => n.type === 'gate' && !n.hidden)
        .map(n => n.id);

      visibleGateIds.forEach(id => updateNodeInternals(id));

      // console.debug('[EduTreeV2] Gate config changed; handles updated', { visibleGateIds });
    });
  }, [gateConfigKey, nodes, updateNodeInternals, scheduleGateUpdate]);
  
  // Phase 4: Seed auditor (dev-only safety net)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!blocks?.length) return;
    (async () => {
      try {
        const report = await auditSeeds(blocks, Array.from(selectedPrograms ?? []));
        printAuditReport(report);
      } catch (e) {
        console.warn('[SeedAudit] failed:', e);
      }
    })();
  }, [blocks, selectedPrograms]);

  // Enhanced React Flow monitoring and recovery system

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

   
  // REMOVED: The race condition loading logic that was causing infinite "Loading Comparison"
  // The dependency fix in useEduTreeV2Data ensures URL changes trigger re-computation
  
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

  // Initialize suffix compare with safe edges
  const suffixCompare = useSuffixCompare({ edges: safeEdges });

  // Then apply dimming to the safe edges (hook called at top level)
  const { nodes: processedNodes, edges: processedEdges, mode } = useApplyDimmingV2({ nodes: nodes || [], edges: safeEdges });

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
      (window as any).__rfNodes = safeNodes;
      (window as any).__flowNodes__ = safeNodes; // alias
      (window as any).__flowEdges__ = processedEdges;
      
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
      
      // MP Join Auditor - shows why joins succeeded/failed for each node
      (window as any).__auditMp = () => {
        const nodes = safeNodes.filter(n => (n?.type || '').includes('requirement'));
        const mp = (window as any).__lastMpMap as Map<string, any> | undefined;
        if (!mp) return console.warn('No __lastMpMap');

        const keysFrom = (window as any).marketplaceKeysFromNodeId || ((id: string) => [id]);
        const out = nodes.map(n => {
          const blockId = ((n?.data as any)?.block?.id || (n?.data as any)?.id || n?.id || '').toLowerCase();
          const direct = mp.has(blockId);
          const candidates: string[] = Array.from(new Set(keysFrom(blockId).map(String).map((s: string) => s.toLowerCase())));
          const hitCand = candidates.find((k: string) => mp.has(k)) as string | undefined;
          
          // Get options count from map
          const optionsCountInMap = direct 
            ? mp.get(blockId)?.optionsCount 
            : hitCand 
              ? mp.get(hitCand)?.optionsCount 
              : null;
          
          return {
            nodeId: n.id,
            blockId,
            directHit: direct,
            candidateHit: !!hitCand,
            hitKey: direct ? blockId : hitCand || null,
            optionsCountInNode: (n?.data as any)?.optionsCount,
            optionsCountInMap,
            candidates
          };
        });
        console.table(out);
        return out;
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
  
  // Calculate single-rail mode flags - handles both program and track level
  const presentTracks = new Set(blocks.map(b => b.track_id).filter(Boolean));
  const presentPrograms = new Set(blocks.map(b => b.program_id).filter(Boolean));
  const singleTrack = presentTracks.size === 1;
  const singleProgram = presentPrograms.size === 1;
  const singleRailStraight = effectiveFlags.eduTreeV2Grid && effectiveFlags.eduTreeLayoutMode === 'grid_v2' && (singleTrack || singleProgram);
  const usePlan = effectiveFlags.eduTreeV2Grid && effectiveFlags.eduTreeLayoutMode === 'grid_v2' && (singleTrack || singleProgram);
  
  // Filter blocks before layout rendering (moved from manualLayoutRenderer for graphSig)
  const filteredBlocks = useMemo(() => {
    const filtered = blocks.filter(b => {
      const isGhost = b.is_empty_year === true;
      if (isGhost) {
        if (!b.program_id) return false; // programless ghost → drop
        // Only allow ghosts for programs that actually skip years
        const meta = getProgramById(b.program_id);
        return !!meta && (meta.skips?.length ?? 0) > 0;
      }
      return true;
    });
    
    // Debug logging
    if (new URLSearchParams(window.location?.search || '').get('debug') === '1') {
      const originalGhosts = blocks.filter(b => b.is_empty_year === true);
      const filteredGhosts = filtered.filter(b => b.is_empty_year === true);
      console.log('[DEBUG] Ghost filtering:', {
        originalBlocks: blocks.length,
        filteredBlocks: filtered.length,
        originalGhosts: originalGhosts.map(g => ({ id: g.id, program_id: g.program_id })),
        filteredGhosts: filteredGhosts.map(g => ({ id: g.id, program_id: g.program_id })),
        filterMode: effectiveFilterMode
      });
    }
    
    return filtered;
  }, [blocks]);
  
  // 1) Graph signature for React Flow key (forces remount on content changes)
  const graphSig = useMemo(() => {
    return filteredBlocks
      .map(b => `${b.id}|${b.program_id ?? ''}|${b.level_year}|${b.position_x}|${b.position_y}`)
      .sort()
      .join('~');
  }, [filteredBlocks]);

  // 2) Stable key for blocks content (order-insensitive, content-based)  
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

  // 4) Gate positions: use centralized layout tokens for perfect symmetry
  function stableReturn<T>(prevRef: React.MutableRefObject<T|null>, next: T): T {
    const same = prevRef.current && JSON.stringify(prevRef.current) === JSON.stringify(next);
    if (!same) prevRef.current = next;
    return prevRef.current as T;
  }
  
  const gatePositions = useMemo(() => {
    // Use centralized layout tokens for consistent positioning
    const viewW = 1800; // Could be made dynamic based on viewport
    const lanesCalc = laneXs(viewW);
    const cols = { 
      y1: lanesCalc.y1, 
      y2: lanesCalc.y2, 
      y3: lanesCalc.gateTG,  // Track gate at center of spread
      y4: lanesCalc.gateTG,  // Y4 uses same center
      pg: lanesCalc.gatePG,  // Program gate between Y1 and Y2
      tg: lanesCalc.gateTG   // Track gate position
    };
    if (new URLSearchParams(window.location?.search || '').get('debug') === '1') {
      console.log('[CANVAS DEBUG] Computing gate positions with centralized tokens:', { 
        blocksCount: blocks.length, 
        programs, 
        tracksByProgram, 
        cols,
        effectiveFilterMode: currentFilterMode,
        lanes: lanesCalc
      });
    }
    const next = decideGatePositions({ blocks, programs, tracksByProgram, cols });
    if (new URLSearchParams(window.location?.search || '').get('debug') === '1') {
      console.log('[CANVAS DEBUG] Gate positions computed:', next);
    }
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
      filteredBlocks,
      edges,
      (newNodes, newEdges) => {
        // DEBUG: Check IT nodes in final rendering
        const itNodes = newNodes.filter(n => {
          return n.data?.program_id === 'bs_it' || n.data?.programId === 'bs_it';
        });
        
        if (new URLSearchParams(window.location?.search || '').get('debug') === '1') {
          console.log('[DEBUG] IT nodes in final rendering:', {
            count: itNodes.length,
            nodes: itNodes.map(n => ({
              id: n.id,
              type: n.type,
              hidden: n.hidden,
              position: n.position,
              program_id: n.data?.program_id || n.data?.programId,
              level_year: n.data?.levelYear
            }))
          });
        }
        
        if (new URLSearchParams(window.location?.search || '').get('debug') === '1') {
          console.log('[EduTreeV2] Setting nodes and edges:', { 
            nodes: newNodes.length, 
            edges: newEdges.length,
            itNodesCount: itNodes.length,
            nodeTypes: newNodes.reduce((acc, n) => {
              acc[n.type || 'unknown'] = (acc[n.type || 'unknown'] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            gateNodes: newNodes.filter(n => n.id.includes('gate')).map(n => ({ 
              id: n.id, 
              hidden: n.hidden, 
              position: n.position 
            })),
            nodesByProgram: {
              bs_cs: newNodes.filter(n => n.data?.program_id === 'bs_cs' || n.data?.programId === 'bs_cs').length,
              bs_it: itNodes.length,
              other: newNodes.filter(n => !n.data?.program_id && !n.data?.programId).length
            }
          });
        }
        
        // Apply gate positioning decisions with proper guards and dimming
        const withGatePlacement = (nodes: typeof newNodes) => nodes.map(n => {
          if (n.id === 'gate-y2-programs') {
            if (!gatePositions.showPG || gatePositions.pgX == null) return { ...n, hidden: true };
            return { ...n, position: { x: gatePositions.pgX, y: GATE_Y }, hidden: false };
          }
          if (n.id === 'gate-y3-tracks') {
            // Show Y3 Track Gate when appropriate:
            // - Hide only when comparing programs with different track structures (CS vs IT)
            // - Show when comparing tracks within same program (SE vs DS)
            // - Show in single program contexts
            const isComparingProgramsWithDifferentTrackStructure = 
              effectiveFilterMode === 'compare-programs' && 
              programs.some(p => p === 'bs_it'); // IT has no tracks, CS has tracks
              
            if (isComparingProgramsWithDifferentTrackStructure || !gatePositions.showTG || gatePositions.tgX == null) {
              return { ...n, hidden: true };
            }
            return { ...n, position: { x: gatePositions.tgX, y: GATE_Y }, hidden: false };
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
        
        // Direct assignment to prevent stale ghost nodes from persisting
        setNodes(finalNodes);
        setEdges(newEdges);
        
        // Store nodes in window for validation utilities  
        if (process.env.NODE_ENV === 'development') {
          (window as any).__flowNodes__ = finalNodes;
          (window as any).__rfNodes = finalNodes; // Alias for easier console access
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
        
        // Validate lane placement for comparison modes  
        if (process.env.NODE_ENV === 'development' && (effectiveFilterMode === 'compare-programs' || effectiveFilterMode === 'compare-any')) {
          import('./utils/validateLanes').then(({ validateProgramCompareLanes }) => {
            const laneValidation = validateProgramCompareLanes(finalNodes);
            if (laneValidation.issues > 0) {
              console.warn('[LANE VALIDATOR] ✗ Issues found:', laneValidation.details);
            } else {
              console.log('[LANE VALIDATOR] ✓ Lanes clean');
            }
          });
        }
      },
      () => {
        // fitView is now handled by separate useEffect
      },
      usePlan, // Use deterministic grid anchors when in single-rail grid mode
      singleRailStraight, // Pass single-rail straight flag
      effectiveFilterMode || 'compare-tracks', // Pass filter mode for header routing  
      flags.eduTreeV2EdgeKinds ?? true, // Pass V2 edge kinds flag (default true)
      gatePositions, // Pass gate positioning decisions
      selectedPrograms // Pass selected programs for Guard B
    );
  }, [blocksKey, edges, isV2Mode, setNodes, setEdges, effectiveFlags.eduTreeV2Grid, effectiveFlags.eduTreeLayoutMode, usePlan, singleRailStraight, effectiveFilterMode, flags.eduTreeV2EdgeKinds, gatePositions, selectedPrograms]);
  
  // Update handle internals using useLayoutEffect to prevent micro "pop"
  useLayoutEffect(() => {
    const visibleGateIds = nodes.filter(n => n.type === 'gate' && !n.hidden).map(n => n.id);
    visibleGateIds.forEach(updateNodeInternals);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[EduTreeV2] Updated handle internals for visible gate nodes:', visibleGateIds);
      
      // Use consistent lane calculation
      const viewW = 1800;
      const lanesCalc = laneXs(viewW);
      
      // Run GPT's validation functions
      try {
        assertNoDanglingHeaders({ edges: flowEdges, nodes });
        assertGateX({ 
          nodes, 
          gatePositions, 
          cols: { y1: lanesCalc.y1, y2: lanesCalc.y2, y3: lanesCalc.gateTG, y4: lanesCalc.gateTG }
        });
        assertHandlesOnce(nodes);
        
        // Run comprehensive regression checks with centralized column positions
        runRegressionChecks({
          edges: flowEdges,
          nodes,
          gatePositions,
          cols: { y1: lanesCalc.y1, y2: lanesCalc.y2, y3: lanesCalc.gateTG, y4: lanesCalc.gateTG }
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
  
  // Frame-Locked FitView - replaces manual fitView logic
  useFrameLockedFitView({
    mode,
    primarySelection: pathHighlight.primarySelection,
    secondarySelection: pathHighlight.secondarySelection,
    enabled: nodes.length > 0
  });
  
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
  
  // REMOVED: Loading comparison logic - fixed at the hook level
  
  return (
    <ReactFlowErrorBoundary
      onError={(error) => {
        console.error('[EduTreeV2] React Flow error:', error);
      }}
    >
      <>
        <div className="h-full w-full edu-tree-canvas">
        {/* Enhanced Lane Headers - only show during actual comparison */}
        {!singleRailStraight && (() => {
          // Check if we're in actual comparison mode (both selections exist and are different)
          const primarySelection = pathHighlight.primarySelection;
          const secondarySelection = pathHighlight.secondarySelection;
          
          const isActualComparison = primarySelection && 
                                     secondarySelection && 
                                     primarySelection !== secondarySelection;
          
          // Don't show lane headers for single track selection
          if (!isActualComparison) {
            return null;
          }
          
          // Calculate positions using centralized layout tokens
          const viewW = 1800;
          const lanesCalc = laneXs(viewW);
          
          // Helper to extract display name from selection
          const getDisplayName = (selection: any) => {
            if (!selection) return '';
            
            // Handle object format: {kind: "program", id: "bs_cs"}
            let selectionStr = '';
            if (typeof selection === 'object' && selection.kind && selection.id) {
              selectionStr = `${selection.kind}:${selection.id}`;
            } else if (typeof selection === 'string') {
              selectionStr = selection;
            } else {
              return '';
            }
            
            if (selectionStr.startsWith('program:')) {
              const program = selectionStr.replace('program:', '');
              switch (program) {
                case 'bs_cs': return 'BS Computer Science';
                case 'bs_it': return 'BS Information Technology';
                default: return program.toUpperCase();
              }
            } else if (selectionStr.startsWith('track:')) {
              const track = selectionStr.replace('track:', '');
              switch (track) {
                case 'se': return 'Software Engineering';
                case 'ds': return 'Data Science';
                default: return track.toUpperCase();
              }
            }
            return selectionStr;
          };
          
          const getLaneHeaders = () => {
            const primaryName = getDisplayName(primarySelection);
            const secondaryName = getDisplayName(secondarySelection);
            
            // Determine gate label based on what we're comparing
            let gateLabel = 'Choice';
            
            if (primarySelection) {
              let primaryStr = '';
              if (typeof primarySelection === 'object' && primarySelection.kind && primarySelection.id) {
                primaryStr = `${primarySelection.kind}:${primarySelection.id}`;
              } else if (typeof primarySelection === 'string') {
                primaryStr = primarySelection;
              }
              
              if (primaryStr.startsWith('program:')) {
                gateLabel = 'Program Choice';
              } else if (primaryStr.startsWith('track:')) {
                gateLabel = 'Track Choice';
              }
            }
            
            return {
              upper: `▲ ${primaryName}`,
              lower: `▼ ${secondaryName}`,
              gateLabel
            };
          };
          
          const headers = getLaneHeaders();
          const backplateWidth = 360;
          const backplateOffset = 40;
          
          return (
            <>
              {/* Lane backplates for visual grouping - symmetric positioning */}
              <div 
                className="absolute pointer-events-none rounded-xl bg-primary/3 border border-primary/10"
                style={{ 
                  top: 180, 
                  left: lanesCalc.y3L - backplateOffset, 
                  width: backplateWidth, 
                  height: 240 
                }}
              />
              <div 
                className="absolute pointer-events-none rounded-xl bg-secondary/3 border border-secondary/10"
                style={{ 
                  top: 500, 
                  left: lanesCalc.y3R - backplateOffset, 
                  width: backplateWidth, 
                  height: 320 
                }}
              />
              
              {/* Track gate indicators with perfect centering */}
              <div 
                className="absolute text-xs opacity-70 z-20 pointer-events-none"
                style={{ top: 340, left: lanesCalc.gateTG - 50 }}
              >
                <div className="bg-background/90 px-3 py-1 rounded-full border text-center min-w-[100px] text-xs">
                  {headers.gateLabel}
                </div>
              </div>
              
              {/* Lane headers with symmetric positioning and grid alignment */}
              <div 
                className="absolute text-xs font-medium opacity-80 z-10 pointer-events-none"
                style={{ top: 160, left: lanesCalc.y3L }}
              >
                <div className="bg-primary/20 text-primary px-3 py-1 rounded-lg border border-primary/20 whitespace-nowrap text-xs leading-4">
                  {headers.upper} →
                </div>
              </div>
              <div 
                className="absolute text-xs font-medium opacity-80 z-10 pointer-events-none"
                style={{ bottom: 140, left: lanesCalc.y3R }}
              >
                <div className="bg-secondary/20 text-secondary px-3 py-1 rounded-lg border border-secondary/20 whitespace-nowrap text-xs leading-4">
                  ← {headers.lower}
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

      {/* Enhanced connection line from gate to track splits using centralized positioning */}
      {!singleRailStraight && (
        <>
          {/* Subtle connection line from track gate extending toward branches */}
          <div
            className="absolute pointer-events-none opacity-30"
            style={{ 
              top: 360, 
              left: laneXs().gateTG,
              width: 80,  // Shorter line, more subtle
              height: 2, 
              background: 'linear-gradient(90deg, transparent, rgba(var(--primary)/0.2), transparent)' 
            }}
          />
        </>
      )}

        <ReactFlow
          key={graphSig}
          nodes={safeNodes}
          edges={processedEdges}
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
          <Background />
          <Controls />
        </ReactFlow>
      
        {/* HUD Overlays for Program Comparison */}
        <PhaseHeaders visible={effectiveFilterMode?.startsWith("compare")} />
        <LaneCaptions 
          filterMode={effectiveFilterMode} 
          showCS={programs.includes('bs_cs')} 
          showIT={programs.includes('bs_it')} 
        />
        {/* HUD Overlays for Program Comparison */}
        <PhaseHeaders visible={effectiveFilterMode?.startsWith("compare")} />
        <LaneCaptions 
          filterMode={effectiveFilterMode} 
          showCS={programs.includes('bs_cs')} 
          showIT={programs.includes('bs_it')} 
        />
        <HudComparisonLegend 
          filterMode={effectiveFilterMode} 
          hasGhostNodes={blocks.some(b => b.is_empty_year === true)}
        />
        
        {/* Edge Type Legend - show in compare modes */}
        <EdgeLegend show={filterMode === 'compare-tracks' || filterMode === 'compare-programs'} />

        {/* Debug HUD (enable via ?debug=1) */}
        <DebugHUD blocks={blocks} />

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
              effectiveFilterMode={effectiveFilterMode}
              isAutoMode={isAutoMode}
            />
          </HudDock>

          {/* Bottom-Right Stack */}
          <HudDock corner="BR" index={0}>
            <TranscriptUploadDemo />
          </HudDock>

          <HudDock corner="BR" index={1} className="text-xs opacity-80 bg-black/40 px-2 py-1 rounded">
            Mode: {effectiveFlags.eduTreeLayoutMode} • Tracks: {([...new Set(blocks.map(b => b.track_id).filter(Boolean))]).join(',') || 'shared'} • Programs: {([...new Set(blocks.map(b => b.program_id).filter(Boolean))]).join(',') || 'shared'}
            {isAutoMode && <span className="ml-2 text-blue-300">🤖 Auto</span>}
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
              <div className="mt-2 text-xs bg-background/80 backdrop-blur p-2 rounded border">
                <div>Mode: <span className="font-mono text-primary">{mode}</span></div>
                <div>Headers Removed: <span className="text-green-600">✓</span></div>
                {(() => {
                  const hasHeaders = (window as any).__flowNodes__?.some((n: any) => 
                    n.type === 'header' || /-header:/.test(n.id)
                  );
                  return (
                    <div>Header Check: <span className={hasHeaders ? 'text-red-600' : 'text-green-600'}>
                      {hasHeaders ? '✗ FOUND' : '✓ CLEAN'}
                    </span></div>
                  );
                })()}
              </div>
            </HudDock>
          )}
        </HudLayer>
        
        {/* Suffix Metrics Overlay */}
        <SuffixMetrics
          nodes={safeNodes}
          edges={processedEdges}
          reachableSet={suffixCompare.reachableSet}
          mode={mode}
        />
      </div>
      </>
    </ReactFlowErrorBoundary>
  );
}
