import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { determineNodeGhostStatus } from '@/lib/pathfinding/ghosting';
import { LifePathGraph } from '@/hooks/useLifePathGraph';
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
import { styleEdge, getNodeColorByType, getNodeBorderColorByType, calculateNodePosition } from '@/lib/pathfinding/visualization';
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
}

export default function LifePathCanvas({ 
  graph, 
  pathfindingResult, 
  onNodeClick, 
  selectedNode 
}: LifePathCanvasProps) {
  // Only show ghosts when active path is empty (to provide context)
  const [showGhosts, setShowGhosts] = useState(false);
  const [activePreset, setActivePreset] = useState<'fastest' | 'cheapest' | 'creditMaximized' | 'balanced'>('fastest');
  const [branchDecisions, setBranchDecisions] = useState<any[]>([]);
  const [overlapCounts, setOverlapCounts] = useState<Record<string, number>>({});

  // Calculate overlap counts for nodes used in multiple paths
  const calculateOverlapCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!pathfindingResult) return counts;
    
    // Count usage across all paths
    const paths = [
      pathfindingResult.fastest,
      pathfindingResult.cheapest, 
      pathfindingResult.creditMaximized,
      pathfindingResult.recommendations?.primary
    ].filter(Boolean);
    
    paths.forEach(path => {
      path?.nodeIds.forEach(nodeId => {
        counts[nodeId] = (counts[nodeId] || 0) + 1;
      });
    });
    
    return counts;
  }, [pathfindingResult]);

  useEffect(() => {
    setOverlapCounts(calculateOverlapCounts);
  }, [calculateOverlapCounts]);

  // Get current active path
  const activePath = useMemo(() => {
    if (!pathfindingResult) return null;
    switch (activePreset) {
      case 'fastest': return pathfindingResult.fastest;
      case 'cheapest': return pathfindingResult.cheapest;
      case 'creditMaximized': return pathfindingResult.creditMaximized;
      case 'balanced': return pathfindingResult.recommendations.primary;
      default: return pathfindingResult.fastest;
    }
  }, [pathfindingResult, activePreset]);


  // Quick telemetry (log once on mount)
  React.useEffect(() => {
    console.info('[life-path] nodes:', graph.nodes.length, 'edges:', graph.edges.length);
    console.info('[life-path] activePath length:', activePath?.nodeIds?.length || 0);
  }, [graph.nodes.length, graph.edges.length, activePath?.nodeIds?.length]);

  // ---- Active goal / discipline ----
  const activeGoalId = activePath?.nodeIds?.[activePath.nodeIds.length - 1] ?? null;
  const activeGoalNode = activeGoalId ? graph.nodes.find(n => n.id === activeGoalId) : undefined;

  const activeDiscipline =
    activeGoalNode?.tags?.find(t =>
      ['cs', 'computer-science', 'nursing', 'business'].includes(t.toLowerCase())
    ) ?? null;

  // Helper: shared trunk nodes should always stay
  const isShared = (n: GraphNode) =>
    n.type === 'skill' ||
    n.type === 'creditBlock' ||
    n.tags?.includes('shared') ||
    n.tags?.includes('gen-ed');

  // IMPORTANT: do not filter if we don't have a path yet
  const filteredNodes = React.useMemo(() => {
    if (!activePath?.nodeIds?.length) return graph.nodes;

    const nodes = graph.nodes.filter(n => {
      if (isShared(n)) return true;
      if (activePath.nodeIds.includes(n.id)) return true;
      if (!activeDiscipline) return true;
      return n.tags?.some(t => t.toLowerCase().includes(activeDiscipline.toLowerCase()));
    });

    // Safety: if filtering removed everything, show all nodes
    return nodes.length ? nodes : graph.nodes;
  }, [graph.nodes, activePath?.nodeIds, activeDiscipline]);

  // Safety net for pathfinding
  const isPathEmpty = !activePath?.nodeIds?.length;
  const safeActivePath = isPathEmpty
    ? { nodeIds: graph.nodes.filter(n => n.type !== 'job').slice(0, 3).map(n => n.id) }
    : activePath;

  const reactFlowNodes: Node[] = React.useMemo(() => {
    return filteredNodes.map((node, index) => {
      const inPath = !!safeActivePath?.nodeIds?.includes(node.id);
      const stepNumber = inPath ? safeActivePath!.nodeIds.indexOf(node.id) + 1 : undefined;

      // Pass `allowGhost=true` for now OR allow when inPath
      const allowGhost = true; // temporary failsafe to avoid over-ghosting
      const ghostInfo = determineNodeGhostStatus?.(node, undefined, allowGhost) ?? { isGhost: false };
      const isGhost = ghostInfo.isGhost && !inPath; // never ghost the main path
      const ghostReason = isGhost ? ghostInfo.reason : undefined;

      // Lane assignment
      let lane = 2; // Global/Orphan
      if (node.institutionId === 'fcc') lane = 0;
      else if (node.institutionId === 'fsu') lane = 1;

      const position = node.position || calculateNodePosition(
        index,
        node.attributes?.depth ?? 0,
        lane
      );

      return {
        id: node.id,
        type: 'lifePathNode',
        position,
        data: {
          node,
          isSelected: selectedNode?.id === node.id,
          isInPath: inPath,
          isMainPath: inPath,
          stepNumber,
          pathType: getNodePathType(node.id, pathfindingResult),
          showGhost: isGhost,
          ghostReason,
        },
        style: {
          opacity: inPath ? 1 : 0.65,
          zIndex: inPath ? 10 : 1,
        },
        hidden: false, // <- never hide (prevents vanishing)
      } as Node;
    });
  }, [filteredNodes, selectedNode?.id, pathfindingResult, safeActivePath?.nodeIds]);

  // Branch decision detection (Algebra vs CLEP vs Univ)
  type BranchOption = {
    id: string;
    title: string;
    type: string;
    time?: number;
    cost?: number;
    credits?: number;
    isRecommended?: boolean;
    preset?: string;
  };

  const branchPoints = useMemo(() => {
    if (!safeActivePath?.nodeIds?.length) return [];
    const points: { anchorNodeId: string; options: BranchOption[] }[] = [];

    // Simple heuristic: find nodes at depth 1 that share skill outcomes or equivalency
    const algebraLike = filteredNodes.filter(n =>
      n.type === "course" &&
      (n.title.toLowerCase().includes("algebra") || n.tags?.includes("math")) &&
      (n.attributes?.depth === 1)
    );

    if (algebraLike.length >= 2) {
      points.push({
        anchorNodeId: algebraLike[0].id,
        options: algebraLike.slice(0, 3).map(n => ({
          id: n.id,
          title: n.title,
          type: n.type,
          time: Math.ceil((n.estimatedHours || 120) / 40),
          cost: n.cost || 0,
          credits: n.credits || 0,
          isRecommended: safeActivePath.nodeIds.includes(n.id),
          preset: isPathEmpty ? "balanced" : "active",
        }))
      });
    }

    return points;
  }, [filteredNodes, safeActivePath, isPathEmpty]);

  // Convert graph edges to React Flow edges - filter to existing nodes only
  const visibleNodeIds = new Set(reactFlowNodes.map(n => n.id));
  const reactFlowEdges: Edge[] = React.useMemo(() => {
    return graph.edges
      .filter(e => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId))
      .map(edge => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'lifePathEdge',
        data: {
          edge,
          isHighlighted: false,
          pathType: undefined
        }
      }));
  }, [graph.edges, visibleNodeIds]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  React.useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const graphNode = graph.nodes.find(n => n.id === node.id);
    if (graphNode && onNodeClick) {
      onNodeClick(graphNode);
    }
  }, [graph.nodes, onNodeClick]);

  return (
    <div className="w-full space-y-4">
      {/* Controls Header */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Main Path Mode</h3>
          <Badge variant="outline">Phase 1</Badge>
        </div>
        
        {/* Preset Chips */}
        <div className="flex items-center gap-2">
          <Button
            variant={activePreset === 'fastest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePreset('fastest')}
          >
            <Zap className="w-4 h-4 mr-1" />
            Fastest
          </Button>
          <Button
            variant={activePreset === 'cheapest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePreset('cheapest')}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Cheapest
          </Button>
          <Button
            variant={activePreset === 'creditMaximized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePreset('creditMaximized')}
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Credit-Max
          </Button>
          <Button
            variant={activePreset === 'balanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePreset('balanced')}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Balanced
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGhosts(!showGhosts)}
          >
            {showGhosts ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showGhosts ? 'Hide' : 'Show'} Alternatives
          </Button>
        </div>
      </div>
      
        {/* Metrics Pill */}
      <div className="flex items-center gap-4">
        {safeActivePath && (
          <MetricsPill 
            metrics={{
              totalTime: activePath?.totalTime || 24,
              totalCost: activePath?.totalCost || 8000,
              totalCredits: activePath?.totalCredits || 60,
              creditLoss: activePath?.creditLoss || 0,
              institutionsCount: activePath?.metadata?.institutionsCount,
              prerequisitesSatisfied: activePath?.metadata?.prerequisitesSatisfied,
            }}
          />
        )}
        {process.env.NODE_ENV !== 'production' && (
          <Badge variant="outline" className="text-xs">
            Path: {safeActivePath?.nodeIds?.length || 0} • Nodes: {graph.nodes.length}
          </Badge>
        )}
      </div>

      {/* Graph Canvas with Institution Lanes */}
      <div className="relative w-full h-[600px] border rounded-lg overflow-hidden">
        {/* Educational Bands */}
        <EducationalBands height={600} />
        
        {/* Institution Lane Backgrounds */}
        <div className="absolute inset-0 z-0">
          {CALM_LANES.map((lane) => (
            <InstitutionLane
              key={lane.id}
              id={lane.id}
              title={lane.title}
              color={lane.color}
              x={lane.x}
              width={lane.width}
              height={600}
              isOrphan={lane.id === 'jobs'} // Make jobs lane the orphan lane
            />
          ))}
        </div>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
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
      
      {/* Enhanced Legend */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
        <div className="font-medium text-muted-foreground">Node Types:</div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" />
          <span>Skills</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-secondary bg-secondary/10" />
          <span>Courses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-accent bg-accent/10" />
          <span>Credentials</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-destructive bg-destructive/10" />
          <span>Jobs</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-orange-300 bg-orange-50" />
          <span>Exams</span>
        </div>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="font-medium text-muted-foreground">Edge Types:</div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-px bg-primary" />
          <span>Required</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-px bg-secondary border-dashed" style={{ borderTopStyle: 'dashed', borderTopWidth: '2px' }} />
          <span>Alternative</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-px bg-purple-500" />
          <span>Transfer</span>
        </div>

        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="font-medium text-muted-foreground">Institution Lanes:</div>
        <span className="text-xs">FCC • Global/Orphan • FSU • Credentials • Career Goals</span>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="font-medium text-muted-foreground">Educational Bands:</div>
        <span className="text-xs">Foundations → Lower Division → Upper Division → Credential → Career</span>
      </div>
    </div>
  );
}

// Helper functions
function getNodePathType(nodeId: string, result?: PathfindingResult | null): string | undefined {
  if (!result) return undefined;
  
  if (result.fastest?.nodeIds.includes(nodeId)) return 'fastest';
  if (result.cheapest?.nodeIds.includes(nodeId)) return 'cheapest';
  if (result.creditMaximized?.nodeIds.includes(nodeId)) return 'credit-max';
  
  return undefined;
}

function getEdgePathType(edgeId: string, result?: PathfindingResult | null): string | undefined {
  return undefined;
}