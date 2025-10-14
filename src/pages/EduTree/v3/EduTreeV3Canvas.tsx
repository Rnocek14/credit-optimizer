import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, ReactFlowProvider, useReactFlow, Position, MarkerType } from '@xyflow/react';
import { useSearchParams } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import './styles/path-dimming.css';
import './styles/EduTreeV3.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { validateNoOverlaps } from './engine/overlapValidator';
import { buildEduTreeGraph, buildEduTreeGraphWithMetrics } from './engine/buildGraph';
import { createCollapsedView, expandBundle, collapseBundle, BundleCard } from './engine/createCollapsedView';
import { injectCheckpoints } from './engine/checkpointManager';
import { adaptSeedDataV2 } from './engine/v2Adapter';
import { LAYOUT_TOKENS } from './utils/layoutTokensV3';
import { V3Node as V3NodeType, V3Edge as V3EdgeType, V3Graph } from './types/v3';
import { GOLDEN_LAYOUT_SEED } from '../data/seedDataV2';
import V3Clamp from './dev/V3Clamp';
import V3DBG from './dev/V3Debug';
import V3DebugPanel from './dev/V3DebugPanel';
import { useV3KeyboardShortcuts } from './dev/KeyboardShortcuts';
import { useLifePathGraph } from '@/hooks/useLifePathGraph';
import { lifePathToV3, BridgeMeta } from './data/lifePathBridge';
import { DevToolbar } from './dev/DevToolbar';

// Vertical flow imports
import { calculateVerticalLayout } from './engine/layoutEngineVertical';
import { mapEdgesVertical } from './engine/edgeMapperVertical';
import { VERT } from './utils/layoutTokensVertical';
import CompareMiniCards from './components/CompareMiniCards';
import TrackCompareDrawer from './components/TrackCompareDrawer';
import { runV3HealthCheck } from './dev/runtimeChecks';
import CompareToggle from './components/CompareToggle';
import { AlternativesDrawer } from './components/AlternativesDrawer';
import { getAlternativesForNode } from './engine/getAlternatives';
import { applyAlternative, type AlternativeSelection } from './engine/applyAlternative';

// V3-specific node components
import V3RequirementNode from './components/V3RequirementNode';
import V3GateNode from './components/V3GateNode';
import V3YearNode from './components/V3YearNode';
import V3TrackBundleNode from './components/V3TrackBundleNode';
import { V3CheckpointNode } from './components/V3CheckpointNode';

const nodeTypes = {
  requirement: V3RequirementNode,
  gate: V3GateNode,
  year: V3YearNode,
  'track-bundle': V3TrackBundleNode,
  checkpoint: V3CheckpointNode,
};

/**
 * Preserves positions of unaffected nodes during graph updates
 * Prevents jarring jumps when applying alternatives
 */
function preservePositions<T extends { id: string; position: { x: number; y: number } }>(
  nextNodes: T[],
  prevNodes: T[] | undefined,
  affectedNodeIds: string[]
): T[] {
  if (!prevNodes) return nextNodes;
  
  const prevPositions = new Map(
    prevNodes.map(n => [n.id, n.position])
  );
  
  return nextNodes.map(node => {
    // Re-layout affected nodes, preserve others
    if (affectedNodeIds.includes(node.id)) {
      return node;
    }
    
    const prevPos = prevPositions.get(node.id);
    return prevPos ? { ...node, position: prevPos } : node;
  });
}

interface EduTreeV3CanvasProps {
  enableMetrics?: boolean;
}

function EduTreeV3CanvasInner({ enableMetrics = false }: EduTreeV3CanvasProps) {
  // 🛡️ SAFE_MODE: Set to true to render a static 3-node graph for diagnosis
  const SAFE_MODE = false;
  
  const { fitView } = useReactFlow();
  const [layoutMetrics, setLayoutMetrics] = useState<any>(null);
  const [domMetrics, setDomMetrics] = useState<any>(null);
  const [focusedEdges, setFocusedEdges] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fullGraph, setFullGraph] = useState<V3Graph | null>(null);
  const [bundles, setBundles] = useState<Map<string, BundleCard>>(new Map());
  const [currentGraph, setCurrentGraph] = useState<V3Graph | null>(null);
  
  // Instance-id probe to verify no ReactFlow remounts
  const instanceIdRef = useRef(crypto.randomUUID());
  
  // FIX #1: Safe graph setter with tracking
  const safeSetCurrentGraph = useCallback(
    (g: V3Graph, tag: string) => {
      const n = g?.nodes?.length ?? 0;
      const e = g?.edges?.length ?? 0;
      console.log(`[setCurrentGraph] ${tag}:`, { nodes: n, edges: e });

      if (import.meta.env.DEV && (n === 0 || !Array.isArray(g.nodes) || !Array.isArray(g.edges))) {
        console.trace('[setCurrentGraph] IGNORE empty/invalid graph from:', tag, g);
        return; // 🔒 CRITICAL: do not commit empties
      }
      setCurrentGraph(g);
    },
    []
  );

  // Removed freeze guards - allowing natural React state updates
  
  // Phase 3 Fix: Vertical flow feature flag (check route path + URL + localStorage)
  const [useVerticalLayout, setUseVerticalLayout] = useState(() => {
    const path = window.location.pathname;
    if (path === '/edu-tree-v3-vertical') return true; // Force vertical for this route
    
    // CRITICAL: Check URL first (route may have ?layout=vertical)
    const urlParams = new URLSearchParams(window.location.search);
    const layoutFromUrl = urlParams.get('layout');
    if (layoutFromUrl === 'vertical') return true;
    if (layoutFromUrl === 'horizontal') return false;
    
    // Fall back to localStorage
    return localStorage.getItem('flags.verticalLayout') === 'true';
  });
  
  // Comparison UI state
  const [showComparison, setShowComparison] = useState(false);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  
  // Phase 3b: Alternatives drawer state
  const [alternativesDrawerOpen, setAlternativesDrawerOpen] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<{ id: string; sourceNodeId: string } | null>(null);
  const [selectedAlternatives, setSelectedAlternatives] = useState<AlternativeSelection[]>([]);
  const [selectedAlternative, setSelectedAlternative] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);
  
  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(() => {
    return localStorage.getItem('flags.showV3Debug') === 'true';
  });
  
  // Keyboard shortcuts (Shift+D for debug, Shift+C for compare)
  useV3KeyboardShortcuts({
    onToggleDebug: () => {
      setShowDebugPanel(prev => {
        const next = !prev;
        localStorage.setItem('flags.showV3Debug', String(next));
        return next;
      });
    },
    onToggleCompare: useVerticalLayout && selectedNodeId === 'gate-y3-tracks'
      ? () => setShowComparison(prev => !prev)
      : undefined
  });
  
  // Log ReactFlow instance on mount (detect remounts)
  useEffect(() => {
    console.log('[RF instance]', instanceIdRef.current);
  }, []);

  // === Phase 2: Bridge support - read ?source=lifepath flag ===
  const [searchParams, setSearchParams] = useSearchParams();
  const useLifePathSource = searchParams.get('source') === 'lifepath';
  
  // CRITICAL: Only load Life Path data when explicitly requested
  const lifePathGraph = useLifePathGraph(useLifePathSource ? 'goal-software-engineer' : null);
  
  // === Phase 3: Checkpoint feature flag - STATE AS SOURCE OF TRUTH ===
  const [enableCheckpoints, setEnableCheckpoints] = React.useState(false);
  
  // Sync layout state with URL params (reactive)
  useEffect(() => {
    const path = window.location.pathname;
    
    // 1. If on /edu-tree-v3-vertical route, always use vertical
    if (path === '/edu-tree-v3-vertical') {
      setUseVerticalLayout(prev => {
        if (prev === true) return prev; // Already correct
        if (import.meta.env.DEV) {
          console.log('[V3 Canvas] Layout forced to VERTICAL by route path');
        }
        return true;
      });
      return; // Don't check query params
    }
    
    // 2. Otherwise, check query params
    const layoutParam = searchParams.get('layout');
    if (layoutParam === 'vertical' || layoutParam === 'horizontal') {
      const layoutFromUrl = layoutParam === 'vertical';
      setUseVerticalLayout(prev => {
        if (prev === layoutFromUrl) return prev; // No-op if same
        if (import.meta.env.DEV) {
          console.log('[V3 Canvas] Layout synced from URL param:', layoutFromUrl ? 'vertical' : 'horizontal');
        }
        return layoutFromUrl;
      });
    }
    // 3. If no layout param, respect localStorage or keep current state
  }, [searchParams]); // Only depend on URL params
  
  // Sync checkpoint state with URL (after layout is synced)
  useEffect(() => {
    const checkpointsFromUrl = searchParams.get('checkpoints') === '1';
    
    if (checkpointsFromUrl && !useVerticalLayout) {
      if (import.meta.env.DEV) {
        console.warn('[V3] Checkpoints require layout=vertical, ignoring ?checkpoints=1');
      }
      setEnableCheckpoints(false);
      return;
    }
    
    setEnableCheckpoints(prev => {
      if (prev === checkpointsFromUrl) return prev; // No-op if same
      if (import.meta.env.DEV) {
        console.log('[V3 Canvas] Checkpoints synced from URL:', checkpointsFromUrl);
      }
      return checkpointsFromUrl;
    });
  }, [searchParams, useVerticalLayout]); // Don't include enableCheckpoints
  
  // Phase 3B: Guard vertical mode - auto-enable checkpoints
  useEffect(() => {
    if (useVerticalLayout && !enableCheckpoints) {
      if (import.meta.env.DEV) {
        console.warn('[V3 Canvas] Vertical layout requires checkpoints - auto-enabling');
      }
      toast.info('Checkpoints enabled for vertical layout', {
        description: 'Vertical mode requires checkpoints to be active'
      });
      setEnableCheckpoints(true);
    }
  }, [useVerticalLayout, enableCheckpoints]);
  
  // Compute readiness flags BEFORE toggle handler uses them
  const isLifePath = searchParams.get('source') === 'lifepath';
  
  // Robust readiness detector with diagnostic logging
  const lifepathReady = useMemo(() => {
    if (!isLifePath) return false;
    
    const hasGraphNodes = Array.isArray(lifePathGraph?.graph?.nodes) && lifePathGraph.graph.nodes.length > 0;
    const ready = hasGraphNodes && !lifePathGraph?.loading;
    
    if (import.meta.env.DEV) {
      console.log('[V3] LifePath readiness:', {
        hasGraphNodes,
        nodeCount: lifePathGraph?.graph?.nodes?.length ?? 0,
        ready,
        loading: lifePathGraph?.loading
      });
    }
    
    return ready;
  }, [isLifePath, lifePathGraph]);
  
  // Handler to toggle checkpoints
  const handleToggleCheckpoints = useCallback(() => {
    if (!useVerticalLayout) {
      toast.error('Checkpoints require vertical layout');
      return;
    }
    
    // Check if data is ready (use canonical lifepathReady flag)
    if (isLifePath && !lifepathReady) {
      toast.error('Life Path data still loading...');
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log('[Toggle] Checkpoint state:', {
        current: enableCheckpoints,
        new: !enableCheckpoints,
        isLifePath,
        lifepathReady,
        hasGraphNodes: lifePathGraph?.graph?.nodes?.length ?? 0
      });
    }
    
    const newValue = !enableCheckpoints;
    setEnableCheckpoints(newValue);
    
    // Mirror state to URL using React Router (reactive)
    const newParams = new URLSearchParams(searchParams);
    if (newValue) {
      newParams.set('checkpoints', '1');
      newParams.set('source', 'lifepath'); // checkpoints need lifepath data
      newParams.set('layout', 'vertical');
    } else {
      newParams.delete('checkpoints');
    }
    setSearchParams(newParams, { replace: true });
    
    toast.success(`Checkpoints ${newValue ? 'enabled' : 'disabled'}`);
  }, [enableCheckpoints, useVerticalLayout, isLifePath, lifepathReady]);
  
  // Handler to toggle data source
  const handleToggleDataSource = useCallback(() => {
    // Clear selection state when switching data sources
    setSelectedAlternative(null);
    setSelectedCheckpoint(null);
    
    const newSource = useLifePathSource ? null : 'lifepath';
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (newSource) {
      newParams.set('source', 'lifepath');
    } else {
      newParams.delete('source');
    }
    setSearchParams(newParams);
    
    // Show feedback
    toast.success(`Switched to ${newSource ? 'LifePath' : 'Seed'} data`, {
      description: newSource 
        ? 'Loading real fork alternatives...' 
        : 'Using demo seed data'
    });
  }, [useLifePathSource, searchParams, setSearchParams]);
  
  // Handler to toggle LifePath bundles (beta feature gate)
  const handleToggleLpBundles = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    const currentValue = newParams.get('lp_bundles') === '1';
    
    if (currentValue) {
      newParams.delete('lp_bundles');
    } else {
      newParams.set('lp_bundles', '1');
    }
    setSearchParams(newParams);
    
    toast.success(`LifePath bundling ${currentValue ? 'disabled' : 'enabled (beta)'}`, {
      description: currentValue 
        ? 'Showing individual skills/courses' 
        : 'Grouping by tier for cleaner view'
    });
  }, [searchParams, setSearchParams]);
  
  // Bridge Life Path Graph to V3 format if enabled
  const bridgedData = useMemo(() => {
    if (!useLifePathSource || !lifePathGraph?.graph?.nodes) {
      return null;
    }
    
    console.log('[V3 Canvas] Bridging Life Path Graph to V3 format');
    return lifePathToV3(lifePathGraph.graph, { showAlternatives: false });
  }, [useLifePathSource, lifePathGraph?.graph]);
  
  // Bridge metadata for __dumpV3()
  // Memoize to prevent object churn triggering re-renders
  const sourceMeta: BridgeMeta = useMemo(() => {
    return bridgedData?.meta ?? {
      forksDetected: 0,
      tiers: 4,
      slugsUsed: [],
      alternativesByNode: {}
    };
  }, [bridgedData]);

  // Compute stable build key from primitive values only (reactive to toggles + data loading)
  // STATE IS SOURCE OF TRUTH - no URL mixing to prevent reactivity bugs
  const isVertical = useVerticalLayout;
  
  const checkpointsOn = enableCheckpoints; // Pure state, no URL param mixing

  const buildKey = [
    isVertical ? 'V' : 'H',
    isLifePath ? (lifepathReady ? 'LP:ready' : 'LP:loading') : 'SEED',
    checkpointsOn ? 'CKPT:1' : 'CKPT:0'
  ].join('|');

  if (import.meta.env.DEV) {
    console.log('[V3] Build state:', {
      buildKey,
      isLifePath,
      lifepathReady,
      nodeCount: lifePathGraph?.graph?.nodes?.length ?? 0,
      loading: lifePathGraph?.loading
    });
  }
  
  // Diagnostic: Log alternatives data when ready
  if (import.meta.env.DEV && isLifePath && lifepathReady) {
    console.log('[V3 Canvas] LifePath alternatives:', {
      forksDetected: sourceMeta.forksDetected,
      alternativesByNode: sourceMeta.alternativesByNode,
      totalAlternatives: Object.keys(sourceMeta.alternativesByNode || {}).length
    });
  }

  // Build full graph and create collapsed view (Step 1: Ship collapsed view only)
  useEffect(() => {
    console.log('[V3 Canvas] Building graph from seed/data…');

    // Guard: don't build until LifePath graph is ready
    if (isLifePath && !lifepathReady) {
      console.log('[V3 Canvas] LifePath data still loading, skipping build');
      toast.info('Loading Life Path data...', { duration: 2000 });
      return;
    }
    
    // Use bridged data if available, otherwise adapt V2 seed
    const v3Graph = bridgedData 
      ? { nodes: bridgedData.nodes, edges: bridgedData.edges }
      : adaptSeedDataV2(GOLDEN_LAYOUT_SEED);
    
    console.log('[V3 Canvas] Adapted graph:', {
      nodeCount: v3Graph.nodes.length,
      edgeCount: v3Graph.edges.length
    });

    // Validate adapted graph
    if (v3Graph.nodes.length === 0) {
      console.error('[V3 Canvas] CRITICAL: Adapted graph has 0 nodes!');
      console.log('[V3 Canvas] Seed data:', GOLDEN_LAYOUT_SEED);
      toast.error('Failed to load graph data');
      return;
    }

    // Check for year/track distribution
    const yearCounts = new Map<number, number>();
    v3Graph.nodes.forEach(n => {
      const year = n.data.year ?? 0;
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    });
    console.log('[V3 Canvas] Node distribution by year:', Object.fromEntries(yearCounts));
    
    // Phase 3: Inject checkpoints on FULL graph BEFORE collapse (vertical mode only)
    let fullGraphWithCheckpoints = v3Graph;
    
    if (useVerticalLayout && checkpointsOn && sourceMeta) {
      const forkCount = Object.keys(sourceMeta.alternativesByNode || {}).length;
      
      if (import.meta.env.DEV) {
        console.log('[V3 Canvas] Fork detection check:', {
          checkpointsOn,
          useVerticalLayout,
          sourceMeta: {
            forksDetected: sourceMeta?.forksDetected,
            alternativesByNode: sourceMeta?.alternativesByNode,
            forkKeys: Object.keys(sourceMeta?.alternativesByNode || {})
          },
          forkCount
        });
      }
      
      // DEV ONLY: Force demo checkpoint when ?ckpt_demo=1
      const demoCkpt = searchParams.get('ckpt_demo') === '1';
      let demoMeta = sourceMeta;
      
      if (import.meta.env.DEV && demoCkpt && forkCount === 0) {
        // FIX #3: Use raw node ID (not bundle ID) for injection - collapse will remap it
        console.warn('[V3 DEV] No forks detected - injecting demo checkpoint for y2-cs-core');
        demoMeta = {
          ...sourceMeta,
          forksDetected: 1,
          alternativesByNode: { 'y2-cs-core': 2 }
        };
      }
      
      const finalForkCount = Object.keys(demoMeta.alternativesByNode || {}).length;
      
      if (finalForkCount > 0) {
        console.log(`[V3 Canvas] Injecting checkpoints on FULL graph (${finalForkCount} forks detected)`);
        const result = injectCheckpoints(
          fullGraphWithCheckpoints.nodes,
          fullGraphWithCheckpoints.edges,
          demoMeta
        );
        fullGraphWithCheckpoints = { nodes: result.nodes, edges: result.edges };
        console.log(`[V3 Canvas] Checkpoint injection: ${result.checkpointsAdded} added`);
        
        if (demoCkpt && import.meta.env.DEV) {
          console.log('[V3 DEV SHIM] Demo checkpoint injected');
        }
      } else {
        console.log('[V3 Canvas] No forks detected; skipping checkpoint injection');
      }
    }
    
    // Phase 3B FIX: Position full graph BEFORE collapse to prevent Line-402 bug
    const positionedFull = useVerticalLayout
      ? {
          nodes: calculateVerticalLayout(
            fullGraphWithCheckpoints.nodes, 
            VERT,
            useLifePathSource ? 'tier' : undefined
          ),
          edges: fullGraphWithCheckpoints.edges,
        }
      : (enableMetrics 
          ? buildEduTreeGraphWithMetrics(fullGraphWithCheckpoints, { enableCheckpoints, meta: sourceMeta }).graph
          : buildEduTreeGraph(fullGraphWithCheckpoints, { enableCheckpoints, meta: sourceMeta }));
    
    setFullGraph(positionedFull);
    
    // Create collapsed view (progressive disclosure - Step 1)
    // Feature gate: lp_bundles=1 enables tier-based bundling for LifePath
    const lpBundlesEnabled = useLifePathSource && searchParams.get('lp_bundles') === '1';
    
    // Collapse logic: always collapse unless alternative is selected
    const shouldCollapse = !selectedAlternative;
    const { visibleNodes, visibleEdges, bundles: bundleMap } = shouldCollapse
      ? createCollapsedView(
          positionedFull, 
          lpBundlesEnabled ? 'tier' : 'year'
        )
      : {
          visibleNodes: positionedFull.nodes,
          visibleEdges: positionedFull.edges,
          bundles: new Map() // No bundles when expanded
        };
    
    if (import.meta.env.DEV) {
      console.log('[Graph Build] Collapsed view decision:', {
        useLifePathSource,
        lpBundlesEnabled,
        selectedAlternative: !!selectedAlternative,
        shouldCollapse,
        visibleNodeCount: visibleNodes.length,
        mode: shouldCollapse 
          ? (lpBundlesEnabled ? 'TIER BUNDLES - LifePath grouped by tier' : 'COLLAPSED - bundles + gates + checkpoints')
          : 'EXPANDED - full tree'
      });
    }
    
    // Position the collapsed view (Step 5: spine edges only)
    const collapsedGraph = { nodes: visibleNodes, edges: visibleEdges };
    
    // FIX #2: Apply vertical layout to collapsed graph - MUST use visibleEdges
    const positionedCollapsed = useVerticalLayout
      ? { 
          nodes: calculateVerticalLayout(
            visibleNodes, 
            VERT,
            useLifePathSource ? 'tier' : undefined
          ), 
          edges: visibleEdges  // Use visibleEdges directly, not collapsedGraph.edges
        }
      : (enableMetrics
          ? buildEduTreeGraphWithMetrics(collapsedGraph, { enableCheckpoints: false }).graph
          : buildEduTreeGraph(collapsedGraph, { enableCheckpoints: false }))
    
    // DEV: Freeze positions to detect mutations
    if (import.meta.env.DEV && useVerticalLayout) {
      positionedCollapsed.nodes.forEach(n => {
        const originalY = n.position.y;
        Object.defineProperty(n.position, 'y', {
          get() { return originalY; },
          set(val) {
            if (val !== originalY) {
              console.error('[MUTATION DETECTED]', n.id, 'y changed:', originalY, '→', val);
              console.trace();
            }
          },
          configurable: true
        });
      });
    }
    
    // Debug: Log bundle positions after vertical layout
    if (useVerticalLayout) {
      const bundles = positionedCollapsed.nodes.filter(n => n.type === 'track-bundle');
      console.log('[V3 Canvas] Bundle positions after vertical layout:', 
        bundles.map(n => ({ id: n.id, year: n.data.year, x: n.position.x, y: n.position.y }))
      );
    }
    
    setBundles(bundleMap);
    
    if (enableMetrics) {
      const { metrics } = buildEduTreeGraphWithMetrics(collapsedGraph, { enableCheckpoints: false });
      setLayoutMetrics(metrics);
      console.log('[V3 Canvas] Layout metrics (collapsed):', metrics);
    }
    
    // Apply layout based on feature flag
    let finalGraph: V3Graph;
    
    if (useVerticalLayout) {
      // Vertical flow: pure top-to-bottom layout (already applied above)
      console.log('[V3 Canvas] Using VERTICAL layout engine');

      // STEP 3: Pre-validate edges checkpoint
      console.log('[V3 Canvas][pre-validate] edges:', positionedCollapsed.edges.map(e => e.id));
      console.log('[V3 Canvas][pre-validate] ckpt edges:',
        positionedCollapsed.edges.filter(e => e.id?.startsWith('ckpt:')).map(e => ({
          id: e.id, 
          src: e.source, 
          tgt: e.target
        }))
      );
      console.log('[V3 Canvas][pre-validate] node IDs:', 
        positionedCollapsed.nodes.map(n => n.id)
      );

      // FIX #5: Pre-validate edges to prevent orphan references
      const nodeIds = new Set(positionedCollapsed.nodes.map(n => n.id));
      const validEdges = positionedCollapsed.edges.filter(e => {
        const ok = nodeIds.has(e.source) && nodeIds.has(e.target);
        if (!ok && import.meta.env.DEV) {
          console.error('[V3 Canvas] Orphan edge filtered:', {
            id: e.id,
            source: e.source,
            sourceExists: nodeIds.has(e.source),
            target: e.target,
            targetExists: nodeIds.has(e.target),
            isCheckpoint: e.id.startsWith('ckpt:')
          });
        }
        return ok;
      });
      
      if (import.meta.env.DEV) {
        const checkpointEdges = validEdges.filter(e => e.id.startsWith('ckpt:'));
        console.log('[V3 Canvas] Checkpoint edges after validation:', {
          count: checkpointEdges.length,
          edges: checkpointEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
        });
      }
      
      // Phase 4: Removed dev test edge (no longer needed)
      
      finalGraph = {
        nodes: positionedCollapsed.nodes,
        edges: validEdges
      };
      
      // Add comparison data to Track Gate (always available, visibility controlled by showComparison)
      const trackGate = finalGraph.nodes.find(n => n.id === 'gate-y3-tracks');
      if (trackGate) {
        const y3SE = finalGraph.nodes.find(n => n.data.year === 3 && n.data.trackId === 'se');
        const y3DS = finalGraph.nodes.find(n => n.data.year === 3 && n.data.trackId === 'ds');
        
        trackGate.data = {
          ...trackGate.data,
          showCompare: showComparison,
          se: {
            courses: y3SE?.data.childCount || 12,
            credits: y3SE?.data.totalCredits || 48,
            durationWeeks: 32,
            outcomes: ['Full-stack development', 'Cloud architecture', 'DevOps practices'],
          },
          ds: {
            courses: y3DS?.data.childCount || 10,
            credits: y3DS?.data.totalCredits || 40,
            durationWeeks: 28,
            outcomes: ['Machine learning', 'Data pipelines', 'Analytics'],
          },
        };
      }
    } else {
    // Horizontal flow: legacy year-column layout
      console.log('[V3 Canvas] Using HORIZONTAL layout engine (legacy)');
      if (import.meta.env.DEV) {
        const clamped = V3Clamp.clampCollapsed(positionedCollapsed, LAYOUT_TOKENS);
        finalGraph = clamped;
      } else {
        finalGraph = positionedCollapsed;
      }
    }
    
    // Debug instrumentation (dev only)
    if (import.meta.env.DEV) {
      (window as any).__V3DBG_lastGraph = finalGraph;
      (window as any).__rfInstanceId = instanceIdRef.current; // Phase 1: expose instance ID
      (window as any).__dumpV3 = () => ({
        nodes: finalGraph.nodes,
        edges: finalGraph.edges,
        tokens: useVerticalLayout ? VERT : LAYOUT_TOKENS,
        layout: useVerticalLayout ? 'vertical' : 'horizontal',
        instanceId: instanceIdRef.current, // Phase 1: include in dump
        branchState: { kind: 'unselected' }, // Phase 1: placeholder for Phase 3
        meta: sourceMeta, // Phase 2: expose bridge metadata
      });
      
      // Run HUD + assertions (skip for vertical until we adapt V3DBG)
      if (!useVerticalLayout) {
        V3DBG.afterRender(finalGraph, LAYOUT_TOKENS);
      }
    }
    
    // === POST-LAYOUT VALIDATION (moved here to validate final rendered positions) ===
    const validation = validateNoOverlaps(
      finalGraph.nodes,
      useVerticalLayout ? VERT : LAYOUT_TOKENS
    );
    if (validation.hasOverlaps) {
      console.error('[V3 Canvas] OVERLAPS IN FINAL GRAPH:', validation.overlaps.length);
      console.table(validation.diagnostics.slice(0, 5));
    } else {
      console.log('[V3 Canvas] ✅ No overlaps in final graph');
    }
    
    // Diagnostic tables for layout verification
    console.log('[V3 Diagnostics] Node positions:');
    console.table(finalGraph.nodes.map(n => ({
      id: n.id,
      type: n.type,
      year: n.data.year ?? '-',
      lane: n.data.trackId ?? 'any',
      x: n.position.x,
      y: n.position.y,
      sourcePos: n.sourcePosition ?? '-',
      targetPos: n.targetPosition ?? '-'
    })));
    
    console.log('[V3 Diagnostics] Edge routing:');
    console.table(finalGraph.edges.map(e => {
      const src = finalGraph.nodes.find(n => n.id === e.source);
      const tgt = finalGraph.nodes.find(n => n.id === e.target);
      const srcYear = src?.data.year ?? 0;
      const tgtYear = tgt?.data.year ?? 0;
      return {
        id: e.id,
        kind: e.kind,
        source: e.source,
        target: e.target,
        directionOK: srcYear < tgtYear
      };
    }));
    
    console.log('[V3 Diagnostics] Layout summary:', {
      visibleNodes: finalGraph.nodes.length,
      edges: finalGraph.edges.length,
      stepY: useVerticalLayout ? VERT.VERTICAL_GAP : (LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP),
      yearColumns: useVerticalLayout ? 'N/A (vertical)' : LAYOUT_TOKENS.YEAR_COL,
      trackOffset: useVerticalLayout ? VERT.H_SPACING : LAYOUT_TOKENS.TRACK_COLUMN_OFFSET
    });
    
    // Runtime assertion: verify bundles are on correct vertical flow positions
    if (useVerticalLayout) {
      // Vertical layout validation (uses VERT tokens)
      let expectedY = 0;
      const stepHeight = (nodeHeight: number) => nodeHeight + VERT.VERTICAL_GAP;
      
      // Y1 at 0
      const y1Node = finalGraph.nodes.find(n => n.type === 'track-bundle' && n.data.year === 1);
      if (y1Node) {
        console.log(`✅ [V3 Row Check] Y1 bundle correctly positioned at y=${y1Node.position.y}`);
        expectedY = stepHeight(VERT.NODE_HEIGHT);
      }
      
      // Program Gate
      expectedY += stepHeight(VERT.GATE_HEIGHT);
      
      // Y2
      const y2Node = finalGraph.nodes.find(n => n.type === 'track-bundle' && n.data.year === 2);
      if (y2Node) {
        console.log(`✅ [V3 Row Check] Y2 bundle correctly positioned at y=${y2Node.position.y}`);
        expectedY = y2Node.position.y + stepHeight(VERT.NODE_HEIGHT);
      }
      
      // Track Gate
      expectedY += stepHeight(VERT.GATE_HEIGHT);
      
      // Y3 bundles (should all be at same Y)
      const y3Nodes = finalGraph.nodes.filter(n => n.type === 'track-bundle' && n.data.year === 3);
      if (y3Nodes.length > 0) {
        const y3Y = y3Nodes[0].position.y;
        const allSameY = y3Nodes.every(n => n.position.y === y3Y);
        if (allSameY) {
          console.log(`✅ [V3 Row Check] Y3 bundle(s) correctly positioned at y=${y3Y}`);
        } else {
          console.error(`❌ [V3 Row Check] Y3 bundles have different Y positions:`, y3Nodes.map(n => ({ id: n.id, y: n.position.y })));
        }
        expectedY = y3Y + stepHeight(VERT.NODE_HEIGHT);
      }
      
      // Y4
      const y4Node = finalGraph.nodes.find(n => n.type === 'track-bundle' && n.data.year === 4);
      if (y4Node) {
        console.log(`✅ [V3 Row Check] Y4 bundle correctly positioned at y=${y4Node.position.y}`);
      }
    } else {
      // Horizontal layout validation (old LAYOUT_TOKENS)
      const stepY = LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP;
      for (const n of finalGraph.nodes) {
        if (n.type === 'track-bundle') {
          const yr = n.data.year ?? 0;
          const expected = (yr - 1) * stepY;
          const actual = n.position.y;
          const drift = Math.abs(actual - expected);
          
          if (drift > LAYOUT_TOKENS.GRID) {
            console.error(`❌ [V3 Row Check] Y${yr} bundle misaligned:`, {
              expected,
              actual,
              drift,
              bundleId: n.id
            });
          } else {
            console.log(`✅ [V3 Row Check] Y${yr} bundle correctly positioned at y=${actual}`);
          }
        }
      }
    }
    
    // 🛡️ SAFE_MODE: Static fallback graph for diagnosis
    const staticSafeGraph: V3Graph = {
      nodes: [
        { 
          id: 'demo-y1', 
          type: 'track-bundle' as const,
          data: { title: 'Year 1 (Safe)', year: 1 }, 
          position: { x: 680, y: 0 } 
        },
        { 
          id: 'demo-g2', 
          type: 'gate' as const,
          data: { year: 2, title: 'Gate (Safe)' }, 
          position: { x: 680, y: 200 } 
        },
        { 
          id: 'demo-y2', 
          type: 'track-bundle' as const,
          data: { title: 'Year 2 (Safe)', year: 2 }, 
          position: { x: 680, y: 360 } 
        },
      ],
      edges: [
        { id: 'e1', source: 'demo-y1', target: 'demo-g2', kind: 'spine' as const },
        { id: 'e2', source: 'demo-g2', target: 'demo-y2', kind: 'spine' as const }
      ],
    };
    
    const graphForRF = SAFE_MODE ? staticSafeGraph : finalGraph;
    safeSetCurrentGraph(graphForRF, SAFE_MODE ? 'safe:static' : `build:${buildKey}`);
    
    // DEV: Expose dump function for diagnostics
    if (import.meta.env.DEV) {
      (window as any).__dumpV3 = () => ({
        nodes: graphForRF.nodes,
        edges: graphForRF.edges,
        meta: sourceMeta
      });
    }
  }, [buildKey]); // React to build key changes only

  const { nodes, edges } = currentGraph ?? { nodes: [], edges: [] };
  
  console.log('[V3 Canvas] Rendering:', {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    hasMetrics: !!layoutMetrics,
    firstNode: nodes[0] ? { id: nodes[0].id, pos: nodes[0].position } : null
  });

  // Debug viewport and node bounds
  useEffect(() => {
    if (nodes.length > 0) {
      const nodeWidth = useVerticalLayout ? VERT.NODE_WIDTH : LAYOUT_TOKENS.NODE_WIDTH;
      const nodeHeight = useVerticalLayout ? VERT.NODE_HEIGHT : LAYOUT_TOKENS.NODE_BASE_HEIGHT;
      
      const bounds = nodes.reduce((acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x + nodeWidth),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y + nodeHeight),
      }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
      
      console.log('[V3 Canvas] Node bounds:', bounds);
      console.log('[V3 Canvas] First 3 nodes:', nodes.slice(0, 3).map(n => ({
        id: n.id,
        type: n.type,
        x: n.position.x,
        y: n.position.y
      })));
    }
  }, [nodes, useVerticalLayout]);

  // Phase 1 Fix: Reliable fitView with proper timing
  const didFitRef = useRef(false);
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Wait for DOM nodes to be fully rendered
    const checkAndFit = () => {
      const domNodes = document.querySelectorAll('.react-flow__node');
      if (domNodes.length > 0 && !didFitRef.current) {
        didFitRef.current = true;
        requestAnimationFrame(() => {
          fitView({ padding: 0.2, duration: 300, includeHiddenNodes: true });
          console.log('[V3 Canvas] ✅ Auto-fit executed');
        });
      }
    };
    
    // Try immediately
    checkAndFit();
    
    // Fallback: try again after ReactFlow settles
    const timer = setTimeout(checkAndFit, 200);
    return () => clearTimeout(timer);
  }, [nodes.length, fitView]);

  // Phase 5 Fix: Viewport diagnostic logging
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const rfInstance = (window as any).__reactFlowInstance;
    if (rfInstance) {
      const viewport = rfInstance.getViewport();
      console.log('[V3 Canvas] Current viewport:', viewport);
      
      const bounds = {
        minX: Math.min(...nodes.map(n => n.position.x)),
        maxX: Math.max(...nodes.map(n => n.position.x)),
        minY: Math.min(...nodes.map(n => n.position.y)),
        maxY: Math.max(...nodes.map(n => n.position.y))
      };
      
      console.log('[V3 Canvas] Node bounds vs viewport:', {
        nodeBounds: bounds,
        viewport,
        nodesVisible: (
          viewport.x < bounds.maxX &&
          viewport.x + window.innerWidth / viewport.zoom > bounds.minX &&
          viewport.y < bounds.maxY &&
          viewport.y + window.innerHeight / viewport.zoom > bounds.minY
        )
      });
    }
  }, [nodes]);

  // Legacy DOM probe (keeping for compatibility)
  useEffect(() => {
    const domNodes = document.querySelectorAll('.react-flow__node');
    console.log('[V3 Canvas] DOM nodes found:', domNodes.length);
    if (domNodes.length > 0) {
      const firstNode = domNodes[0] as HTMLElement;
      const rect = firstNode.getBoundingClientRect();
      const styles = getComputedStyle(firstNode);
      
      console.log('[V3 Canvas] First node styles:', {
        width: firstNode.offsetWidth,
        height: firstNode.offsetHeight,
        transform: styles.transform,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        visibility: styles.visibility
      });
      
      console.log('[V3 Canvas] First node viewport position:', {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        inViewport: rect.top >= 0 && rect.left >= 0 && 
                    rect.bottom <= window.innerHeight && 
                    rect.right <= window.innerWidth
      });
    }
  }, [nodes.length]);

  // Step 3: Guard the toggle handler (prevents early render issues)
  const handleBundleToggle = useCallback((bundleId: string) => {
    // FIX #4: Capture layout flag at handler start to prevent mid-handler changes
    const isVertical = useVerticalLayout;
    
    // Early return if graphs aren't ready
    if (!fullGraph || !currentGraph) {
      console.warn('[V3 Canvas] Toggle called before graphs ready');
      return;
    }
    
    const bundle = bundles.get(bundleId);
    if (!bundle) {
      console.warn('[V3 Canvas] Bundle not found:', bundleId);
      return;
    }
    
    // isCollapsed = bundle node is still visible
    const isCollapsed = currentGraph.nodes.some(n => n.id === bundleId);
    
    let newGraph: V3Graph;
    if (isCollapsed) {
      // Expand: replace bundle with its children
      newGraph = expandBundle(bundleId, currentGraph, fullGraph, bundles);
      console.log('[V3 Canvas] Expanded bundle:', bundleId, '→', bundle.childCount, 'child nodes');
    } else {
      // Collapse: remove children, restore bundle
      newGraph = collapseBundle(bundleId, currentGraph, bundles);
      console.log('[V3 Canvas] Collapsed bundle:', bundleId);
    }
    
    // Re-layout after expansion/collapse using correct layout engine
    const positioned = isVertical
      ? { 
          nodes: calculateVerticalLayout(newGraph.nodes, VERT), 
          edges: newGraph.edges 
        }
      : buildEduTreeGraph(newGraph, { enableCheckpoints, meta: sourceMeta });
    
    // Validate after toggle with correct tokens
    const validation = validateNoOverlaps(
      positioned.nodes, 
      isVertical ? VERT : LAYOUT_TOKENS
    );
    if (validation.hasOverlaps) {
      console.error('[V3 Canvas] OVERLAPS AFTER TOGGLE:', validation.overlaps.length);
      console.table(validation.diagnostics.slice(0, 5));
    }
    
    safeSetCurrentGraph(positioned, 'toggle:bundle');
  }, [fullGraph, currentGraph, bundles, useVerticalLayout, enableCheckpoints, safeSetCurrentGraph]);

  // FIX #2: Memoize nodeTypes to prevent ReactFlow prop identity changes
  const memoizedNodeTypes = useMemo(() => ({
    requirement: V3RequirementNode,
    gate: V3GateNode,
    year: V3YearNode,
    'track-bundle': V3TrackBundleNode,
    checkpoint: V3CheckpointNode,
  }), []);

  // Phase 2 Fix: Intelligent defaultViewport based on layout
  const defaultViewport = useMemo(() => {
    // For vertical layout, center viewport on spine (x=680, y=480 midpoint)
    // At zoom 0.5, this puts y1-y4 bundles in view
    if (useVerticalLayout) {
      return { 
        x: window.innerWidth / 2 - 680 * 0.5,  // Center x=680 in viewport
        y: window.innerHeight / 2 - 480 * 0.5, // Center y=480 (midpoint of 0-960)
        zoom: 0.5 
      };
    }
    // Horizontal layout keeps legacy viewport
    return { x: -400, y: -200, zoom: 0.5 };
  }, [useVerticalLayout]);

  // Phase 3b: Checkpoint click handler
  const handleCheckpointClick = useCallback((checkpointId: string, sourceNodeId: string) => {
    console.log('[V3 Canvas] Checkpoint clicked:', { checkpointId, sourceNodeId });
    
    // Guard: Validate source node and graph exist
    const sourceNode = currentGraph?.nodes?.find(n => n.id === sourceNodeId);
    const lp = lifePathGraph?.graph;
    
    if (!sourceNode || !lp) {
      console.warn('[Checkpoint] Missing source or graph:', { sourceNodeId, hasGraph: !!lp });
      toast.error('That checkpoint has no alternatives right now.');
      setAlternativesDrawerOpen(false);
      setSelectedCheckpoint(null);
      return;
    }
    
    setSelectedCheckpoint({ id: checkpointId, sourceNodeId });
    setAlternativesDrawerOpen(true);
  }, [currentGraph?.nodes, lifePathGraph?.graph]);

  // Phase 3b: Apply alternative selection
  const handleSelectAlternative = useCallback(
    (sourceNodeId: string, selectedNodeId: string) => {
      if (!lifePathGraph?.graph) {
        console.error('[Select Alt] No LifePath graph available');
        toast.error('Unable to apply alternative. Please refresh.');
        return;
      }
      
      // Guard: Check if alternative is locked (missing prerequisites)
      const alternatives = getAlternativesForNode(
        sourceNodeId,
        lifePathGraph.graph.nodes,
        lifePathGraph.graph.edges,
        [] // TODO: Add completed nodes from user state
      );
      
      const selectedAlt = alternatives.find(alt => alt.node.id === selectedNodeId);
      if (selectedAlt?.prerequisiteStatus === 'locked') {
        console.warn('[Select Alt] Alternative is locked:', { 
          nodeId: selectedNodeId, 
          missingPrereqs: selectedAlt.missingPrereqs 
        });
        toast.error(`Cannot select this alternative. Missing prerequisites: ${selectedAlt.missingPrereqs?.join(', ')}`);
        return;
      }
      
      console.log('[V3 Canvas] Applying alternative:', { sourceNodeId, selectedNodeId });
      
      // Phase 3B: Store selection for dimming
      setSelectedAlternative({
        sourceId: sourceNodeId,
        targetId: selectedNodeId
      });
      
      // 1. Create selection record
      const selection: AlternativeSelection = {
        sourceNodeId,
        selectedNodeId,
        timestamp: Date.now()
      };
      
      // 2. Apply to LifePath graph
      const { updatedGraph, affectedNodeIds } = applyAlternative(
        lifePathGraph.graph,
        selection
      );
      
      // 3. Bridge LifePath → V3
      const bridgeResult = lifePathToV3(updatedGraph, { showAlternatives: false });
      
      // 4. Re-inject checkpoints
      const withCheckpoints = enableCheckpoints
        ? injectCheckpoints(bridgeResult.nodes, bridgeResult.edges, bridgeResult.meta)
        : { nodes: bridgeResult.nodes, edges: bridgeResult.edges, checkpointsAdded: 0 };
      
      // 5. Phase 3B: After alternative selection, show full expanded tree
      // (with dimming applied via selectedAlternative state).
      // Only use collapsed view on initial render or when no selection is active.
      const shouldCollapse = !selectedAlternative; // Don't collapse after selection
      const { visibleNodes, visibleEdges, bundles: bundleMap } = shouldCollapse
        ? createCollapsedView({ nodes: withCheckpoints.nodes, edges: withCheckpoints.edges })
        : {
            visibleNodes: withCheckpoints.nodes,
            visibleEdges: withCheckpoints.edges,
            bundles: new Map() // Empty bundles when expanded
          };
      
      // 6. Apply vertical layout
      const positioned: V3Graph = useVerticalLayout
        ? {
            nodes: calculateVerticalLayout(visibleNodes, VERT),
            edges: visibleEdges  // Use V3Edge[] directly
          }
        : buildEduTreeGraph({ nodes: visibleNodes, edges: visibleEdges }, { enableCheckpoints, meta: bridgeResult.meta });
      
      // 7. Preserve positions of unaffected nodes
      const nodesWithPositions = preservePositions(
        positioned.nodes,
        currentGraph?.nodes,
        affectedNodeIds
      );
      
      // 8. Update state
      safeSetCurrentGraph(
        { nodes: nodesWithPositions, edges: positioned.edges },
        'apply-alternative'
      );
      
      setSelectedAlternatives(prev => [...prev, selection]);
      setBundles(bundleMap);
      
      // 9. Close drawer + feedback
      setAlternativesDrawerOpen(false);
      setSelectedCheckpoint(null);
      toast.success('Alternative path applied!');
      
      console.log('[V3 Canvas] Alternative applied successfully:', {
        selection,
        affectedNodes: affectedNodeIds.length,
        newNodeCount: nodesWithPositions.length,
        newEdgeCount: positioned.edges.length
      });
    },
    [
      lifePathGraph?.graph,
      enableCheckpoints,
      useVerticalLayout,
      currentGraph?.nodes,
      safeSetCurrentGraph
    ]
  );

  // Step 3: Convert V3 nodes to ReactFlow nodes with guarded toggle and connection points
  const reactFlowNodes: Node[] = useMemo(() => {
    return nodes.map((node: V3NodeType) => {
      const baseData = {
        ...node.data,
        label: node.data.title || node.id,
        area: 'core',
        credits_needed: node.data.credits_needed ?? 3,
        rule_type: 'ALL'
      };
      
      // Map sourcePosition/targetPosition strings to ReactFlow Position enum
      const sourcePos = node.sourcePosition === 'bottom' ? Position.Bottom :
                        node.sourcePosition === 'top' ? Position.Top :
                        node.sourcePosition === 'left' ? Position.Left :
                        node.sourcePosition === 'right' ? Position.Right :
                        undefined;
      
      const targetPos = node.targetPosition === 'bottom' ? Position.Bottom :
                        node.targetPosition === 'top' ? Position.Top :
                        node.targetPosition === 'left' ? Position.Left :
                        node.targetPosition === 'right' ? Position.Right :
                        undefined;
      
      // Phase 3B: Apply dimming classes based on selection
      let className = '';
      if (selectedAlternative) {
        const isSource = node.id === selectedAlternative.sourceId;
        const isTarget = node.id === selectedAlternative.targetId;
        const isInSelectedPath = isSource || isTarget;
        
        if (!isInSelectedPath) {
          className += ' v3-path-dimmed';
        } else if (isTarget) {
          className += ' v3-path-primary';
        } else if (isSource) {
          className += ' v3-path-both';
        }
      }
      
      // Add onToggle ONLY when graphs are ready and it's a bundle
      if (node.type === 'track-bundle' && fullGraph && currentGraph) {
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          sourcePosition: sourcePos,
          targetPosition: targetPos,
          className: className.trim(),
          data: {
            ...baseData,
            onToggle: () => handleBundleToggle(node.id)
          }
        };
      }
      
      // Add checkpoint click handler for checkpoint nodes
      if (node.type === 'checkpoint') {
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          sourcePosition: sourcePos,
          targetPosition: targetPos,
          className: className.trim(),
          data: {
            ...baseData,
            onCheckpointClick: handleCheckpointClick
          }
        };
      }
      
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        className: className.trim(),
        data: baseData
      };
    });
  }, [nodes, fullGraph, currentGraph, handleBundleToggle, handleCheckpointClick, selectedAlternative]);

  // Convert V3 edges to ReactFlow edges with proper routing and focus mode
  const reactFlowEdges: Edge[] = useMemo(() => {
    if (useVerticalLayout) {
      // Vertical flow: uniform top-to-bottom edges
      // CRITICAL FIX: Pass nodes to edge mapper for validation
      const baseEdges = mapEdgesVertical(edges, nodes);
      
      // Phase 3B: Apply dimming to edges
      if (selectedAlternative) {
        return baseEdges.map(edge => {
          const touchesSelection = 
            edge.source === selectedAlternative.sourceId ||
            edge.target === selectedAlternative.targetId;
          
          const className = touchesSelection ? 'edge-primary' : 'edge-dimmed';
          
          return {
            ...edge,
            className
          };
        });
      }
      
      return baseEdges;
    }
    
    // Horizontal flow: gate edges vertical, spine edges horizontal
    return edges.map((edge: V3EdgeType) => {
      const isGate = edge.kind === 'gate';
      const isSpine = edge.kind === 'spine';
      const isFocused = focusedEdges.size === 0 || focusedEdges.has(edge.id);
      
      // Phase 3B: Apply dimming for horizontal mode
      let className = '';
      if (selectedAlternative) {
        const touchesSelection = 
          edge.source === selectedAlternative.sourceId ||
          edge.target === selectedAlternative.targetId;
        className = touchesSelection ? 'edge-primary' : 'edge-dimmed';
      }
      
      // For gate edges, connect vertically: bundle.south -> gate.north or gate.south -> bundle.north
      // For spine edges, connect horizontally: bundle.east -> bundle.west
      const handleProps = isGate
        ? { sourceHandle: 'south', targetHandle: 'north', type: 'smoothstep' as const, pathOptions: { borderRadius: 8 } }
        : { sourceHandle: 'east',  targetHandle: 'west',  type: 'step' as const,       pathOptions: { borderRadius: 12 } };
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...handleProps,
        className: className.trim(),
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          width: 18, 
          height: 18,
          color: isGate ? '#6366f1' : '#94a3b8'
        },
        animated: isGate,
        style: {
          stroke: isGate ? '#6366f1' : '#94a3b8',
          strokeWidth: 2,
          opacity: isFocused ? 1 : 0.15
        }
      };
    });
  }, [edges, focusedEdges, useVerticalLayout]);

  // FIX #5: Viewport movement tracker (diagnostic aid)
  const handleMoveEnd = useCallback((_event: any, viewport: { x: number; y: number; zoom: number }) => {
    if (import.meta.env.DEV) {
      console.log('[Viewport]', viewport);
    }
  }, []);

  // Handle node selection for edge focusing
  const handleNodeClick = useCallback((event: any, node: Node) => {
    const nodeId = node.id;
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
    
    if (selectedNodeId === nodeId) {
      // Deselect - show all edges
      setFocusedEdges(new Set());
    } else {
      // Select - show only connected edges
      const connectedEdges = edges.filter(
        e => e.source === nodeId || e.target === nodeId
      );
      setFocusedEdges(new Set(connectedEdges.map(e => e.id)));
    }
  }, [edges, selectedNodeId]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setFocusedEdges(new Set());
  }, []);

  const handleValidateOverlaps = useCallback(() => {
    const result = validateNoOverlaps(nodes, LAYOUT_TOKENS);
    
    if (result.hasOverlaps) {
      toast.error(`Found ${result.overlaps.length} overlaps`, {
        description: result.overlaps.slice(0, 3).map(o => `${o.a} ↔ ${o.b}`).join(', ')
      });
      
      console.log('[V3 Diagnostics] Detailed overlap analysis:');
      console.table(result.diagnostics.slice(0, 10));
    } else {
      toast.success('No overlaps detected! ✅');
    }
  }, [nodes]);

  const handleMeasureDOM = useCallback(() => {
    const nodeElements = document.querySelectorAll('.react-flow__node');
    
    if (nodeElements.length === 0) {
      toast.error('No nodes found in DOM');
      return;
    }
    
    const measurements = Array.from(nodeElements).map(el => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      return {
        id: el.getAttribute('data-id') || 'unknown',
        width: rect.width,
        height: rect.height,
        boxSizing: computed.boxSizing,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        borderLeft: computed.borderLeftWidth,
        borderRight: computed.borderRightWidth
      };
    });
    
    const widths = measurements.map(m => m.width);
    const heights = measurements.map(m => m.height);
    
    const metrics = {
      count: measurements.length,
      width: {
        min: Math.min(...widths),
        max: Math.max(...widths),
        avg: widths.reduce((a, b) => a + b, 0) / widths.length
      },
      height: {
        min: Math.min(...heights),
        max: Math.max(...heights),
        avg: heights.reduce((a, b) => a + b, 0) / heights.length
      },
      tokenWidth: LAYOUT_TOKENS.NODE_WIDTH,
      tokenMaxHeight: LAYOUT_TOKENS.NODE_MAX_HEIGHT,
      widthExceedsToken: measurements.filter(m => m.width > LAYOUT_TOKENS.NODE_WIDTH),
      heightExceedsToken: measurements.filter(m => m.height > LAYOUT_TOKENS.NODE_MAX_HEIGHT)
    };
    
    setDomMetrics(metrics);
    
    console.log('[V3 DOM Metrics] Node dimension analysis:');
    console.table({
      'Width (min)': metrics.width.min.toFixed(1),
      'Width (avg)': metrics.width.avg.toFixed(1),
      'Width (max)': metrics.width.max.toFixed(1),
      'Width (token)': metrics.tokenWidth,
      'Height (min)': metrics.height.min.toFixed(1),
      'Height (avg)': metrics.height.avg.toFixed(1),
      'Height (max)': metrics.height.max.toFixed(1),
      'Height (token)': metrics.tokenMaxHeight
    });
    
    if (metrics.widthExceedsToken.length > 0) {
      console.warn('[V3 DOM] Nodes exceeding token width:', metrics.widthExceedsToken);
    }
    if (metrics.heightExceedsToken.length > 0) {
      console.warn('[V3 DOM] Nodes exceeding token height:', metrics.heightExceedsToken);
    }
    
    toast.success('DOM metrics logged to console', {
      description: `${metrics.count} nodes measured`
    });
  }, []);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  console.log('[V3 Canvas] Rendering:', {
    nodeCount: reactFlowNodes.length,
    edgeCount: reactFlowEdges.length,
    hasMetrics: !!layoutMetrics
  });

  // Phase 3 Fix: Loading guard AFTER all hooks
  if (useLifePathSource && lifePathGraph?.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">Loading Life Path data...</div>
          <div className="text-sm text-muted-foreground">Preparing checkpoint nodes</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-background">
      {/* HUD Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* Layout Indicator */}
        {useVerticalLayout && (
          <div className="bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20 text-xs font-medium">
            📐 Vertical Flow Active
          </div>
        )}
        
        {/* Debug Panel Toggle (Vertical only) */}
        {useVerticalLayout && (
          <Button 
            onClick={() => {
              setShowDebugPanel(prev => {
                const next = !prev;
                localStorage.setItem('flags.showV3Debug', String(next));
                return next;
              });
            }}
            variant={showDebugPanel ? 'default' : 'secondary'}
            size="sm"
          >
            {showDebugPanel ? '🔍 Hide Debug' : '🔍 Show Debug'}
          </Button>
        )}
        
        <Button 
          onClick={handleValidateOverlaps}
          variant="secondary"
          size="sm"
        >
          Validate Overlaps
        </Button>
        
        <Button 
          onClick={handleMeasureDOM}
          variant="secondary"
          size="sm"
        >
          Measure DOM
        </Button>
        
        <Button 
          onClick={handleFitView}
          variant="secondary"
          size="sm"
          data-testid="fit-view"
        >
          Fit View
        </Button>
        
        <Button 
          onClick={() => setFocusedEdges(new Set())}
          variant={focusedEdges.size === 0 ? 'default' : 'secondary'}
          size="sm"
        >
          {focusedEdges.size === 0 ? 'All Edges' : 'Focus Mode'}
        </Button>
        
        {process.env.NODE_ENV !== 'production' && (
          <button
            onClick={() => (window as any).__V3DBG?.copyReport?.()}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,.1)',
              cursor: 'pointer'
            }}
            title="Copy V3 diagnostic report to clipboard"
          >
            📋 Copy V3 Report
          </button>
        )}
        
        {layoutMetrics && (
          <div className="bg-card p-3 rounded-lg border text-xs space-y-1">
            <div className="font-semibold">Layout Metrics</div>
            <div>Nodes: {layoutMetrics.nodeCount}</div>
            <div>Layout: {layoutMetrics.layoutDuration.toFixed(1)}ms</div>
            <div>Collision: {layoutMetrics.collisionDuration.toFixed(1)}ms</div>
            <div>Total: {layoutMetrics.totalDuration.toFixed(1)}ms</div>
            {layoutMetrics.hasOverlaps && (
              <div className="text-destructive">
                Overlaps: {layoutMetrics.overlapCount}
              </div>
            )}
          </div>
        )}
        
        {domMetrics && (
          <div className="bg-card p-3 rounded-lg border text-xs space-y-1 mt-2">
            <div className="font-semibold">DOM Metrics</div>
            <div>Width: {domMetrics.width.min.toFixed(0)}-{domMetrics.width.max.toFixed(0)}px</div>
            <div>Token: {domMetrics.tokenWidth}px</div>
            {domMetrics.widthExceedsToken.length > 0 && (
              <div className="text-destructive">
                {domMetrics.widthExceedsToken.length} exceed width
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🛡️ SAFE MODE Indicator */}
      {SAFE_MODE && (
        <div className="absolute top-20 right-4 z-10 bg-yellow-500 text-black p-2 rounded font-bold text-xs">
          🛡️ SAFE MODE ACTIVE
        </div>
      )}

      {/* Debug Info - Step 1 verification */}
      <div className="absolute top-4 right-4 z-10 bg-card p-3 rounded-lg border text-xs">
        <div className="font-semibold mb-1">V3 Engine Active</div>
        <div>Mode: <span className="text-primary font-semibold">COLLAPSED</span></div>
        <div>Visible: {reactFlowNodes.length} nodes</div>
        <div>Edges: {reactFlowEdges.length}</div>
        <div className="text-muted-foreground text-[10px] mt-1">
          Progressive Disclosure View
        </div>
      </div>

      {/* Dev Toolbar (DEV mode only) */}
      {import.meta.env.DEV && (
        <DevToolbar 
          nodes={nodes}
          checkpointsEnabled={enableCheckpoints}
          onToggleCheckpoints={handleToggleCheckpoints}
          useVerticalLayout={useVerticalLayout}
          useLifePathSource={useLifePathSource}
          onToggleDataSource={handleToggleDataSource}
          lpBundlesEnabled={searchParams.get('lp_bundles') === '1'}
          onToggleLpBundles={handleToggleLpBundles}
        />
      )}

      {/* ReactFlow Canvas */}
      {/* FIX A: Explicit height container with z-index */}
      <div className="w-full h-full absolute inset-0 z-0" style={{ height: '100vh' }}>
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          nodeTypes={memoizedNodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onMoveEnd={handleMoveEnd}
          defaultViewport={defaultViewport}
          fitViewOptions={{ padding: 0.2, duration: 300 }}
          minZoom={0.1}
          maxZoom={2}
          selectNodesOnDrag={false}
          panOnDrag
          elementsSelectable={false}
          nodesDraggable={false}
          nodesConnectable={false}
          onlyRenderVisibleElements={false}
          translateExtent={[[-100000, -100000], [100000, 100000]]}
          defaultEdgeOptions={{
            style: { strokeWidth: 2 }
          }}
        >
          <Background />
          <Controls />
          <MiniMap 
            nodeStrokeWidth={3}
            zoomable
            pannable
          />
        </ReactFlow>
      </div>
      
      {/* Debug Panel (Vertical Flow only) */}
      {showDebugPanel && useVerticalLayout && (
        <V3DebugPanel
          nodes={nodes}
          isVertical={useVerticalLayout}
          onClose={() => {
            setShowDebugPanel(false);
            localStorage.setItem('flags.showV3Debug', 'false');
          }}
        />
      )}
      
      {/* Comparison Toggle (Vertical Flow + Track Gate selected) */}
      {useVerticalLayout && selectedNodeId === 'gate-y3-tracks' && (
        <div className="fixed top-4 right-4 z-40">
          <CompareToggle
            enabled={showComparison}
            onToggle={() => setShowComparison(!showComparison)}
          />
        </div>
      )}
      
      {/* Mini Compare Cards (appears below Track Gate when showComparison is true) */}
      {useVerticalLayout && showComparison && selectedNodeId === 'gate-y3-tracks' && (() => {
        const trackGate = nodes.find(n => n.id === 'gate-y3-tracks');
        if (trackGate?.data.se && trackGate?.data.ds) {
          return (
            <div 
              style={{
                position: 'absolute',
                left: `${trackGate.position.x}px`,
                top: `${trackGate.position.y + VERT.GATE_HEIGHT + 8}px`,
                zIndex: 10,
                pointerEvents: 'none'
              }}
            >
              <CompareMiniCards
                se={{
                  id: 'se',
                  title: 'Software Engineering',
                  courses: trackGate.data.se.courses,
                  credits: trackGate.data.se.credits,
                  durationWeeks: trackGate.data.se.durationWeeks,
                  outcomes: trackGate.data.se.outcomes,
                  color: 'blue'
                }}
                ds={{
                  id: 'ds',
                  title: 'Data Science',
                  courses: trackGate.data.ds.courses,
                  credits: trackGate.data.ds.credits,
                  durationWeeks: trackGate.data.ds.durationWeeks,
                  outcomes: trackGate.data.ds.outcomes,
                  color: 'purple'
                }}
              />
            </div>
          );
        }
        return null;
      })()}
      
      {/* Alternatives Drawer (Phase 3b) */}
      {alternativesDrawerOpen && selectedCheckpoint && (() => {
        // Get the source node details
        const sourceNode = nodes.find(n => n.id === selectedCheckpoint.sourceNodeId);
        
        if (!sourceNode || !lifePathGraph?.graph) {
          console.warn('[Alternatives Drawer] Source node or graph not found');
          return null;
        }
        
        // Get alternatives for this node
        const alternatives = getAlternativesForNode(
          selectedCheckpoint.sourceNodeId,
          lifePathGraph.graph.nodes,
          lifePathGraph.graph.edges,
          [] // TODO: Add completed nodes from user state
        );
        
        return (
          <AlternativesDrawer
            open={alternativesDrawerOpen}
            onClose={() => {
              setAlternativesDrawerOpen(false);
              setSelectedCheckpoint(null);
            }}
            sourceNode={{
              id: selectedCheckpoint.sourceNodeId,
              title: sourceNode.data.title || sourceNode.id,
            }}
            alternatives={alternatives}
            onSelectAlternative={(nodeId) => handleSelectAlternative(selectedCheckpoint.sourceNodeId, nodeId)}
            onPreviewAlternative={(nodeId) => {
              console.log('[V3 Canvas] Preview alternative:', nodeId);
              // TODO: Show preview overlay in Phase 3c
            }}
          />
        );
      })()}
    </div>
  );
}

export default function EduTreeV3Canvas(props: EduTreeV3CanvasProps) {
  // Expose health check for dev console
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).runV3HealthCheck = runV3HealthCheck;
    }
  }, []);

  return (
    <ReactFlowProvider>
      <EduTreeV3CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
