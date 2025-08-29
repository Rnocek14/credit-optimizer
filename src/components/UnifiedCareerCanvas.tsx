import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  ConnectionMode,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from '@/components/nodes/UnifiedNodeTypes';
import { EnhancedNodeTooltip } from '@/components/EnhancedNodeTooltip';
import type { GraphNode, GraphEdge, NodeType } from '@/lib/careerGraph';
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

// 🔧 STEP 4: Bulletproof grid fallback function (unified implementation)
function gridFallback(nodes: GraphNode[] | { id: string; title: string; type: string; data?: any }[]): Node[] {
  const COLS = 6, X0 = 60, Y0 = 60, DX = 220, DY = 160;
  console.log('📐 Using grid fallback for nodes:', nodes.length);
  
  return nodes.map((n, i) => ({
    id: n.id,
    type: "default",
    position: { x: X0 + (i % COLS) * DX, y: Y0 + Math.floor(i / COLS) * DY },
    data: {
      label: n.title,
      title: n.title,
      type: n.type,
      node: n,
      "data-testid": "skill-node",
      "data-node-id": n.id,
      "data-node-type": n.type,
    },
  }));
}

// Enhanced layout calculation with safe fallback system
const calculateLayout = (
  graphNodes: GraphNode[], 
  graphEdges: ExtendedGraphEdge[], 
  algorithm: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure' = 'semantic-hierarchy',
  config?: Partial<LayoutConfig>,
  searchTerm?: string,
  selectedCareerPath?: string | null,
  showGoalPathOnly: boolean = false
): Node[] => {
  console.time('layout');
  
  // 🧪 STEP 3: Enhanced input sanitization - already done in useMemo
  const safeNodes = Array.isArray(graphNodes)
    ? graphNodes
        .map(n => ({
          ...n,
          id: String(n.id), // Force string IDs
          type: (n.type && ['job', 'skill', 'step', 'course', 'project', 'certification'].includes(n.type)) ? n.type : 'skill' as NodeType,
          title: n.title || 'Untitled',
        }))
        .filter(n => n.id && n.type && n.title)
    : [];
    
  console.log('🔍 SafeNodes filter:', { 
    inputNodes: graphNodes?.length || 0, 
    outputNodes: safeNodes.length,
    sampleInput: graphNodes?.[0],
    sampleOutput: safeNodes[0]
  });

  // Simplified edge processing
  const safeEdges = Array.isArray(graphEdges) ? graphEdges
    .map(e => ({
      ...e,
      source: String(e.source || e.from_id || ''),
      target: String(e.target || e.to_id || ''),
    }))
    .filter(e => e.source && e.target) : [];

  // Prune edges to only include nodes that exist
  const nodeIdSet = new Set(safeNodes.map(n => n.id));
  const prunedEdges = safeEdges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

  console.log('🔗 Edge processing:', {
    totalEdges: graphEdges?.length || 0,
    safeEdges: safeEdges.length,
    prunedEdges: prunedEdges.length
  });

  if (safeNodes.length === 0) {
    console.warn('🪵 No valid nodes to render');
    return [];
  }

  // 🔧 Phase 1: Simplified layout with error boundary
  try {
    // Check for force grid mode
    const FORCE_GRID = typeof window !== 'undefined' && 
      localStorage.getItem('ST_FORCE_GRID') === '1';
    
    if (FORCE_GRID) {
      console.log('📐 Force grid mode enabled');
      return gridFallback(safeNodes);
    }

    // Try enhanced layout
    const layoutNodes: LayoutNode[] = safeNodes.map(node => ({
      id: node.id,
      type: node.type,
      title: node.title,
      category: extractCategoryFromNode(node) || 'General',
      level: extractLevelFromNode(node),
      data: node.data
    }));

    const layoutEdges: LayoutEdge[] = prunedEdges.map(edge => ({
      source: edge.source!,
      target: edge.target!,
      type: mapEdgeType(edge.edge_type || edge.type)
    }));

    // Calculate container size
    const nodeCount = layoutNodes.length;
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const estimatedWidth = Math.max(1200, cols * 250);
    const estimatedHeight = Math.max(800, Math.ceil(nodeCount / cols) * 200);

    console.log('🎨 Attempting enhanced layout...', {
      nodes: layoutNodes.length,
      edges: layoutEdges.length,
      containerSize: `${estimatedWidth}x${estimatedHeight}`
    });

    const result = calculateEnhancedSkillTreeLayout(layoutNodes, layoutEdges, {
      algorithm,
      containerWidth: estimatedWidth,
      containerHeight: estimatedHeight,
      nodeSpacing: { horizontal: 220, vertical: 160, category: 100 },
      layerHeight: 200,
      focusNodeId: searchTerm ? layoutNodes.find(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase())
      )?.id : undefined,
      showOnlyGoalPath: showGoalPathOnly || !!selectedCareerPath
    });

    // Validate result
    if (!result || !Array.isArray(result) || result.length === 0) {
      console.warn('📐 Enhanced layout returned empty, using grid fallback');
      return gridFallback(safeNodes);
    }

    console.log('✅ Enhanced layout successful:', result.length, 'positioned nodes');

    // Convert to React Flow nodes
    return result.map(posNode => {
      const originalNode = safeNodes.find(n => n.id === posNode.id);
      if (!originalNode) {
        console.warn(`Original node not found for ${posNode.id}`);
        return {
          id: `${posNode.type}:${posNode.id}`,
          position: { x: posNode.x, y: posNode.y },
          data: { 
            title: posNode.title,
            type: posNode.type,
            category: posNode.clusterGroup,
            'data-testid': 'skill-node',
            'data-node-type': posNode.type,
            'data-node-id': posNode.id
          },
          type: 'default'
        };
      }

      // Check for special node types for enhanced styling
      const isCheckpoint = originalNode.data && (originalNode.data as any).isCheckpoint;
      const isBranchPoint = originalNode.data && (originalNode.data as any).isBranchPoint;
      const pathType = originalNode.data && (originalNode.data as any).pathType;
      
      return {
        id: originalNode.id,
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
          'data-testid': 'skill-node',
          'data-node-type': originalNode.type,
          'data-node-id': originalNode.id,
          style: {
            borderColor: getNodeBorderColor(originalNode.type, isCheckpoint, isBranchPoint),
            backgroundColor: getNodeBackgroundColor(originalNode.type, pathType)
          }
        },
        type: originalNode.type,
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
    console.warn('🪜 Using grid fallback layout', { inputNodes: safeNodes.length });
    console.timeEnd('layout');
    return gridFallback(safeNodes);
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
  const reactFlowInstance = useReactFlow();
  
  // PR-6: Stabilized layout with error boundaries and simplified calculation
  const flowNodes = useMemo(() => {
    console.log('🎨 Starting layout calculation...', { nodeCount: graphNodes?.length });
    
    // ✅ FORCE TEST MODE - shows single test node if ST_FORCE_TEST=1
    const FORCE_TEST = typeof window !== 'undefined' && localStorage.getItem('ST_FORCE_TEST') === '1';
    if (FORCE_TEST) {
      const forceNodes = [{ 
        id: 'test-node', 
        type: 'default',
        position: { x: 200, y: 200 }, 
        data: { 
          title: '🧪 Debug Test Node',
          label: '🧪 Debug Test Node',
          'data-testid': 'skill-node',
          'data-node-type': 'default',
          'data-node-id': 'test-node'
        },
        style: {
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '10px',
          width: 140,
          height: 60
        }
      }];
      console.log('🧪 FORCE_TEST enabled - rendering test node');
      return forceNodes;
    }

    // Early return for empty data
    if (!Array.isArray(graphNodes) || graphNodes.length === 0) {
      console.log('📝 No nodes to render');
      return [];
    }
    
    // 🧪 STEP 3A: Robust Input Sanitization
    const safeNodes = graphNodes
      .map(n => ({
        ...n,
        id: String(n.id),
        type: (n.type && ['job', 'skill', 'step', 'course', 'project', 'certification'].includes(n.type)) ? n.type : 'skill' as NodeType,
        title: n.title || (n as any)?.data?.title || 'Untitled',
      }))
      .filter(n => n.id && n.type && n.title);
    
    console.log('🧪 Input validation:', {
      inputNodes: graphNodes.length,
      safeNodes: safeNodes.length,
      sampleNode: safeNodes[0]
    });

    // Early return for empty data after filtering
    if (safeNodes.length === 0) {
      console.warn('🪵 No valid nodes after filtering');
      return [];
    }

    // 🔧 Phase 1 Fix: Force grid layout for stability
    const FORCE_GRID = typeof window !== 'undefined' && 
      (localStorage.getItem('ST_FORCE_GRID') === '1' || 
       localStorage.getItem('ST_STABILITY_MODE') === '1');
    
    if (FORCE_GRID) {
      console.log('📐 Stability mode: using grid layout');
      return gridFallback(safeNodes);
    }

    // Try enhanced layout with fallback
    try {
      const result = calculateLayout(
        safeNodes,
        graphEdges || [],
        layoutAlgorithm,
        layoutConfig,
        searchTerm,
        selectedCareerPath,
        focusMode
      );
      
      // Validate result
      if (!Array.isArray(result) || result.length === 0) {
        console.warn('📐 Layout returned empty, using grid fallback');
        return gridFallback(safeNodes);
      }
      
      console.log('✅ Enhanced layout successful:', result.length, 'nodes');
      return result;
    } catch (error) {
      console.error('❌ Enhanced layout failed, using grid fallback:', error);
      return gridFallback(safeNodes);
    }
  }, [
    graphNodes, 
    graphEdges, 
    layoutAlgorithm, 
    layoutConfig, 
    searchTerm, 
    selectedCareerPath, 
    focusMode
  ]);

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

  // Auto-fit view when nodes are loaded
  React.useEffect(() => {
    if (processedNodes?.length > 0 && reactFlowInstance) {
      requestAnimationFrame(() => {
        try {
          reactFlowInstance.fitView({ padding: 0.1, includeHiddenNodes: false, duration: 400 });
          console.log('🎯 Auto-fitted view for', processedNodes.length, 'nodes');
        } catch (error) {
          console.warn('Auto-fit failed:', error);
        }
      });
    }
  }, [processedNodes?.length, reactFlowInstance]);

  console.log('🎨 UnifiedCareerCanvas render:', {
    graphNodesCount: graphNodes.length,
    flowNodesCount: nodes.length,
    edgesCount: edges.length,
    layoutAlgorithm,
    showPivotPaths,
    focusMode,
    finalRFNodes: processedNodes.length,
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