import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from '@/components/nodes/UnifiedNodeTypes';
import type { GraphNode, GraphEdge } from '@/lib/careerGraph';
import { GraphLayoutEngine, type LayoutConfig } from '@/lib/graphLayout';

interface UnifiedCareerCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  showPivotPaths?: boolean;
  focusMode?: boolean;
  searchTerm?: string;
  selectedCareerPath?: string | null;
  layoutAlgorithm?: 'hierarchical' | 'force' | 'circular' | 'tree' | 'focus';
  layoutConfig?: Partial<LayoutConfig>;
}

// Calculate layout using GraphLayoutEngine
const calculateLayout = (
  graphNodes: GraphNode[], 
  graphEdges: GraphEdge[], 
  algorithm: 'hierarchical' | 'force' | 'circular' | 'tree' | 'focus' = 'hierarchical',
  config?: Partial<LayoutConfig>
): Node[] => {
  if (graphNodes.length === 0) return [];

  const layoutEngine = new GraphLayoutEngine(graphNodes, graphEdges, {
    algorithm,
    ...config
  });

  const layoutResult = layoutEngine.calculateLayout();
  
  console.log('🎯 Layout calculation complete:', {
    algorithm,
    nodeCount: layoutResult.nodes.length,
    bounds: layoutResult.bounds
  });

  return layoutResult.nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      style: {
        borderColor: getNodeBorderColor(node.type || 'default'),
        backgroundColor: getNodeBackgroundColor(node.type || 'default')
      }
    }
  }));
};

// Convert GraphEdge to React Flow Edge
const convertToFlowEdge = (graphEdge: GraphEdge): Edge => {
  // Use composite node IDs to match the layout engine format
  const sourceId = `${graphEdge.from_type}:${graphEdge.from_id}`;
  const targetId = `${graphEdge.to_type}:${graphEdge.to_id}`;
  
  return {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'default',
    animated: graphEdge.edge_type === 'unlocks' || graphEdge.edge_type === 'leads_to',
    style: {
      stroke: getEdgeColor(graphEdge.edge_type),
      strokeWidth: getEdgeWidth(graphEdge.importance_weight || 1)
    },
    data: {
      label: graphEdge.edge_type,
      reasoning: graphEdge.reasoning
    }
  };
};

// Helper functions for styling
const getNodeBorderColor = (nodeType: string): string => {
  const colors = {
    skill: 'hsl(var(--primary))',
    job: 'hsl(var(--secondary))',
    course: 'hsl(var(--accent))',
    project: 'hsl(var(--muted))',
    certification: 'hsl(var(--warning))',
    step: 'hsl(var(--info))'
  };
  return colors[nodeType as keyof typeof colors] || 'hsl(var(--border))';
};

const getNodeBackgroundColor = (nodeType: string): string => {
  const colors = {
    skill: 'hsl(var(--primary-foreground))',
    job: 'hsl(var(--secondary-foreground))',
    course: 'hsl(var(--accent-foreground))',
    project: 'hsl(var(--muted-foreground))',
    certification: 'hsl(var(--warning-foreground))',
    step: 'hsl(var(--info-foreground))'
  };
  return colors[nodeType as keyof typeof colors] || 'hsl(var(--background))';
};

const getEdgeColor = (edgeType: string): string => {
  const colors = {
    requires: 'hsl(var(--muted-foreground))',
    unlocks: 'hsl(var(--primary))',
    teaches: 'hsl(var(--accent))',
    demonstrates: 'hsl(var(--info))',
    validates: 'hsl(var(--success))',
    next_role: 'hsl(var(--primary))',
    pivot: 'hsl(var(--warning))',
    prerequisite: 'hsl(var(--destructive))',
    substitution: 'hsl(var(--secondary))',
    leads_to: 'hsl(var(--primary))',
    strengthens: 'hsl(var(--accent))'
  };
  return colors[edgeType as keyof typeof colors] || 'hsl(var(--border))';
};

const getEdgeWidth = (importance: number): number => {
  return Math.max(1, Math.min(4, importance * 2));
};

export const UnifiedCareerCanvas: React.FC<UnifiedCareerCanvasProps> = ({
  nodes: graphNodes,
  edges: graphEdges,
  onNodeClick,
  showPivotPaths = false,
  focusMode = false,
  searchTerm = '',
  selectedCareerPath,
  layoutAlgorithm = 'hierarchical',
  layoutConfig
}) => {
  // Calculate layout using GraphLayoutEngine
  const flowNodes = useMemo(() => {
    return calculateLayout(graphNodes, graphEdges, layoutAlgorithm, layoutConfig);
  }, [graphNodes, graphEdges, layoutAlgorithm, layoutConfig]);

  const flowEdges = useMemo(() => {
    let edges = graphEdges.map(convertToFlowEdge);
    
    // Filter edges based on showPivotPaths - simplified
    return edges;
  }, [graphEdges, showPivotPaths]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes when graphNodes change
  React.useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  // Update edges when graphEdges change
  React.useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Extract node ID from the composite ID format "type:id"
    const [nodeType, nodeId] = node.id.split(':');
    const graphNode = graphNodes.find(gn => gn.id === nodeId && gn.type === nodeType);
    if (graphNode && onNodeClick) {
      onNodeClick(graphNode);
    }
  }, [graphNodes, onNodeClick]);

  // Filter and highlight based on search
  const processedNodes = useMemo(() => {
    return nodes.map(node => {
      const nodeTitle = typeof node.data?.title === 'string' ? node.data.title : '';
      const nodeDescription = typeof node.data?.description === 'string' ? node.data.description : '';
      
      const isHighlighted = searchTerm && 
        (nodeTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
         nodeDescription.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return {
        ...node,
        style: {
          ...node.style,
          opacity: searchTerm && !isHighlighted ? 0.3 : 1,
          transform: isHighlighted ? 'scale(1.05)' : 'scale(1)'
        }
      };
    });
  }, [nodes, searchTerm]);

  console.log('🎨 UnifiedCareerCanvas render:', {
    graphNodesCount: graphNodes.length,
    flowNodesCount: nodes.length,
    edgesCount: edges.length,
    layoutAlgorithm,
    showPivotPaths,
    focusMode,
    searchTerm
  });

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        className="unified-career-canvas"
      >
        <Background />
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const nodeType = node.type || 'default';
            return getNodeBorderColor(nodeType);
          }}
        />
      </ReactFlow>
      
      {/* Overlay with graph stats */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm border rounded-lg p-3 text-sm">
        <div className="font-medium mb-2">Career Graph Overview</div>
        <div className="space-y-1 text-xs">
          <div>Total Nodes: {graphNodes.length}</div>
          <div>Skills: {graphNodes.filter(n => n.type === 'skill').length}</div>
          <div>Jobs: {graphNodes.filter(n => n.type === 'job').length}</div>
          <div>Connections: {graphEdges.length}</div>
          {showPivotPaths && (
            <div className="text-warning">Pivot Paths: Enabled</div>
          )}
        </div>
      </div>
    </div>
  );
};