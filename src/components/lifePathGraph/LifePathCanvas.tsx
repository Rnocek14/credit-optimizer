import React, { useMemo, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Position,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@/styles/lifePath.css';
import { determineNodeGhostStatus } from '@/lib/pathfinding/ghosting';
import { LifePathGraph, useLifePathGraph } from '@/hooks/useLifePathGraph';
import { educationalLayoutV4 } from '@/lib/layout/educationalLayoutV4';
import { GraphNode, PathfindingResult } from '@/types/lifePathGraph';
import { LifePathNodeComponent } from './LifePathNode';
import { LifePathEdgeComponent } from './LifePathEdge';
import { BranchDecisionCard } from './BranchDecisionCard';
import { InstitutionLane } from './InstitutionLane';
import { EducationalBands } from './EducationalBands';
import { CALM_LANES } from '@/components/calm/LaneBackground';
import { MetricsPill } from '@/components/ui/metrics-pill';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { styleEdge, getNodeColorByType, getNodeBorderColorByType, calculateNodePosition, determineEdgeTier, determineNodeTier } from '@/lib/pathfinding/visualization';
import { applyUnifiedLayoutV3, layoutAndScan, assertTierEdgeParity, type Graph as LayoutGraph } from '@/lib/layout/unifiedLayoutV3';
import { Eye, EyeOff, Zap, DollarSign, BookOpen, BarChart3 } from 'lucide-react';

const nodeTypes = {
  lifePathNode: LifePathNodeComponent,
};

const edgeTypes = {
  lifePathEdge: LifePathEdgeComponent,
};

interface LifePathCanvasProps {
  graph: LifePathGraph;
  pathfindingResult?: PathfindingResult | null;
  onNodeClick?: (node: GraphNode) => void;
  selectedNode?: GraphNode | null;
  findPaths?: (goalId: string) => void;
  activeGoal?: string;
}

export default function LifePathCanvas({ 
  graph, 
  pathfindingResult, 
  onNodeClick, 
  selectedNode,
  findPaths,
  activeGoal 
}: LifePathCanvasProps) {
  console.log('🔧 LifePathCanvas: Attempting to use useReactFlow hook');
  const reactFlowInstance = useReactFlow();
  console.log('✅ LifePathCanvas: useReactFlow hook successful', { reactFlowInstance });
  
  // Get tierOfEdge from hook for consistency
  const { tierOfEdge, activePath: hookActivePath } = useLifePathGraph();

  // TEMP: force stable V3 layout - flip to true only for local experiments
  const USE_EDUCATIONAL_LAYOUT = false;

  const activePath = hookActivePath || pathfindingResult?.fastest;
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // IMPORTANT: if path is empty, DO NOT filter or hide anything
  const safeActivePath = activePath && Array.isArray(activePath.nodeIds) ? activePath : { nodeIds: [] };

  // Build normalized layoutInput once with conservative defaults
  const layoutInput: LayoutGraph = useMemo(() => ({
    nodes: (graph.nodes || []).map(n => ({
      id: String(n.id),
      label: n.title || n.id,
      lane: n.tags?.includes('transfer') ? 'Transfer' : n.tags?.includes('core') ? 'Core' : 'Electives',
      width: 260,
      height: 120,
      data: n,
    })),
    edges: (graph.edges || []).map(e => ({
      id: String(e.id),
      source: String(e.sourceId),
      target: String(e.targetId),
      kind: e.type === 'creditTransfersTo' ? 'credit_transfer' : 'requires',
      data: e,
    })),
  }), [graph.nodes, graph.edges]);

  // Stable pass (V3) - single source of truth
  const laidGraphMemo = useMemo(() => {
    const { graph: laid, scan } = layoutAndScan(
      layoutInput,
      { hGap: 320, vGap: 40, laneOrder: ['Core','Electives','Transfer','Orphan'], margin: 16, avoidRadius: 12, maxSweeps: 4 },
      activePath?.edgeIds || []
    );
    if (import.meta.env.DEV) {
      console.info('%cLifePath Layout V3 ENABLED','background:#1d4ed8;color:white;padding:2px 6px;border-radius:4px;');
      console.log('[SCAN]', scan.summary);
    }
    return laid;
  }, [layoutInput, activePath?.edgeIds?.join(',')]);

  // Skip two-pass measurement for now - use single-pass V3 layout
  // (Educational V4 will use fixed dimensions when enabled)

  // Use single-pass V3 graph as source of truth

  // DEV hard-fails
  if (import.meta.env.DEV) {
    const missing = laidGraphMemo.nodes.filter(n => !Number.isFinite(n.x!) || !Number.isFinite(n.y!));
    if (missing.length) throw new Error('[Canvas] Missing positions for: ' + missing.map(n=>n.id).join(','));
    if (laidGraphMemo.edges.every(e => !e.points?.length)) {
      console.warn('[Canvas] No edge points computed - router not applied');
    }
  }

  // React Flow nodes from laidGraphMemo only
  const reactFlowNodes: Node[] = useMemo(() => laidGraphMemo.nodes.map(n => {
    const nodeTier = undefined;
    const isInMainPath = safeActivePath.nodeIds.includes(n.id);
    const stepNumber = isInMainPath ? safeActivePath.nodeIds.indexOf(n.id) + 1 : undefined;

    return {
      id: n.id,
      type: 'lifePathNode',
      position: { x: n.x!, y: n.y! },
      data: { 
        ...n.data,
        node: n.data,
        isSelected: selectedNode?.id === n.id,
        isInPath: isInMainPath,
        isMainPath: isInMainPath,
        stepNumber,
        tier: nodeTier,
        lane: n.lane,
        isHovered: hoveredNode === n.id,
      },
      draggable: false,
    };
  }), [laidGraphMemo, safeActivePath.nodeIds, selectedNode, hoveredNode]);

  // React Flow edges from laidGraphMemo only (pass through points)
  const reactFlowEdges: Edge[] = useMemo(() => {
    const visible = new Set(reactFlowNodes.map(n => n.id));
    return laidGraphMemo.edges
      .filter(e => visible.has(e.source) && visible.has(e.target))
      .map(e => {
        const tier = tierOfEdge({ id: e.id, source: e.source, target: e.target }, activePath);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'lifePathEdge',
          data: {
            ...e.data,
            tier,
            points: e.points,                 // <-- critical for curve routing
            badge: e.badge,
            edgeLabel: e.data?.label,
          },
          style: e.style,
        };
      });
  }, [laidGraphMemo, reactFlowNodes, activePath?.id, (activePath?.edgeIds || []).join(',')]);

  if (import.meta.env.DEV) {
    console.log('[RF] nodes/edges', reactFlowNodes.length, reactFlowEdges.length);
  }

  // Click handler
  const handleNodeClick = useCallback((_, node: Node) => {
    const g = graph.nodes.find(n => n.id === node.id);
    if (g && onNodeClick) onNodeClick(g);
  }, [graph.nodes, onNodeClick]);

  const handleNodeMouseEnter = useCallback((_, node: Node) => {
    setHoveredNode(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // Check if layout is ready (no blocking early return)
  const ready = (reactFlowNodes?.length ?? 0) > 0 && (reactFlowEdges?.length ?? 0) > 0;

  return (
    <div className="w-full space-y-4">
      <div>Emergency Rollback Complete - V3 Layout Active</div>
      
      <div className="relative w-full h-[600px] border rounded-lg overflow-hidden">
        {/* Loading overlay when not ready */}
        {!ready && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none z-50">
            <div className="rounded-xl px-4 py-2 text-sm bg-background/70 border">
              Laying out graph…
            </div>
          </div>
        )}
        
        <ReactFlow
          key="lifepath-safe"
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, duration: 400 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeColor="#374151"
            nodeColor="#f3f4f6"
            nodeBorderRadius={8}
          />
        </ReactFlow>
      </div>
    </div>
  );
}