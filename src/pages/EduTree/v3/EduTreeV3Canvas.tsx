import React, { useMemo, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { validateNoOverlaps } from './engine/overlapValidator';
import { buildEduTreeGraph, buildEduTreeGraphWithMetrics } from './engine/buildGraph';
import { adaptSeedDataV2 } from './engine/v2Adapter';
import { LAYOUT_TOKENS } from './utils/layoutTokensV3';
import { V3Node as V3NodeType, V3Edge as V3EdgeType } from './types/v3';
import { GOLDEN_LAYOUT_SEED } from '../data/seedDataV2';

// V3-specific node components
import V3RequirementNode from './components/V3RequirementNode';
import V3GateNode from './components/V3GateNode';
import V3YearNode from './components/V3YearNode';

const nodeTypes = {
  requirement: V3RequirementNode,
  gate: V3GateNode,
  year: V3YearNode,
  'track-bundle': V3RequirementNode // Fallback
};

interface EduTreeV3CanvasProps {
  enableMetrics?: boolean;
}

function EduTreeV3CanvasInner({ enableMetrics = false }: EduTreeV3CanvasProps) {
  const { fitView } = useReactFlow();
  const [layoutMetrics, setLayoutMetrics] = useState<any>(null);

  // Build graph from V2 seed data
  const { nodes, edges } = useMemo(() => {
    console.log('[V3 Canvas] Building graph from seed data...');
    
    // Adapt V2 seed to V3 format
    const v3Graph = adaptSeedDataV2(GOLDEN_LAYOUT_SEED);
    
    console.log('[V3 Canvas] Adapted graph:', {
      nodeCount: v3Graph.nodes.length,
      edgeCount: v3Graph.edges.length
    });
    
    // Run layout engine
    if (enableMetrics) {
      const { graph, metrics } = buildEduTreeGraphWithMetrics(v3Graph);
      setLayoutMetrics(metrics);
      console.log('[V3 Canvas] Layout metrics:', metrics);
      return graph;
    } else {
      return buildEduTreeGraph(v3Graph);
    }
  }, [enableMetrics]);

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

  // Convert V3 edges to ReactFlow edges
  const reactFlowEdges: Edge[] = useMemo(() => {
    return edges.map((edge: V3EdgeType) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.kind === 'gate' ? 'smoothstep' : 'default',
      animated: edge.kind === 'gate',
      style: {
        stroke: edge.kind === 'gate' ? '#6366f1' : '#94a3b8',
        strokeWidth: 2
      }
    }));
  }, [edges]);

  const handleValidateOverlaps = useCallback(() => {
    const result = validateNoOverlaps(nodes, LAYOUT_TOKENS);
    
    if (result.hasOverlaps) {
      toast.error(`Found ${result.overlaps.length} overlaps`, {
        description: result.overlaps.slice(0, 3).map(o => `${o.a} ↔ ${o.b}`).join(', ')
      });
      
      console.table(result.overlaps.slice(0, 10));
    } else {
      toast.success('No overlaps detected! ✅');
    }
    
    console.log('[V3 Canvas] Overlap validation:', result);
  }, [nodes]);

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
          onClick={handleFitView}
          variant="secondary"
          size="sm"
        >
          Fit View
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
