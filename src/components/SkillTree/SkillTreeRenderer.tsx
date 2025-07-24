import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes
} from '@xyflow/react';
import { useTreeLayoutEngine } from './TreeLayoutEngine';
import { SkillTreeSkillNode } from '../SkillTreeSkillNode';
import { SkillTreeStepNode } from '../SkillTreeStepNode';
import { JobNode } from './JobNode';
import { CourseNode } from './CourseNode';
import { ProjectNode } from './ProjectNode';
import { CertificationNode } from './CertificationNode';
import { SkillTreeControls } from './SkillTreeControls';
import { SkillTreeSearch } from './SkillTreeSearch';

const nodeTypes: NodeTypes = {
  skill: SkillTreeSkillNode,
  careerStep: SkillTreeStepNode,
  job: JobNode,
  course: CourseNode,
  project: ProjectNode,
  certification: CertificationNode,
};

interface SkillTreeRendererProps {
  onSkillClick: (skill: any) => void;
  showMinimap?: boolean;
  onCameraStateChange?: (state: {
    skillPositions: Map<string, { x: number; y: number }>;
    zoomLevel: number;
    panOffset: { x: number; y: number };
  }) => void;
}

export const SkillTreeRenderer: React.FC<SkillTreeRendererProps> = ({
  onSkillClick,
  showMinimap = true,
  onCameraStateChange
}) => {
  const { generateTreeLayout } = useTreeLayoutEngine();
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return generateTreeLayout();
  }, [generateTreeLayout]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle node clicks
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'skill') {
      onSkillClick(node.data);
    }
  }, [onSkillClick]);

  // Fit view to content
  const handleFitView = useCallback(() => {
    // React Flow will handle this automatically
  }, []);

  // Handle camera state changes for external components
  const handleViewportChange = useCallback((viewport: any) => {
    if (onCameraStateChange) {
      const skillPositions = new Map();
      nodes.forEach(node => {
        if (node.type === 'skill') {
          skillPositions.set(node.id.replace('skill-', ''), node.position);
        }
      });
      
      onCameraStateChange({
        skillPositions,
        zoomLevel: viewport.zoom,
        panOffset: { x: viewport.x, y: viewport.y }
      });
    }
  }, [nodes, onCameraStateChange]);

  return (
    <div className="w-full h-[800px] relative">
      <SkillTreeControls onFitView={handleFitView} />
      <SkillTreeSearch nodes={nodes} setNodes={setNodes} />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onViewportChange={handleViewportChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50"
      >
        <Background />
        <Controls />
        {showMinimap && (
          <MiniMap 
            zoomable 
            pannable 
            className="bg-white border border-gray-200" 
          />
        )}
      </ReactFlow>
    </div>
  );
};