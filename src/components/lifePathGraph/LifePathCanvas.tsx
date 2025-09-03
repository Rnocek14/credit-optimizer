import React, { useMemo, useCallback, useState } from 'react';
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
  const [showGhosts, setShowGhosts] = useState(false);
  const [activePreset, setActivePreset] = useState<'fastest' | 'cheapest' | 'creditMaximized' | 'balanced'>('fastest');

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

  // Convert graph nodes to React Flow nodes
  const reactFlowNodes: Node[] = useMemo(() => {
    return graph.nodes.map((node, index) => {
      const isInMainPath = activePath?.nodeIds.includes(node.id) || false;
      const stepNumber = isInMainPath ? (activePath?.nodeIds.indexOf(node.id) ?? -1) + 1 : undefined;
      
      const position = node.position || calculateNodePosition(
        index, 
        node.attributes?.depth ?? 0,
        node.institutionId === 'fsu' ? 1 : 0
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
          showGhost: showGhosts
        },
        style: {
          opacity: isInMainPath ? 1 : showGhosts ? 0.6 : 0.4,
          zIndex: isInMainPath ? 10 : 1,
        }
      };
    });
  }, [graph.nodes, selectedNode, pathfindingResult, activePath, showGhosts]);

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

      {/* Graph Canvas */}
      <div className="w-full h-[600px] border rounded-lg overflow-hidden">
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
      
      {/* Legend */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
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