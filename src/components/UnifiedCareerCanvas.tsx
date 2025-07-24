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

const generateFocusedEdges = (
  relationships: CareerRelationship[],
  focusedNodeId: string | null
): Edge[] => {
  // If no focus, show no edges to avoid chaos
  if (!focusedNodeId) {
    return [];
  }

  // Show only relationships connected to the focused node
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

  // Calculate stable hierarchical layout
  const calculatedNodes = useMemo(() => {
    console.log('🎯 Using stable hierarchical layout');
    return calculateHierarchicalLayout(data, relationships);
  }, [data, relationships]);

  // Generate focused edges based on current focus
  const calculatedEdges = useMemo(() => {
    return generateFocusedEdges(relationships, focusedNodeId);
  }, [relationships, focusedNodeId]);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(calculatedNodes);
    // Auto-fit view after layout
    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 100);
  }, [calculatedNodes, setNodes, fitView]);

  // Update edges when focus changes
  useEffect(() => {
    setEdges(calculatedEdges);
  }, [calculatedEdges, setEdges]);

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

  // Enhanced nodes with focus highlighting
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => ({
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
        transform: node.id === focusedNodeId ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.2s ease-in-out',
        zIndex: node.id === focusedNodeId ? 1000 : 1,
      }
    }));
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