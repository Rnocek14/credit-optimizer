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

  // Active path sanity check
  const isPathEmpty = !activePath || !activePath.nodeIds?.length;
  if (isPathEmpty) {
    console.warn('[life-path] No path; rendering full graph in debug mode');
  }

  // Only show ghosts when path is empty to provide context
  React.useEffect(() => {
    setShowGhosts(isPathEmpty);
  }, [isPathEmpty]);

  // Quick telemetry (log once on mount)
  React.useEffect(() => {
    console.info('[life-path] nodes:', graph.nodes.length, 'edges:', graph.edges.length);
    console.info('[life-path] activePath length:', activePath?.nodeIds?.length || 0);
  }, [graph.nodes.length, graph.edges.length, activePath?.nodeIds?.length]);

  // Convert graph nodes to React Flow nodes
  const reactFlowNodes: Node[] = useMemo(() => {
    // Get active goal/discipline from pathfinding target
    const activeGoalNode = activePath?.nodeIds ? 
      graph.nodes.find(n => n.id === activePath.nodeIds[activePath.nodeIds.length - 1]) : null;
    const activeDiscipline = activeGoalNode?.tags?.find(tag => 
      ['cs', 'computer-science', 'nursing', 'business'].includes(tag.toLowerCase())
    );
    
    const filteredNodes = graph.nodes.filter(node => {
      // Always include shared trunk nodes (skills, gen-ed, creditBlocks with shared tag)
      if (node.type === 'skill' || 
          node.tags?.includes('gen-ed') || 
          node.tags?.includes('shared') ||
          (node.type === 'creditBlock' && node.tags?.includes('foundational'))) {
        return true;
      }
      
      // Include nodes in the active path
      if (activePath?.nodeIds.includes(node.id)) {
        return true;
      }
      
      // Single-discipline rule: only show nodes matching active discipline
      if (activeDiscipline) {
        return node.tags?.some(tag => tag.toLowerCase().includes(activeDiscipline.toLowerCase()));
      }
      
      // If no discipline identified, show all (fallback)
      return true;
    });

    return filteredNodes.map((node, index) => {
      const isInMainPath = isPathEmpty ? false : (activePath?.nodeIds.includes(node.id) || false);
      const stepNumber = isInMainPath ? (activePath?.nodeIds.indexOf(node.id) ?? -1) + 1 : undefined;
      const overlapCount = overlapCounts[node.id] || 1;
      
      // Ghost detection logic with specific reasons
      const isGhost = !showGhosts && !isInMainPath && node.type !== 'job';
      let ghostReason = '';
      if (isGhost) {
        // Specific ghost reason based on node type and context
        if (node.type === 'exam' && node.tags?.includes('clep')) {
          ghostReason = 'Exceeds exam cap (30cr)';
        } else if (node.type === 'course' && node.institutionId !== 'fcc') {
          ghostReason = 'Not cost-optimal';
        } else if (node.type === 'credential' && !node.tags?.includes(activeDiscipline || '')) {
          ghostReason = 'Different discipline';
        } else if (!activePath?.nodeIds.includes(node.id)) {
          ghostReason = 'Not in selected path';
        }
      }
      
      // Enhanced positioning with lane support
      let institutionLane = 0;
      if (node.institutionId === 'fsu') institutionLane = 1;
      else if (node.institutionId === 'fcc') institutionLane = 0;
      else if (!node.institutionId || node.institutionId === 'orphan') institutionLane = 2; // orphan lane
      
      const position = node.position || calculateNodePosition(
        index, 
        node.attributes?.depth ?? 0,
        institutionLane
      );

      return {
        id: node.id,
        type: 'lifePathNode',
        position,
        data: {
          node,
          isSelected: selectedNode?.id === node.id,
          isInPath: isInMainPath,
          isMainPath: isInMainPath,
          stepNumber,
          pathType: getNodePathType(node.id, pathfindingResult),
          showGhost: isGhost,
          ghostReason,
          overlapCount,
          overlapGoals: ['CS', 'Nursing'], // TODO: Make dynamic based on active goals
          transferUsed: 42, // TODO: Calculate from actual transfer data
          examUsed: 6,      // TODO: Calculate from actual exam data  
          residencyMet: 30  // TODO: Calculate from actual residency data
        },
        style: {
          opacity: isInMainPath ? 1 : 0.6,
          zIndex: isInMainPath ? 10 : 1,
        },
        hidden: false
      };
    });
  }, [graph.nodes, selectedNode, pathfindingResult, activePath, showGhosts, overlapCounts, isPathEmpty]);

  // Convert graph edges to React Flow edges
  const reactFlowEdges: Edge[] = useMemo(() => {
    return graph.edges.map((edge) => {
      const isInMainPath = activePath && isEdgeInMainPath(edge, activePath);
      const edgeStyle = styleEdge(edge.type, isInMainPath, edge.type === 'ghost');
      
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'lifePathEdge',
        data: {
          edge,
          isHighlighted: isInMainPath,
          pathType: getEdgePathType(edge.id, pathfindingResult),
          showTransferRate: edge.type === 'creditTransfersTo'
        },
        style: {
          stroke: edgeStyle.color,
          strokeWidth: edgeStyle.thickness,
          strokeDasharray: edgeStyle.dash?.join(','),
          opacity: edgeStyle.opacity,
          zIndex: isInMainPath ? 10 : 1,
        }
      };
    });
  }, [graph.edges, pathfindingResult, activePath]);
  
  function isEdgeInMainPath(edge: any, path: any): boolean {
    if (!path?.nodeIds) return false;
    const sourceIndex = path.nodeIds.indexOf(edge.sourceId);
    const targetIndex = path.nodeIds.indexOf(edge.targetId);
    return sourceIndex !== -1 && targetIndex !== -1 && Math.abs(targetIndex - sourceIndex) === 1;
  }

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
        {activePath && (
          <MetricsPill 
            metrics={{
              totalTime: activePath.totalTime,
              totalCost: activePath.totalCost,
              totalCredits: activePath.totalCredits,
              creditLoss: activePath.creditLoss,
              institutionsCount: activePath.metadata?.institutionsCount,
              prerequisitesSatisfied: activePath.metadata?.prerequisitesSatisfied,
            }}
          />
        )}
        {process.env.NODE_ENV !== 'production' && (
          <Badge variant="outline" className="text-xs">
            Path: {activePath?.nodeIds?.length || 0} • Nodes: {graph.nodes.length}
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