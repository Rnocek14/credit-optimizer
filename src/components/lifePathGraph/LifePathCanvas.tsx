import React, { useMemo, useCallback } from 'react';
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

export function LifePathCanvas({ 
  graph, 
  pathfindingResult, 
  onNodeClick, 
  selectedNode 
}: LifePathCanvasProps) {
  // Convert graph nodes to React Flow nodes
  const reactFlowNodes: Node[] = useMemo(() => {
    return graph.nodes.map((node, index) => ({
      id: node.id,
      type: 'lifePathNode',
      position: node.position || {
        x: (index % 4) * 300 + 100,
        y: Math.floor(index / 4) * 200 + 100
      },
      data: {
        node,
        isSelected: selectedNode?.id === node.id,
        isInPath: pathfindingResult?.fastest?.nodeIds.includes(node.id) || false,
        pathType: getNodePathType(node.id, pathfindingResult)
      }
    }));
  }, [graph.nodes, selectedNode, pathfindingResult]);

  // Convert graph edges to React Flow edges
  const reactFlowEdges: Edge[] = useMemo(() => {
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      type: 'lifePathEdge',
      data: {
        edge,
        isHighlighted: isEdgeInActivePath(edge.id, pathfindingResult),
        pathType: getEdgePathType(edge.id, pathfindingResult)
      },
      style: {
        stroke: getEdgeColor(edge.type),
        strokeWidth: isEdgeInActivePath(edge.id, pathfindingResult) ? 3 : 1,
        strokeDasharray: edge.type === 'ghost' ? '5,5' : undefined
      }
    }));
  }, [graph.edges, pathfindingResult]);

  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  // Update nodes when graph changes
  React.useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  // Update edges when graph changes
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
  if (!result) return undefined;
  
  // For Phase 0, we'll use a simple approach
  // In a full implementation, we'd track which edges belong to which paths
  return undefined;
}

function isEdgeInActivePath(edgeId: string, result?: PathfindingResult | null): boolean {
  // For Phase 0, highlight edges that connect nodes in the fastest path
  return false; // TODO: Implement edge highlighting logic
}

function getEdgeColor(edgeType: string): string {
  switch (edgeType) {
    case 'requires': return '#3b82f6'; // blue
    case 'enables': return '#10b981'; // green
    case 'substitutes': return '#f59e0b'; // amber
    case 'creditTransfersTo': return '#8b5cf6'; // purple
    case 'ghost': return '#ef4444'; // red
    case 'alternative': return '#6b7280'; // gray
    default: return '#6b7280';
  }
}