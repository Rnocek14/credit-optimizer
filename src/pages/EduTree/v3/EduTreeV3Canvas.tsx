import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { validateNoOverlaps } from './engine/overlapValidator';
import { buildEduTreeGraph, buildEduTreeGraphWithMetrics } from './engine/buildGraph';
import { createCollapsedView, expandBundle, collapseBundle, BundleCard } from './engine/progressiveDisclosure';
import { adaptSeedDataV2 } from './engine/v2Adapter';
import { LAYOUT_TOKENS } from './utils/layoutTokensV3';
import { V3Node as V3NodeType, V3Edge as V3EdgeType, V3Graph } from './types/v3';
import { GOLDEN_LAYOUT_SEED } from '../data/seedDataV2';

// V3-specific node components
import V3RequirementNode from './components/V3RequirementNode';
import V3GateNode from './components/V3GateNode';
import V3YearNode from './components/V3YearNode';
import { V3TrackBundleNode } from './components/V3TrackBundleNode';

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

  // Build full graph and create collapsed view
  useEffect(() => {
    console.log('[V3 Canvas] Building graph from seed data...');
    
    // Adapt V2 seed to V3 format
    const v3Graph = adaptSeedDataV2(GOLDEN_LAYOUT_SEED);
    
    console.log('[V3 Canvas] Adapted graph:', {
      nodeCount: v3Graph.nodes.length,
      edgeCount: v3Graph.edges.length
    });
    
    // Run layout engine on full graph
    const positioned = enableMetrics 
      ? buildEduTreeGraphWithMetrics(v3Graph).graph
      : buildEduTreeGraph(v3Graph);
    
    setFullGraph(positioned);
    
    // Create collapsed view (progressive disclosure)
    const { visibleNodes, visibleEdges, bundles: bundleMap } = createCollapsedView(positioned);
    
    console.log('[V3 Canvas] Progressive disclosure:', {
      fullNodes: positioned.nodes.length,
      visibleNodes: visibleNodes.length,
      bundles: bundleMap.size
    });
    
    // Position the collapsed view
    const collapsedGraph = { nodes: visibleNodes, edges: visibleEdges };
    const positionedCollapsed = enableMetrics
      ? buildEduTreeGraphWithMetrics(collapsedGraph).graph
      : buildEduTreeGraph(collapsedGraph);
    
    setBundles(bundleMap);
    setCurrentGraph(positionedCollapsed);
    
    if (enableMetrics) {
      const { metrics } = buildEduTreeGraphWithMetrics(collapsedGraph);
      setLayoutMetrics(metrics);
      console.log('[V3 Canvas] Layout metrics:', metrics);
    }
  }, [enableMetrics]);

  const { nodes, edges } = currentGraph ?? { nodes: [], edges: [] };

  // Convert V3 nodes to ReactFlow nodes
  const reactFlowNodes: Node[] = useMemo(() => {
    return nodes.map((node: V3NodeType) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: node.data.title || node.id,
        // Add any additional data needed by V2 components
        area: 'core',
        credits_needed: 3,
        rule_type: 'ALL'
      }
    }));
  }, [nodes]);

  // Convert V3 edges to ReactFlow edges with focus mode
  const reactFlowEdges: Edge[] = useMemo(() => {
    return edges.map((edge: V3EdgeType) => {
      const isGate = edge.kind === 'gate';
      const isFocused = focusedEdges.size === 0 || focusedEdges.has(edge.id);
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: isGate ? 'smoothstep' : 'default',
        animated: isGate && isFocused,
        style: {
          stroke: isGate ? '#6366f1' : '#94a3b8',
          strokeWidth: 2,
          opacity: isFocused ? 1 : 0.15
        }
      };
    });
  }, [edges, focusedEdges]);

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

  // Handle bundle expansion/collapse
  const handleBundleToggle = useCallback((bundleId: string) => {
    if (!fullGraph || !currentGraph) return;
    
    const bundle = bundles.get(bundleId);
    if (!bundle) return;
    
    const isExpanded = !currentGraph.nodes.some(n => n.id === bundleId);
    
    let newGraph: V3Graph;
    if (isExpanded) {
      // Collapse
      newGraph = collapseBundle(bundleId, currentGraph, bundles);
      console.log('[V3 Canvas] Collapsed bundle:', bundleId);
    } else {
      // Expand
      newGraph = expandBundle(bundleId, currentGraph, fullGraph, bundles);
      console.log('[V3 Canvas] Expanded bundle:', bundleId);
    }
    
    // Re-position after expansion/collapse
    const positioned = buildEduTreeGraph(newGraph);
    setCurrentGraph(positioned);
  }, [fullGraph, currentGraph, bundles]);

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

      {/* Debug Info */}
      <div className="absolute top-4 right-4 z-10 bg-card p-3 rounded-lg border text-xs">
        <div className="font-semibold mb-1">V3 Engine Active</div>
        <div>Nodes: {reactFlowNodes.length}</div>
        <div>Edges: {reactFlowEdges.length}</div>
        <div className="text-muted-foreground text-[10px] mt-1">
          Week 2: Renderer Integration
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
