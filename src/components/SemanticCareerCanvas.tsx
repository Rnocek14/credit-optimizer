import React, { useMemo, useCallback } from 'react';
import { ReactFlow, useNodesState, useEdgesState, Controls, Background, MiniMap, Node, Edge } from '@xyflow/react';
import { SemanticSkillNode } from './semantic/SemanticSkillNode';
import { SemanticJobNode } from './semantic/SemanticJobNode';
import { SemanticCourseNode } from './semantic/SemanticCourseNode';
import { SemanticStepNode } from './semantic/SemanticStepNode';
import { SemanticEdge } from './semantic/SemanticEdge';
import { PersonalizationIndicators } from './semantic/PersonalizationIndicators';
import { SemanticPath, SemanticNode, SemanticEdge as SemanticEdgeType, SubstitutionOption, PivotOpportunity } from '@/types/semantic';

interface SemanticCareerCanvasProps {
  paths: SemanticPath[];
  selectedPathId?: string;
  onNodeClick?: (node: SemanticNode) => void;
  onSubstitutionSelect?: (substitution: SubstitutionOption) => void;
  onPivotSelect?: (pivot: PivotOpportunity) => void;
  showPersonalization?: boolean;
  className?: string;
}

const nodeTypes = {
  skill: SemanticSkillNode,
  job: SemanticJobNode,
  course: SemanticCourseNode,
  step: SemanticStepNode,
  project: SemanticStepNode,
  certification: SemanticStepNode,
};

const edgeTypes = {
  semantic: SemanticEdge,
};

export const SemanticCareerCanvas: React.FC<SemanticCareerCanvasProps> = ({
  paths,
  selectedPathId,
  onNodeClick,
  onSubstitutionSelect,
  onPivotSelect,
  showPersonalization = true,
  className = ''
}) => {
  // Convert semantic paths to React Flow format
  const { flowNodes, flowEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    paths.forEach((path, pathIndex) => {
      const isSelected = selectedPathId === path.id;
      
      path.nodes.forEach((node, nodeIndex) => {
        const flowNode: Node = {
          id: node.id,
          type: node.type,
          position: node.position || { x: nodeIndex * 250, y: pathIndex * 200 },
          data: {
            node,
            isSelected,
            onSubstitutionSelect,
            onNodeAction: (action: string, nodeId: string) => {
              console.log('Node action:', action, nodeId);
            },
            ...(node.type === 'job' && {
              pivotOpportunities: path.pivot_opportunities?.filter(p => 
                p.from_job_id === node.id || p.to_job_id === node.id
              ),
              onPivotSelect,
            })
          },
        };
        nodes.push(flowNode);
      });
      
      path.edges.forEach((edge) => {
        const flowEdge: Edge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'semantic',
          data: {
            edge,
            showLabels: isSelected,
          },
        };
        edges.push(flowEdge);
      });
    });
    
    return { flowNodes: nodes, flowEdges: edges };
  }, [paths, selectedPathId, onSubstitutionSelect, onPivotSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.data?.node) {
      onNodeClick?.(node.data.node as SemanticNode);
    }
  }, [onNodeClick]);

  const selectedPath = useMemo(() => 
    paths.find(path => path.id === selectedPathId), 
    [paths, selectedPathId]
  );

  return (
    <div className={`w-full h-full relative ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-background"
      >
        <Controls />
        <Background />
        <MiniMap />
      </ReactFlow>

      {/* Personalization overlay */}
      {showPersonalization && selectedPath && (
        <div className="absolute top-4 right-4 w-72">
          <PersonalizationIndicators
            personalizationScore={selectedPath.metadata.personalization_score}
            timeFeasibility={selectedPath.metadata.time_feasibility}
            budgetFeasibility={selectedPath.metadata.budget_feasibility}
            locationRelevance={selectedPath.metadata.location_relevance}
          />
        </div>
      )}
    </div>
  );
};