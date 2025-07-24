import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Enhanced architecture components
import { SkillTreeProvider, useSkillTree } from '@/contexts/SkillTreeContext';
import { ProgressiveDisclosureProvider } from './SkillTree/ProgressiveDisclosure';
import { useTreeLayoutEngine } from './SkillTree/TreeLayoutEngine';
import { GraphControls } from './SkillTree/GraphControls';

// Custom Node Types - Complete 6-node architecture
import { SkillTreeStepNode } from './SkillTreeStepNode';
import { SkillTreeSkillNode } from './SkillTreeSkillNode';
import { JobNode } from './SkillTree/JobNode';
import { CourseNode } from './SkillTree/CourseNode';
import { ProjectNode } from './SkillTree/ProjectNode';
import { CertificationNode } from './SkillTree/CertificationNode';
import { ClusterNode } from './SkillTree/ClusterNode';

const nodeTypes = {
  careerStep: SkillTreeStepNode,
  skill: SkillTreeSkillNode,
  job: JobNode,
  course: CourseNode,
  project: ProjectNode,
  certification: CertificationNode,
  cluster: ClusterNode,
};

// Main component wrapped with context
export const SkillTreeNew: React.FC = () => {
  return (
    <SkillTreeProvider>
      <ProgressiveDisclosureProvider>
        <SkillTreeCanvas />
      </ProgressiveDisclosureProvider>
    </SkillTreeProvider>
  );
};

// Separated canvas component
const SkillTreeCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const { selectedCareerPath, dataLoaded, loading, displayControls, updateDisplayControls } = useSkillTree();
  const { generateTreeLayout } = useTreeLayoutEngine();

  // Generate enhanced tree when data changes
  useEffect(() => {
    if (dataLoaded && selectedCareerPath) {
      const { nodes: newNodes, edges: newEdges } = generateTreeLayout();
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [dataLoaded, selectedCareerPath, generateTreeLayout, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Controls Panel */}
      <div className="flex-shrink-0 p-4 bg-background border-b">
        <div className="max-w-7xl mx-auto">
          <GraphControls />
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex-1 relative">
        {!dataLoaded && selectedCareerPath && loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">Loading career data...</div>
          </div>
        ) : !selectedCareerPath ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-semibold mb-2">Select a Career Path</h3>
              <p className="text-muted-foreground">
                Choose a career path from the dropdown above to explore the skill tree visualization.
              </p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4">
                This career path doesn't have any steps defined yet. 
                Try selecting a different path or generate a new one.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
            minZoom={0.1}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Background />
            <Controls />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.type === 'careerStep') return 'hsl(var(--primary))';
                if (n.type === 'skill') return 'hsl(var(--blue-500))';
                if (n.type === 'course') return 'hsl(var(--green-500))';
                if (n.type === 'project') return 'hsl(var(--purple-500))';
                if (n.type === 'certification') return 'hsl(var(--orange-500))';
                if (n.type === 'job') return 'hsl(var(--red-500))';
                return 'hsl(var(--muted-foreground))';
              }}
              nodeColor={(n) => {
                if (n.data?.isCompleted) return 'hsl(var(--green-500))';
                if (n.data?.isInProgress) return 'hsl(var(--yellow-500))';
                return 'hsl(var(--muted))';
              }}
              maskColor="rgb(50, 50, 50, 0.8)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};