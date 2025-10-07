import React, { useMemo, useState, useCallback, useEffect } from 'react';
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

const nodeTypes = {
  requirement: V3RequirementNode,
  gate: V3GateNode,
  year: V3YearNode,
  'track-bundle': V3TrackBundleNode,
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

  // Build full graph and create collapsed view (Step 1: Ship collapsed view only)
  useEffect(() => {
    console.log('[V3 Canvas] Building graph from seed data...');
    
    // Adapt V2 seed to V3 format
    const v3Graph = adaptSeedDataV2(GOLDEN_LAYOUT_SEED);
    
    console.log('[V3 Canvas] Adapted graph:', {
      nodeCount: v3Graph.nodes.length,
      edgeCount: v3Graph.edges.length
    });
    
    // Run layout engine on full graph (for later expansions)
    const positionedFull = enableMetrics 
      ? buildEduTreeGraphWithMetrics(v3Graph).graph
      : buildEduTreeGraph(v3Graph);
    
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
    const positionedCollapsed = enableMetrics
      ? buildEduTreeGraphWithMetrics(collapsedGraph).graph
      : buildEduTreeGraph(collapsedGraph);
    
    setBundles(bundleMap);
    setCurrentGraph(positionedCollapsed);
    
    if (enableMetrics) {
      const { metrics } = buildEduTreeGraphWithMetrics(collapsedGraph);
      setLayoutMetrics(metrics);
      console.log('[V3 Canvas] Layout metrics (collapsed):', metrics);
    }
    
    // Step 6: Validate on collapsed view
    const validation = validateNoOverlaps(positionedCollapsed.nodes, LAYOUT_TOKENS);
    if (validation.hasOverlaps) {
      console.error('[V3 Canvas] OVERLAPS IN COLLAPSED VIEW:', validation.overlaps.length);
      console.table(validation.diagnostics.slice(0, 5));
    } else {
      console.log('[V3 Canvas] ✅ No overlaps in collapsed view');
    }
    
    // Diagnostic tables for layout verification
    console.log('[V3 Diagnostics] Node positions:');
    console.table(positionedCollapsed.nodes.map(n => ({
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
    console.table(positionedCollapsed.edges.map(e => {
      const src = positionedCollapsed.nodes.find(n => n.id === e.source);
      const tgt = positionedCollapsed.nodes.find(n => n.id === e.target);
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
      visibleNodes: positionedCollapsed.nodes.length,
      edges: positionedCollapsed.edges.length,
      stepY: LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP,
      yearColumns: LAYOUT_TOKENS.YEAR_COL,
      trackOffset: LAYOUT_TOKENS.TRACK_COLUMN_OFFSET
    });
    
    // Runtime assertion: verify bundles are on correct rows
    const stepY = LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP;
    const bundleRows = new Map<number, number>();
    for (const n of positionedCollapsed.nodes) {
      if (n.type === 'track-bundle') {
        const yr = n.data.year ?? 0;
        const expected = (yr - 1) * stepY;
        const actual = n.position.y;
        const drift = Math.abs(actual - expected);
        bundleRows.set(yr, actual);
        
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
    
    // Apply layout based on feature flag
    let finalGraph: V3Graph;
    
    if (useVerticalLayout) {
      // Vertical flow: pure top-to-bottom layout
      console.log('[V3 Canvas] Using VERTICAL layout engine');
      const verticalNodes = calculateVerticalLayout(positionedCollapsed.nodes, VERT);
      finalGraph = { nodes: verticalNodes, edges: positionedCollapsed.edges };
      
      // Add comparison data to Track Gate
      const trackGate = finalGraph.nodes.find(n => n.id === 'gate-y3-tracks');
      if (trackGate && showComparison) {
        // Mock comparison data (in production, fetch from seed data or API)
        trackGate.data = {
          ...trackGate.data,
          showCompare: true,
          se: {
            courses: 12,
            credits: 48,
            durationWeeks: 32,
            outcomes: ['Full-stack development', 'Cloud architecture'],
          },
          ds: {
            courses: 10,
            credits: 40,
            durationWeeks: 28,
            outcomes: ['Machine learning', 'Data pipelines'],
          },
        };
      }
    } else {
      // Horizontal flow: legacy year-column layout
      console.log('[V3 Canvas] Using HORIZONTAL layout engine (legacy)');
      if (process.env.NODE_ENV !== 'production') {
        const clamped = V3Clamp.clampCollapsed(positionedCollapsed, LAYOUT_TOKENS);
        finalGraph = clamped;
      } else {
        finalGraph = positionedCollapsed;
      }
    }
    
    // Debug instrumentation (dev only)
    if (process.env.NODE_ENV !== 'production') {
      (window as any).__V3DBG_lastGraph = finalGraph;
      (window as any).__dumpV3 = () => ({
        nodes: finalGraph.nodes,
        edges: finalGraph.edges,
        tokens: useVerticalLayout ? VERT : LAYOUT_TOKENS,
        layout: useVerticalLayout ? 'vertical' : 'horizontal',
        bundleRows: Object.fromEntries(bundleRows)
      });
      
      // Run HUD + assertions (skip for vertical until we adapt V3DBG)
      if (!useVerticalLayout) {
        V3DBG.afterRender(finalGraph, LAYOUT_TOKENS);
      }
    }
    
    setCurrentGraph(finalGraph);
  }, [enableMetrics, useVerticalLayout, showComparison]);

  const { nodes, edges } = currentGraph ?? { nodes: [], edges: [] };

  // Step 3: Guard the toggle handler (prevents early render issues)
  const handleBundleToggle = useCallback((bundleId: string) => {
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
    
    // Re-layout after expansion/collapse
    const positioned = buildEduTreeGraph(newGraph);
    
    // Validate after toggle
    const validation = validateNoOverlaps(positioned.nodes, LAYOUT_TOKENS);
    if (validation.hasOverlaps) {
      console.error('[V3 Canvas] OVERLAPS AFTER TOGGLE:', validation.overlaps.length);
      console.table(validation.diagnostics.slice(0, 5));
    }
    
    setCurrentGraph(positioned);
  }, [fullGraph, currentGraph, bundles]);

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
      return mapEdgesVertical(edges);
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
    <div className="relative w-full h-screen">
      {/* HUD Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
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

      {/* ReactFlow Canvas */}
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        selectNodesOnDrag={false}
        panOnDrag
        elementsSelectable={false}
        nodesDraggable={false}
        nodesConnectable={false}
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
  );
}

export default function EduTreeV3Canvas(props: EduTreeV3CanvasProps) {
  return (
    <ReactFlowProvider>
      <EduTreeV3CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
