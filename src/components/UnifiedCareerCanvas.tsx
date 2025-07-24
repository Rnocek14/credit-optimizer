import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  MarkerType,
  ConnectionMode,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import stable layout functionality and types
import { calculateHierarchicalLayout } from '@/lib/smartLayout';
import { UnifiedCareerData, CareerRelationship } from '@/lib/unifiedCareerData';
import { FocusMode } from '@/components/FocusMode';

// Import all node types
import { JobNode } from './SkillTree/JobNode';
import { CourseNode } from './SkillTree/CourseNode';
import { ProjectNode } from './SkillTree/ProjectNode';
import { CertificationNode } from './SkillTree/CertificationNode';
import { SkillTreeSkillNode } from './SkillTreeSkillNode';
import { SkillTreeStepNode } from './SkillTreeStepNode';

// Define unified node types
const nodeTypes = {
  skill: SkillTreeSkillNode,
  job: JobNode,
  course: CourseNode,
  project: ProjectNode,
  certification: CertificationNode,
  careerStep: SkillTreeStepNode,
};

interface UnifiedCareerCanvasProps {
  data: UnifiedCareerData;
  relationships: CareerRelationship[];
  selectedCareerPath?: string;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
  showMinimap?: boolean;
  layoutMode?: 'hierarchy' | 'force' | 'hybrid';
  forceOptions?: any; // Keep for compatibility, but not used in stable layout
  onLayoutCalculating?: (isCalculating: boolean) => void;
}

const generateVisibleEdges = (
  relationships: CareerRelationship[],
  focusedNodeId: string | null
): Edge[] => {
  // If focused, show connections to focused node
  if (focusedNodeId) {
    const focusedRelationships = relationships
      .filter(rel => rel.from === focusedNodeId || rel.to === focusedNodeId)
      .slice(0, 15); // Limit to prevent overwhelming display

    return focusedRelationships.map((rel, index) => ({
      id: `edge-${focusedNodeId}-${index}`,
      source: rel.from,
      target: rel.to,
      type: getEdgeTypeForRelationship(rel.type),
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      style: getEdgeStyleForRelationship(rel.type, rel.weight),
      label: rel.weight >= 4 ? getEdgeLabelForRelationship(rel.type) : '',
      animated: rel.weight >= 5,
    }));
  }

  // If no focus, show a subset of important relationships to provide structure
  const importantRelationships = relationships
    .filter(rel => (rel.weight || 1) >= 4) // Only show high-weight relationships
    .sort((a, b) => (b.weight || 1) - (a.weight || 1)) // Sort by weight descending
    .slice(0, 25); // Limit to 25 most important connections

  console.log('📊 Showing default edges:', {
    totalRelationships: relationships.length,
    filteredCount: importantRelationships.length,
    byType: importantRelationships.reduce((acc, rel) => {
      acc[rel.type] = (acc[rel.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  return importantRelationships.map((rel, index) => ({
    id: `edge-default-${index}`,
    source: rel.from,
    target: rel.to,
    type: getEdgeTypeForRelationship(rel.type),
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
    style: {
      ...getEdgeStyleForRelationship(rel.type, rel.weight),
      opacity: 0.4, // Make default edges more subtle
    },
    label: rel.weight >= 5 ? getEdgeLabelForRelationship(rel.type) : '',
    animated: false, // No animation for default edges
  }));
};

const getEdgeTypeForRelationship = (type: string) => {
  switch (type) {
    case 'prerequisite': return 'default';
    case 'learningPath': return 'smoothstep';
    case 'careerPath': return 'step';
    case 'validation': return 'straight';
    default: return 'default';
  }
};

const getEdgeStyleForRelationship = (type: string, weight: number = 1) => {
  const opacity = Math.max(0.4, Math.min(1, weight / 5));
  const strokeWidth = Math.max(2, Math.min(5, weight));
  
  switch (type) {
    case 'prerequisite': return { 
      stroke: 'hsl(var(--muted-foreground))', 
      strokeWidth, 
      opacity: opacity * 0.8
    };
    case 'learningPath': return { 
      stroke: 'hsl(var(--primary))', 
      strokeWidth, 
      opacity 
    };
    case 'careerPath': return { 
      stroke: 'hsl(var(--success))', 
      strokeWidth: strokeWidth + 1,
      opacity 
    };
    case 'validation': return { 
      stroke: 'hsl(var(--warning))', 
      strokeWidth, 
      opacity 
    };
    default: return { 
      stroke: 'hsl(var(--border))', 
      strokeWidth: 1, 
      opacity: 0.3 
    };
  }
};

const getEdgeLabelForRelationship = (type: string) => {
  switch (type) {
    case 'prerequisite': return 'requires';
    case 'learningPath': return 'learn';
    case 'careerPath': return 'leads to';
    case 'validation': return 'validates';
    default: return '';
  }
};

export const UnifiedCareerCanvas: React.FC<UnifiedCareerCanvasProps> = ({
  data,
  relationships,
  selectedCareerPath,
  onNodeClick,
  showMinimap = true,
  layoutMode = 'hierarchy',
  onLayoutCalculating,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const { fitView } = useReactFlow();

  // PHASE 2: Use real data with simplified layout
  const calculatedNodes = useMemo(() => {
    console.log('🚀 PHASE 2: Creating nodes from real data using simplified layout');
    
    if (onLayoutCalculating) {
      onLayoutCalculating(true);
    }

    try {
      // Use the simplified hierarchical layout with real data
      const nodes = calculateHierarchicalLayout(data, relationships);
      
      console.log('✅ Real data nodes created:', {
        count: nodes.length,
        nodesByType: nodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        sampleNodes: nodes.slice(0, 3).map(n => ({ 
          id: n.id, 
          type: n.type, 
          position: n.position,
          hasData: !!n.data,
          dataKeys: Object.keys(n.data || {})
        }))
      });

      return nodes;
    } catch (error) {
      console.error('❌ Layout calculation error:', error);
      return [];
    } finally {
      if (onLayoutCalculating) {
        onLayoutCalculating(false);
      }
    }
  }, [data, relationships, onLayoutCalculating]);

  // Generate edges based on relationships and focus
  const calculatedEdges = useMemo(() => {
    console.log('🔗 Generating edges from relationships');
    return generateVisibleEdges(relationships, focusedNodeId);
  }, [relationships, focusedNodeId]);

  // Update nodes when data changes
  useEffect(() => {
    console.log('🔄 Setting nodes in React Flow:', {
      calculatedNodesCount: calculatedNodes.length,
      firstNode: calculatedNodes[0],
      allNodeTypes: calculatedNodes.map(n => n.type)
    });
    
    setNodes(calculatedNodes);
    
    // Auto-fit view after layout
    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 100);
  }, [calculatedNodes, setNodes, fitView]);

  // Update edges when focus changes
  useEffect(() => {
    console.log('🔗 Setting edges in React Flow:', {
      calculatedEdgesCount: calculatedEdges.length,
      sampleEdges: calculatedEdges.slice(0, 3)
    });
    
    setEdges(calculatedEdges);
  }, [calculatedEdges, setEdges]);

  // Debug React Flow state and rendering issues
  useEffect(() => {
    console.log('📊 Current React Flow state:', {
      nodesInState: nodes.length,
      edgesInState: edges.length,
      nodeTypes: nodes.map(n => n.type),
      nodeIds: nodes.map(n => n.id).slice(0, 10),
      focusedNodeId
    });

    // PHASE 1 DEBUGGING: Check if nodes have proper structure
    nodes.forEach((node, index) => {
      console.log(`🔍 Node ${index}:`, {
        id: node.id,
        type: node.type,
        position: node.position,
        hasData: !!node.data,
        dataKeys: node.data ? Object.keys(node.data) : []
      });
    });

    // Check if nodeTypes are properly registered
    console.log('🔧 Registered nodeTypes:', Object.keys(nodeTypes));
    
    // Check if there are any React Flow errors
    const reactFlowContainer = document.querySelector('.react-flow');
    if (reactFlowContainer) {
      console.log('✅ React Flow container found');
      const nodeElements = reactFlowContainer.querySelectorAll('.react-flow__node');
      console.log(`📊 Rendered nodes in DOM: ${nodeElements.length}`);
    } else {
      console.log('❌ React Flow container not found');
    }
  }, [nodes, edges, focusedNodeId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Toggle focus mode
      if (focusedNodeId === node.id) {
        setFocusedNodeId(null);
        setShowFocusMode(false);
      } else {
        setFocusedNodeId(node.id);
        setShowFocusMode(true);
      }

      // Call original click handler
      if (onNodeClick) {
        onNodeClick(node.id, node.type || 'unknown');
      }
    },
    [focusedNodeId, onNodeClick]
  );

  const handleFocusNode = useCallback((nodeId: string | null) => {
    setFocusedNodeId(nodeId);
    if (nodeId) {
      setShowFocusMode(true);
    }
  }, []);

  const handleCloseFocusMode = useCallback(() => {
    setFocusedNodeId(null);
    setShowFocusMode(false);
  }, []);

  // Enhanced nodes with focus highlighting and error handling
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => {
      // Add error handling for missing data
      if (!node.data) {
        console.warn(`⚠️ Node ${node.id} missing data, providing fallback`);
        node.data = {
          title: 'Missing Data',
          name: 'Missing Data',
          description: 'This node has missing or invalid data'
        };
      }

      return {
        ...node,
        style: {
          ...node.style,
          opacity: focusedNodeId 
            ? (node.id === focusedNodeId || 
               relationships.some(rel => 
                 (rel.from === focusedNodeId && rel.to === node.id) ||
                 (rel.to === focusedNodeId && rel.from === node.id)
               )) ? 1 : 0.3
            : 1,
          transform: node.id === focusedNodeId ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.2s ease-in-out',
          zIndex: node.id === focusedNodeId ? 1000 : 1,
          border: node.id === focusedNodeId ? '2px solid hsl(var(--primary))' : undefined,
        }
      };
    });
  }, [nodes, focusedNodeId, relationships]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={enhancedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 2,
        }}
        className="bg-background"
      >
        <Background />
        <Controls />
        {showMinimap && (
          <MiniMap 
            nodeStrokeColor={(n) => {
              if (n.id === focusedNodeId) return 'hsl(var(--primary))';
              switch (n.type) {
                case 'skill': return 'hsl(var(--primary))';
                case 'course': return 'hsl(var(--success))';
                case 'project': return 'hsl(var(--warning))';
                case 'certification': return 'hsl(var(--secondary))';
                case 'job': return 'hsl(var(--destructive))';
                default: return 'hsl(var(--muted-foreground))';
              }
            }}
            nodeColor={(n) => {
              const opacity = focusedNodeId && n.id !== focusedNodeId ? 0.3 : 1;
              switch (n.type) {
                case 'skill': return `hsla(var(--primary), ${opacity})`;
                case 'course': return `hsla(var(--success), ${opacity})`;
                case 'project': return `hsla(var(--warning), ${opacity})`;
                case 'certification': return `hsla(var(--secondary), ${opacity})`;
                case 'job': return `hsla(var(--destructive), ${opacity})`;
                default: return `hsla(var(--muted), ${opacity})`;
              }
            }}
            maskColor="rgba(0, 0, 0, 0.05)"
          />
        )}
      </ReactFlow>

      {/* Focus Mode Panel */}
      {showFocusMode && focusedNodeId && (
        <FocusMode
          focusedNodeId={focusedNodeId}
          allRelationships={relationships}
          onFocusNode={handleFocusNode}
          onClose={handleCloseFocusMode}
        />
      )}
    </div>
  );
};