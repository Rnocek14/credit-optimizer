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
import { LifePathGraph, useLifePathGraph } from '@/hooks/useLifePathGraph';
import { GraphNode, PathfindingResult } from '@/types/lifePathGraph';
import { LifePathNodeComponent } from './LifePathNode';
import { LifePathEdgeComponent } from './LifePathEdge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import {
  layoutAndScan,
  type Graph as LayoutGraph,
} from '@/lib/layout/unifiedLayoutV3';

const nodeTypes = { lifePathNode: LifePathNodeComponent };
const edgeTypes = { lifePathEdge: LifePathEdgeComponent };

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
  activeGoal,
}: LifePathCanvasProps) {
  // React Flow instance (for fitView)
  const rf = useReactFlow();

  // tier-of-edge helper from hook (keeps consistency)
  const { tierOfEdge, activePath: hookActivePath } = useLifePathGraph();

  const activePath = hookActivePath || pathfindingResult?.fastest;
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filters (default: everything on)
  const [showOn, setShowOn] = useState(true);
  const [showRelated, setShowRelated] = useState(true);
  const [showOff, setShowOff] = useState(true);

  const isTierVisible = (t?: 'on-path' | 'related' | 'off-path') =>
    (t === 'on-path' && showOn) ||
    (t === 'related' && showRelated) ||
    (t === 'off-path' && showOff) ||
    t === undefined; // edges with no tier fall back to visible

  // IMPORTANT: if path is empty, DO NOT filter nodes
  const safeActivePath = activePath && Array.isArray(activePath.nodeIds) ? activePath : { nodeIds: [] };

  // Normalize layout input once
  const layoutInput: LayoutGraph = useMemo(
    () => ({
      nodes: (graph.nodes || []).map((n) => ({
        id: String(n.id),
        label: n.title || n.id,
        lane: n.tags?.includes('transfer')
          ? 'Transfer'
          : n.tags?.includes('core')
          ? 'Core'
          : 'Electives',
        width: 260,
        height: 120,
        data: n,
      })),
      edges: (graph.edges || []).map((e) => ({
        id: String(e.id),
        source: String(e.sourceId),
        target: String(e.targetId),
        kind: e.type === 'creditTransfersTo' ? 'credit_transfer' : 'requires',
        data: e,
      })),
    }),
    [graph.nodes, graph.edges]
  );

  // Run V3 layout & keep scan alongside laid graph
  const layoutResult = useMemo(() => {
    const res = layoutAndScan(
      layoutInput,
      { hGap: 320, vGap: 40, laneOrder: ['Core', 'Electives', 'Transfer', 'Orphan'], margin: 16, avoidRadius: 12, maxSweeps: 4 },
      activePath?.edgeIds || []
    );
    if (import.meta.env.DEV) {
      console.info('%cLifePath Layout V3 ENABLED', 'background:#1d4ed8;color:white;padding:2px 6px;border-radius:4px;');
      console.log('[SCAN]', res.scan?.summary);
    }
    return res; // { graph, scan }
  }, [layoutInput, activePath?.edgeIds?.join(',')]);

  const laidGraphMemo = layoutResult.graph;
  const scanMemo = layoutResult.scan; // used for the Issues summary

  // DEV hard-fails
  if (import.meta.env.DEV) {
    const missing = laidGraphMemo.nodes.filter((n) => !Number.isFinite(n.x!) || !Number.isFinite(n.y!));
    if (missing.length) throw new Error('[Canvas] Missing positions for: ' + missing.map((n) => n.id).join(','));
    if (laidGraphMemo.edges.every((e) => !e.points?.length)) {
      console.warn('[Canvas] No edge points computed - router not applied');
    }
  }

  // Nodes
  const reactFlowNodes: Node[] = useMemo(
    () =>
      laidGraphMemo.nodes.map((n) => {
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
            tier: undefined,
            lane: n.lane,
            isHovered: hoveredNode === n.id,
          },
          draggable: false,
        };
      }),
    [laidGraphMemo, safeActivePath.nodeIds, selectedNode, hoveredNode]
  );

  // Edge tier counts (for badges)
  const tierCounts = useMemo(() => {
    let on = 0, rel = 0, off = 0;
    const visible = new Set(reactFlowNodes.map((n) => n.id));
    laidGraphMemo.edges.forEach((e) => {
      if (!visible.has(e.source) || !visible.has(e.target)) return;
      const t = tierOfEdge({ id: e.id, source: e.source, target: e.target }, activePath);
      if (t === 'on-path') on++;
      else if (t === 'related') rel++;
      else off++;
    });
    return { on, rel, off };
  }, [laidGraphMemo.edges, reactFlowNodes, tierOfEdge, activePath?.id, (activePath?.edgeIds || []).join(','), (activePath?.metadata?.materializedNodes || activePath?.nodeIds || []).join(',')]);

  // Edges (filter by tier visibility; pass points through)
  const reactFlowEdges: Edge[] = useMemo(() => {
    const visible = new Set(reactFlowNodes.map((n) => n.id));
    return laidGraphMemo.edges
      .filter((e) => visible.has(e.source) && visible.has(e.target))
      .map((e) => {
        const tier = tierOfEdge({ id: e.id, source: e.source, target: e.target }, activePath);
        if (tier && !isTierVisible(tier)) return null;

        const orig = layoutInput.edges.find((x) => x.id === e.id);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'lifePathEdge',
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            edge: { id: e.id, type: orig?.data?.type, kind: orig?.kind, label: orig?.data?.label },
            tier,
            label: orig?.data?.type === 'creditTransfersTo' ? orig?.data?.label || 'Transfer' : undefined,
            points: e.points, // <-- curved or polyline points from V3
            badge: e.badge,
            isRelatedToHovered: !!hoveredNode && (orig?.data?.sourceId === hoveredNode || orig?.data?.targetId === hoveredNode),
          },
          style: e.style,
          className: tier ? `lp-edge-${tier}` : '',
        } as Edge;
      })
      .filter((x): x is Edge => !!x);
  }, [
    laidGraphMemo.edges,
    reactFlowNodes,
    layoutInput.edges,
    hoveredNode,
    tierOfEdge,
    activePath?.id,
    (activePath?.edgeIds || []).join(','),
    (activePath?.metadata?.materializedNodes || activePath?.nodeIds || []).join(','),
    showOn,
    showRelated,
    showOff,
  ]);

  if (import.meta.env.DEV) {
    console.log('[RF] nodes/edges', reactFlowNodes.length, reactFlowEdges.length);
  }

  // Click / hover
  const handleNodeClick = useCallback(
    (_, node: Node) => {
      const g = graph.nodes.find((n) => n.id === node.id);
      if (g && onNodeClick) onNodeClick(g);
    },
    [graph.nodes, onNodeClick]
  );
  const handleNodeMouseEnter = useCallback((_, node: Node) => setHoveredNode(node.id), []);
  const handleNodeMouseLeave = useCallback(() => setHoveredNode(null), []);

  const ready = (reactFlowNodes?.length ?? 0) > 0 && (reactFlowEdges?.length ?? 0) > 0;

  // Toolbar controls (filters + scan + fit)
  const crossings = scanMemo?.summary?.crossings ?? 0;
  const through = scanMemo?.summary?.through ?? 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">V3 layout active</span>

        {/* Filters */}
        <div className="ml-2 flex items-center gap-1">
          <Button size="sm" variant={showOn ? 'default' : 'outline'} onClick={() => setShowOn(v => !v)}>
            {showOn ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            On-path <Badge className="ml-2" variant="secondary">{tierCounts.on}</Badge>
          </Button>
          <Button size="sm" variant={showRelated ? 'default' : 'outline'} onClick={() => setShowRelated(v => !v)}>
            {showRelated ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            Related <Badge className="ml-2" variant="secondary">{tierCounts.rel}</Badge>
          </Button>
          <Button size="sm" variant={showOff ? 'default' : 'outline'} onClick={() => setShowOff(v => !v)}>
            {showOff ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            Off <Badge className="ml-2" variant="secondary">{tierCounts.off}</Badge>
          </Button>
        </div>

        {/* Issues */}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={crossings ? 'destructive' : 'secondary'}>
            Crossings: {crossings}
          </Badge>
          <Badge variant={through ? 'destructive' : 'secondary'}>
            Through-nodes: {through}
          </Badge>

          <Button size="sm" variant="outline" onClick={() => rf.fitView?.({ padding: 0.1, duration: 400 })}>
            Fit view
          </Button>
        </div>
      </div>

      <div className="relative w-full h-[600px] border rounded-lg overflow-hidden">
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
          <MiniMap nodeStrokeColor="#374151" nodeColor="#f3f4f6" nodeBorderRadius={8} />
        </ReactFlow>
      </div>
    </div>
  );
}