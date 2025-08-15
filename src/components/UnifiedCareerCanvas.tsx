import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from '@/components/nodes/UnifiedNodeTypes';
import { EnhancedNodeTooltip } from '@/components/EnhancedNodeTooltip';
import type { GraphNode, GraphEdge } from '@/lib/careerGraph';
import { GraphLayoutEngine, type LayoutConfig } from '@/lib/graphLayout';
import { calculateEnhancedSkillTreeLayout, type LayoutNode, type LayoutEdge } from '@/lib/enhancedSkillTreeLayout';

// Extended edge interface to handle the transformed edges
interface ExtendedGraphEdge extends GraphEdge {
  source?: string;
  target?: string;
  type?: string;
}

interface UnifiedCareerCanvasProps {
  nodes: GraphNode[];
  edges: ExtendedGraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  showPivotPaths?: boolean;
  focusMode?: boolean;
  searchTerm?: string;
  selectedCareerPath?: string | null;
  layoutAlgorithm?: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure';
  layoutConfig?: Partial<LayoutConfig>;
}

// Enhanced layout calculation using the new enhanced layout system
const calculateLayout = (
  graphNodes: GraphNode[], 
  graphEdges: ExtendedGraphEdge[], 
  algorithm: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure' = 'semantic-hierarchy',
  config?: Partial<LayoutConfig>,
  searchTerm?: string,
  selectedCareerPath?: string | null,
  showGoalPathOnly: boolean = false
): Node[] => {
  // Validate inputs & avoid early empty returns
  const safeNodes = Array.isArray(graphNodes)
    ? graphNodes.filter(n => n?.id && n?.type && n?.title)
    : [];

  const safeEdges = Array.isArray(graphEdges)
    ? graphEdges.filter(e => e?.source && e?.target)
    : [];

  if (safeNodes.length === 0) {
    console.warn('🪵 Canvas received 0 valid nodes. Check upstream loader.', {
      originalNodes: graphNodes?.length || 0,
      filteredNodes: safeNodes.length,
      sample: graphNodes?.slice(0, 3)
    });
    return [];
  }

  console.log('🎨 Starting enhanced layout calculation for', safeNodes.length, 'validated nodes');

  try {
    // Convert validated GraphNodes to LayoutNodes
    const layoutNodes: LayoutNode[] = safeNodes.map(node => ({
      id: node.id,
      type: node.type,
      title: node.title,
      category: extractCategoryFromNode(node) || 'Uncategorized',
      level: extractLevelFromNode(node),
      data: node.data
    }));

    // Convert validated GraphEdges to LayoutEdges - fix mapping
    const layoutEdges: LayoutEdge[] = safeEdges.map(edge => ({
      source: edge.source || edge.from_id,
      target: edge.target || edge.to_id,
      type: mapEdgeType(edge.edge_type || edge.type)
    }));

    // Calculate dynamic container size based on node count
    const nodeCount = layoutNodes.length;
    const estimatedWidth = Math.max(1600, Math.ceil(Math.sqrt(nodeCount)) * 250);
    const estimatedHeight = Math.max(1200, Math.ceil(nodeCount / Math.ceil(Math.sqrt(nodeCount))) * 200);

    // Use the algorithm directly since it's already mapped correctly
    const enhancedAlgorithm = algorithm;

    // Use enhanced layout algorithm with collision detection
    const positionedNodes = calculateEnhancedSkillTreeLayout(layoutNodes, layoutEdges, {
      algorithm: enhancedAlgorithm,
      containerWidth: estimatedWidth,
      containerHeight: estimatedHeight,
      nodeSpacing: {
        horizontal: 220, // Increased spacing to prevent overlaps
        vertical: 160,   // Increased vertical spacing
        category: 100    // Increased category spacing
      },
      layerHeight: 250, // Increased layer height
      focusNodeId: searchTerm ? layoutNodes.find(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase())
      )?.id : undefined,
      showOnlyGoalPath: showGoalPathOnly || !!selectedCareerPath,
      goalPath: selectedCareerPath ? layoutNodes
        .filter(n => n.type === 'job' || n.type === 'step')
        .map(n => n.id) : undefined
    });

    console.log('✅ Enhanced layout completed for', positionedNodes.length, 'positioned nodes');

    // Convert to React Flow Node format
    return positionedNodes.map(posNode => {
      const originalNode = safeNodes.find(n => n.id === posNode.id);
      if (!originalNode) {
        console.warn(`Original node not found for ${posNode.id}`);
        return {
          id: `${posNode.type}:${posNode.id}`,
          position: { x: posNode.x, y: posNode.y },
          data: { 
            title: posNode.title,
            type: posNode.type,
            category: posNode.clusterGroup
          },
          type: 'default'
        };
      }

      // Check for special node types for enhanced styling
      const isCheckpoint = originalNode.data && (originalNode.data as any).isCheckpoint;
      const isBranchPoint = originalNode.data && (originalNode.data as any).isBranchPoint;
      const pathType = originalNode.data && (originalNode.data as any).pathType;
      
      return {
        id: originalNode.id, // Use simple node ID instead of composite
        position: { x: posNode.x, y: posNode.y },
        data: {
          title: originalNode.title,
          description: originalNode.description,
          type: originalNode.type,
          category: posNode.clusterGroup,
          node: originalNode,
          isCheckpoint,
          isBranchPoint,
          pathType,
          estimatedTime: originalNode.estimated_time_hours,
          style: {
            borderColor: getNodeBorderColor(originalNode.type, isCheckpoint, isBranchPoint),
            backgroundColor: getNodeBackgroundColor(originalNode.type, pathType)
          }
        },
        type: originalNode.type, // Use actual node type for proper rendering
        style: {
          background: getNodeBackgroundColor(originalNode.type, pathType),
          border: `${isCheckpoint ? '4px' : isBranchPoint ? '3px' : '2px'} solid ${getNodeBorderColor(originalNode.type, isCheckpoint, isBranchPoint)}`,
          borderRadius: isCheckpoint ? '16px' : isBranchPoint ? '20px' : '12px',
          padding: '12px',
          fontSize: '11px',
          width: 180,
          height: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: isCheckpoint 
            ? '0 4px 20px rgba(37, 99, 235, 0.3)' 
            : isBranchPoint 
            ? '0 3px 15px rgba(124, 58, 237, 0.25)'
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease-in-out',
          ...(isCheckpoint && {
            background: `linear-gradient(135deg, ${getNodeBackgroundColor(originalNode.type, pathType)}, #f8fafc)`,
          }),
          ...(isBranchPoint && {
            background: `linear-gradient(135deg, ${getNodeBackgroundColor(originalNode.type, pathType)}, #faf5ff)`,
          })
        }
      };
    });

  } catch (error) {
    console.error('❌ Error in enhanced layout calculation:', error, {
      safeNodesCount: safeNodes.length,
      safeEdgesCount: safeEdges.length,
      algorithm
    });
    // Fallback to basic positioning with validated nodes
    return safeNodes.map((node, index) => ({
      id: node.id,
      position: { x: (index % 5) * 200 + 50, y: Math.floor(index / 5) * 150 + 50 },
      data: {
        title: node.title,
        type: node.type,
        node: node
      },
      type: 'default'
    }));
  }
};

// Helper function to extract category from node data
const extractCategoryFromNode = (node: GraphNode): string | undefined => {
  // Safely check for category in different node types
  if (node.data && 'category' in node.data) {
    return (node.data as any).category;
  }
  
  // Try to extract from title or description
  const text = (node.title + ' ' + (node.description || '')).toLowerCase();
  
  if (text.includes('javascript') || text.includes('react') || text.includes('programming')) {
    return 'Programming';
  } else if (text.includes('design') || text.includes('ui') || text.includes('ux')) {
    return 'Design';
  } else if (text.includes('backend') || text.includes('api') || text.includes('database')) {
    return 'Backend';
  } else if (text.includes('cloud') || text.includes('aws') || text.includes('devops')) {
    return 'Cloud';
  }
  
  return undefined;
};

// Helper function to extract level from node data
const extractLevelFromNode = (node: GraphNode): number | undefined => {
  // Safely check for level in different node types
  if (node.data && 'level' in node.data) {
    return (node.data as any).level;
  }
  
  if (node.data && 'difficulty_level' in node.data) {
    return (node.data as any).difficulty_level;
  }
  
  return undefined;
};

// Helper function to map edge types
const mapEdgeType = (edgeType: string): 'teaches' | 'requires' | 'qualifies_for' | 'supports' | 'prerequisite' => {
  const mapping: Record<string, any> = {
    'teaches': 'teaches',
    'requires': 'requires', 
    'qualifies_for': 'qualifies_for',
    'supports': 'supports',
    'prerequisite': 'prerequisite',
    'unlocks': 'teaches',
    'leads_to': 'supports',
    'demonstrates': 'supports',
    'validates': 'qualifies_for'
  };
  
  return mapping[edgeType] || 'supports';
};

// Convert GraphEdge to React Flow Edge with enhanced styling
const convertToFlowEdge = (graphEdge: ExtendedGraphEdge): Edge => {
  // Use source/target if available, fallback to from_id/to_id
  const sourceId = graphEdge.source || graphEdge.from_id;
  const targetId = graphEdge.target || graphEdge.to_id;
  const edgeType = graphEdge.edge_type || graphEdge.type || 'connection';
  
  const isTeachingEdge = edgeType === 'teaches' || edgeType === 'unlocks';
  const isRequirementEdge = edgeType === 'requires' || edgeType === 'prerequisite';
  
  return {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: isTeachingEdge ? 'smoothstep' : 'default',
    animated: edgeType === 'unlocks' || edgeType === 'leads_to' || edgeType === 'teaches',
    style: {
      stroke: getEdgeColor(edgeType),
      strokeWidth: getEdgeWidth(graphEdge.importance_weight || 1),
      opacity: 0.8
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: getEdgeColor(edgeType),
      width: 20,
      height: 20
    },
    label: edgeType.replace('_', ' '),
    labelStyle: {
      fontSize: '9px',
      fontWeight: '500',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '2px 6px',
      borderRadius: '4px'
    },
    data: {
      edgeType: edgeType,
      reasoning: graphEdge.reasoning,
      importance: graphEdge.importance_weight
    }
  };
};

// Enhanced helper functions for styling with checkpoint and branch support
const getNodeBorderColor = (nodeType: string, isCheckpoint?: boolean, isBranchPoint?: boolean): string => {
  if (isCheckpoint) return '#2563eb'; // Primary blue
  if (isBranchPoint) return '#7c3aed'; // Purple accent
  
  const colors = {
    skill: '#2563eb',     // Blue
    job: '#059669',       // Green
    course: '#7c3aed',    // Purple
    project: '#ea580c',   // Orange
    certification: '#dc2626', // Red
    step: '#0891b2'       // Cyan
  };
  return colors[nodeType as keyof typeof colors] || '#6b7280';
};

const getNodeBackgroundColor = (nodeType: string, pathType?: string): string => {
  // Path type colors for differentiation
  if (pathType) {
    const pathColors = {
      fastest: '#fef3c7',      // Light yellow
      cheapest: '#d1fae5',     // Light green
      highest_roi: '#dbeafe',  // Light blue
      balanced: '#e5e7eb'      // Light gray
    };
    const pathColor = pathColors[pathType as keyof typeof pathColors];
    if (pathColor) return pathColor;
  }
  
  const colors = {
    skill: '#eff6ff',       // Very light blue
    job: '#ecfdf5',         // Very light green
    course: '#f3e8ff',      // Very light purple
    project: '#fff7ed',     // Very light orange
    certification: '#fef2f2', // Very light red
    step: '#ecfeff'         // Very light cyan
  };
  return colors[nodeType as keyof typeof colors] || '#ffffff';
};

const getEdgeColor = (edgeType: string): string => {
  const colors = {
    requires: '#6b7280',        // Gray
    unlocks: '#2563eb',         // Blue
    teaches: '#7c3aed',         // Purple
    demonstrates: '#0891b2',    // Cyan
    validates: '#059669',       // Green
    next_role: '#2563eb',       // Blue
    pivot: '#ea580c',           // Orange
    prerequisite: '#dc2626',    // Red
    substitution: '#4b5563',    // Dark gray
    leads_to: '#2563eb',        // Blue
    strengthens: '#7c3aed',     // Purple
    learning_progression: '#2563eb', // Blue
    branch_option: '#7c3aed'    // Purple
  };
  return colors[edgeType as keyof typeof colors] || '#6b7280';
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
  layoutAlgorithm = 'semantic-hierarchy',
  layoutConfig
}) => {
  const [tooltipNode, setTooltipNode] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  // PR-6: Memoized layout with graphHash for performance
  const flowNodes = useMemo(() => {
    console.log('🎨 Recalculating layout with enhanced system...');
    const startTime = performance.now();
    
    const result = calculateLayout(graphNodes, graphEdges, layoutAlgorithm, layoutConfig, searchTerm, selectedCareerPath, focusMode);
    
    const endTime = performance.now();
    console.log(`⚡ Layout calculation completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return result;
  }, [graphNodes, graphEdges, layoutAlgorithm, layoutConfig, searchTerm, selectedCareerPath, focusMode]);

  const flowEdges = useMemo(() => {
    let edges = graphEdges.map(convertToFlowEdge);
    
    // Filter edges based on showPivotPaths - simplified
    return edges;
  }, [graphEdges, showPivotPaths]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // PR-6: Stable update with fitView only when layout changes
  const [layoutComplete, setLayoutComplete] = React.useState(false);
  
  React.useLayoutEffect(() => {
    setNodes(flowNodes);
    setLayoutComplete(true);
  }, [flowNodes, setNodes]);

  React.useLayoutEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Use simple node ID to find the graph node
    const graphNode = graphNodes.find(gn => gn.id === node.id);
    if (graphNode && onNodeClick) {
      onNodeClick(graphNode);
    }
  }, [graphNodes, onNodeClick]);

  const handleNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    const graphNode = graphNodes.find(gn => gn.id === node.id);
    if (graphNode) {
      setTooltipNode({
        node: graphNode,
        x: event.clientX,
        y: event.clientY
      });
    }
  }, [graphNodes]);

  const handleNodeMouseLeave = useCallback(() => {
    setTooltipNode(null);
  }, []);

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
    <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
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
      
      {/* Enhanced tooltip */}
      {tooltipNode && (
        <EnhancedNodeTooltip
          node={tooltipNode.node}
          x={tooltipNode.x}
          y={tooltipNode.y}
          visible={!!tooltipNode}
        />
      )}
      
      {/* Enhanced overlay with detailed graph stats */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-4 text-sm shadow-lg">
        <div className="font-semibold mb-3 text-primary">Enhanced Career Graph</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Skills: <span className="font-medium">{graphNodes.filter(n => n.type === 'skill').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Jobs: <span className="font-medium">{graphNodes.filter(n => n.type === 'job').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Courses: <span className="font-medium">{graphNodes.filter(n => n.type === 'course').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Projects: <span className="font-medium">{graphNodes.filter(n => n.type === 'project').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Certs: <span className="font-medium">{graphNodes.filter(n => n.type === 'certification').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            Steps: <span className="font-medium">{graphNodes.filter(n => n.type === 'step').length}</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
          <div>Total: <span className="font-medium">{graphNodes.length} nodes</span></div>
          <div>Connections: <span className="font-medium">{graphEdges.length}</span></div>
          <div>Layout: <span className="font-medium">{layoutAlgorithm}</span></div>
        </div>
        {searchTerm && (
          <div className="mt-2 pt-2 border-t text-xs">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Search: "{searchTerm}"
            </div>
          </div>
        )}
        {showPivotPaths && (
          <div className="mt-1 text-xs text-orange-600 font-medium">
            🔄 Pivot Analysis Active
          </div>
        )}
      </div>
    </div>
  );
};