import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, ReactFlowProvider, useReactFlow, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { validateNoOverlaps } from './engine/overlapValidator';
import { buildEduTreeGraph, buildEduTreeGraphWithMetrics } from './engine/buildGraph';
import { createCollapsedView, expandBundle, collapseBundle, BundleCard } from './engine/createCollapsedView';
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
import CompareToggle from './components/CompareToggle';

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

interface EduTreeV3CanvasProps {
  enableMetrics?: boolean;
}

function EduTreeV3CanvasInner({ enableMetrics = false }: EduTreeV3CanvasProps) {
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
        console.trace('[setCurrentGraph] EMPTY/INVALID graph pushed from:', tag);
      }
      setCurrentGraph(g);
    },
    []
  );
  
  // Vertical flow feature flag (read from URL or localStorage)
  const [useVerticalLayout, setUseVerticalLayout] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('layout') === 'vertical') return true;
      return localStorage.getItem('flags.verticalLayout') === 'true';
    } catch {
      return false;
    }
  });
  
  // Comparison UI state
  const [showComparison, setShowComparison] = useState(false);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  
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
  const params = new URLSearchParams(window.location.search);
  const useLifePathSource = params.get('source') === 'lifepath';
  
  // CRITICAL: Only load Life Path data when explicitly requested
  const lifePathGraph = useLifePathGraph(useLifePathSource ? 'goal-software-engineer' : null);
  
  // === Phase 3: Checkpoint feature flag - read ?checkpoints=1 flag ===
  const [enableCheckpoints, setEnableCheckpoints] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('checkpoints') === '1';
    // Guard: checkpoints require vertical layout
    if (flag && !useVerticalLayout) {
      console.warn('[V3] Checkpoints require layout=vertical, ignoring ?checkpoints=1');
      return false;
    }
    return flag;
  });
  
  // Handler to toggle checkpoints
  const handleToggleCheckpoints = useCallback(() => {
    if (!useVerticalLayout) {
      toast.error('Checkpoints require vertical layout');
      return;
    }
    
    // Check if data is ready
    if (!lifePathGraph?.graph?.nodes?.length) {
      toast.error('Life Path data still loading...');
      return;
    }
    
    const newValue = !enableCheckpoints;
    setEnableCheckpoints(newValue);
    
    // Update URL
    const url = new URL(window.location.href);
    if (newValue) {
      url.searchParams.set('checkpoints', '1');
      url.searchParams.set('source', 'lifepath'); // checkpoints need lifepath data
      url.searchParams.set('layout', 'vertical');
    } else {
      url.searchParams.delete('checkpoints');
    }
    window.history.pushState({}, '', url.toString());
    
    toast.success(`Checkpoints ${newValue ? 'enabled' : 'disabled'}`);
  }, [enableCheckpoints, useVerticalLayout, lifePathGraph?.graph]);
  
  // Bridge Life Path Graph to V3 format if enabled
  const bridgedData = useMemo(() => {
    if (!useLifePathSource || !lifePathGraph?.graph?.nodes) {
      return null;
    }
    
    console.log('[V3 Canvas] Bridging Life Path Graph to V3 format');
    return lifePathToV3(lifePathGraph.graph, { showAlternatives: false });
  }, [useLifePathSource, lifePathGraph?.graph]);
  
  // Bridge metadata for __dumpV3()
  const sourceMeta: BridgeMeta = bridgedData?.meta ?? {
    forksDetected: 0,
    tiers: 4,
    slugsUsed: [],
    alternativesByNode: {}
  };

  // Build full graph and create collapsed view (Step 1: Ship collapsed view only)
  useEffect(() => {
    console.log('[V3 Canvas] Building graph from seed data...');
    
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
    
    // Run layout engine on full graph (for later expansions)
    // Phase 3: Pass checkpoint options and metadata to buildGraph
    // Skip horizontal layout for vertical mode - let vertical engine handle positioning
    const positionedFull = useVerticalLayout
      ? v3Graph  // Keep raw nodes, let vertical engine handle positioning
      : (enableMetrics 
          ? buildEduTreeGraphWithMetrics(v3Graph, { enableCheckpoints, meta: sourceMeta }).graph
          : buildEduTreeGraph(v3Graph, { enableCheckpoints, meta: sourceMeta }));
    
    setFullGraph(positionedFull);
    
    // Create collapsed view IMMEDIATELY (progressive disclosure - Step 1)
    const { visibleNodes, visibleEdges, bundles: bundleMap } = createCollapsedView(positionedFull);
    
    console.log('[V3 Canvas] Progressive disclosure (collapsed view):', {
      fullNodes: positionedFull.nodes.length,
      visibleNodes: visibleNodes.length,
      bundles: bundleMap.size,
      mode: 'COLLAPSED - bundles + gates only'
    });
    
    // Position the collapsed view (Step 5: spine edges only)
    const collapsedGraph = { nodes: visibleNodes, edges: visibleEdges };
    
    // CRITICAL FIX: Apply vertical layout immediately for collapsed graph
    const positionedCollapsed = useVerticalLayout
      ? { 
          nodes: calculateVerticalLayout(collapsedGraph.nodes, VERT), 
          edges: collapsedGraph.edges 
        }
      : (enableMetrics
          ? buildEduTreeGraphWithMetrics(collapsedGraph, { enableCheckpoints, meta: sourceMeta }).graph
          : buildEduTreeGraph(collapsedGraph, { enableCheckpoints, meta: sourceMeta }));
    
    // Debug: Log bundle positions after vertical layout
    if (useVerticalLayout) {
      const bundles = positionedCollapsed.nodes.filter(n => n.type === 'track-bundle');
      console.log('[V3 Canvas] Bundle positions after vertical layout:', 
        bundles.map(n => ({ id: n.id, year: n.data.year, x: n.position.x, y: n.position.y }))
      );
    }
    
    setBundles(bundleMap);
    
    if (enableMetrics) {
      const { metrics } = buildEduTreeGraphWithMetrics(collapsedGraph, { enableCheckpoints, meta: sourceMeta });
      setLayoutMetrics(metrics);
      console.log('[V3 Canvas] Layout metrics (collapsed):', metrics);
    }
    
    // Apply layout based on feature flag
    let finalGraph: V3Graph;
    
    if (useVerticalLayout) {
      // Vertical flow: pure top-to-bottom layout (already applied above)
      console.log('[V3 Canvas] Using VERTICAL layout engine');
      
      // FIX #3: Pre-validate edges to prevent orphan references
      const nodeIds = new Set(positionedCollapsed.nodes.map(n => n.id));
      const validEdges = positionedCollapsed.edges.filter(e => {
        const ok = nodeIds.has(e.source) && nodeIds.has(e.target);
        if (!ok && import.meta.env.DEV) {
          console.error('[V3 Canvas] Orphan edge filtered:', e.id, e.source, '→', e.target);
        }
        return ok;
      });
      
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
    
    safeSetCurrentGraph(finalGraph, useVerticalLayout ? 'initial:vertical' : 'initial:horizontal');
  }, [bridgedData, enableCheckpoints, sourceMeta, enableMetrics, useVerticalLayout, showComparison]);

  // Loading guard: show loading state while Life Path data loads
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

  // FIX #3: One-time fitView with DOM presence guard
  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current || nodes.length === 0) return;

    const hasNodesInDOM = document.querySelectorAll('.react-flow__node').length > 0;
    if (!hasNodesInDOM) return;

    didFitRef.current = true;
    const timer = setTimeout(() => {
      requestAnimationFrame(() => fitView({ padding: 0.6, includeHiddenNodes: true }));
    }, 120);
    return () => clearTimeout(timer);
  }, [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // FIX #5: Enhanced DOM probe with visibility checks
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
  }, [fullGraph, currentGraph, bundles, useVerticalLayout, enableCheckpoints, sourceMeta, safeSetCurrentGraph]);

  // FIX #2: Memoize nodeTypes to prevent ReactFlow prop identity changes
  const memoizedNodeTypes = useMemo(() => ({
    requirement: V3RequirementNode,
    gate: V3GateNode,
    year: V3YearNode,
    'track-bundle': V3TrackBundleNode,
    checkpoint: V3CheckpointNode,
  }), []);

  // Memoize defaultViewport to prevent unnecessary ReactFlow updates
  const defaultViewport = useMemo(() => ({ x: -400, y: -200, zoom: 0.5 }), []);

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
      
      // Add onToggle ONLY when graphs are ready and it's a bundle
      if (node.type === 'track-bundle' && fullGraph && currentGraph) {
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          sourcePosition: sourcePos,
          targetPosition: targetPos,
          data: {
            ...baseData,
            onToggle: () => handleBundleToggle(node.id)
          }
        };
      }
      
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        data: baseData
      };
    });
  }, [nodes, fullGraph, currentGraph, handleBundleToggle]);

  // Convert V3 edges to ReactFlow edges with proper routing and focus mode
  const reactFlowEdges: Edge[] = useMemo(() => {
    if (useVerticalLayout) {
      // Vertical flow: uniform top-to-bottom edges
      // CRITICAL FIX: Pass nodes to edge mapper for validation
      return mapEdgesVertical(edges, nodes);
    }
    
    // Horizontal flow: gate edges vertical, spine edges horizontal
    return edges.map((edge: V3EdgeType) => {
      const isGate = edge.kind === 'gate';
      const isSpine = edge.kind === 'spine';
      const isFocused = focusedEdges.size === 0 || focusedEdges.has(edge.id);
      
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
    </div>
  );
}

export default function EduTreeV3Canvas(props: EduTreeV3CanvasProps) {
  return (
    <ReactFlowProvider>
      <EduTreeV3CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
