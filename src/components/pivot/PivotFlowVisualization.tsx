import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './ReactFlowStyles.css';

import PivotStepNode from './PivotStepNode';
import PivotEdge from './PivotEdge';

interface PivotRoadmapStep {
  id: string;
  title: string;
  description?: string;
  skills_needed?: string[];
  skills_already_have?: string[];
  estimated_time?: string;
  estimated_cost?: string;
  learning_resources?: Array<{
    title: string;
    provider: string;
    cost: string;
    duration: string;
    reasoning: string;
  }>;
  pivotSource: string;
}

interface PivotFlowVisualizationProps {
  pivotRoadmapSteps: PivotRoadmapStep[];
  className?: string;
}

// Simple test node to debug rendering
const SimpleTestNode = ({ data }: any) => {
  return (
    <div style={{ 
      padding: '10px', 
      background: 'white', 
      border: '2px solid red', 
      borderRadius: '4px',
      minWidth: '200px',
      fontSize: '12px'
    }}>
      <strong style={{ color: 'black' }}>{data.title || 'No Title'}</strong>
      <br />
      <small style={{ color: 'gray' }}>{data.description || 'No Description'}</small>
      <br />
      <small style={{ color: 'blue' }}>Source: {data.pivotSource || 'Unknown'}</small>
    </div>
  );
};

// Use simple test nodes for now to debug
const nodeTypes = {
  pivotStep: SimpleTestNode,
  default: undefined,
};

const edgeTypes = {
  pivotEdge: PivotEdge,
};

export const PivotFlowVisualization: React.FC<PivotFlowVisualizationProps> = ({
  pivotRoadmapSteps,
  className = '',
}) => {
  console.log('🔍 PivotFlowVisualization received pivotRoadmapSteps:', pivotRoadmapSteps);
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Group steps by pivot source
  const stepsByPivot = useMemo(() => {
    const groups = new Map<string, PivotRoadmapStep[]>();
    
    pivotRoadmapSteps.forEach(step => {
      if (!groups.has(step.pivotSource)) {
        groups.set(step.pivotSource, []);
      }
      groups.get(step.pivotSource)!.push(step);
    });
    
    // Sort steps within each group by title (assuming chronological order)
    groups.forEach((steps, key) => {
      groups.set(key, steps.sort((a, b) => a.title.localeCompare(b.title)));
    });
    
    return groups;
  }, [pivotRoadmapSteps]);

  // Convert roadmap steps to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    console.log('🔍 Converting steps to nodes/edges. stepsByPivot:', stepsByPivot);
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let currentY = 0;
    const pivotSpacing = 400; // Horizontal spacing between different career pivots
    let pivotIndex = 0;

    stepsByPivot.forEach((steps, pivotSource) => {
      console.log(`🔍 Processing pivot: ${pivotSource} with ${steps.length} steps`);
      
      const stepSpacing = 180; // Vertical spacing between steps
      const xPosition = pivotIndex * pivotSpacing;
      
      steps.forEach((step, stepIndex) => {
        const yPosition = currentY + (stepIndex * stepSpacing);
        const isStart = stepIndex === 0;
        const isGoal = stepIndex === steps.length - 1;
        
        console.log(`🔍 Creating node for step ${stepIndex}: ${step.title} at (${xPosition}, ${yPosition})`);
        
        // Create node
        const newNode = {
          id: step.id,
          type: 'pivotStep',
          position: { x: xPosition, y: yPosition },
          data: {
            ...step,
            isStart,
            isGoal,
            stepIndex: stepIndex + 1,
            totalSteps: steps.length,
          },
          draggable: false,
          selectable: true,
        };
        
        nodes.push(newNode);
        console.log(`🔍 Added node:`, newNode);
        
        // Create edge to next step
        if (stepIndex < steps.length - 1) {
          const nextStep = steps[stepIndex + 1];
          const newEdge = {
            id: `${step.id}-${nextStep.id}`,
            source: step.id,
            target: nextStep.id,
            type: 'pivotEdge',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: 'hsl(var(--primary))',
            },
            data: {
              animated: true,
            },
          };
          edges.push(newEdge);
          console.log(`🔍 Added edge:`, newEdge);
        }
      });
      
      pivotIndex++;
      if (pivotIndex % 3 === 0) {
        // Move to next row after every 3 pivots
        currentY += (Math.max(...Array.from(stepsByPivot.values()).map(s => s.length)) * 180) + 100;
        pivotIndex = 0;
      }
    });
    
    console.log(`🔍 Final nodes count: ${nodes.length}`, nodes);
    console.log(`🔍 Final edges count: ${edges.length}`, edges);
    
    return { initialNodes: nodes, initialEdges: edges };
  }, [stepsByPivot]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);
  }, [selectedNode]);

  // Update nodes when selection changes
  const updatedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: selectedNode && selectedNode !== node.id ? 0.5 : 1,
      }
    }));
  }, [nodes, selectedNode]);

  if (pivotRoadmapSteps.length === 0) {
    return (
      <div className={`h-96 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed ${className}`}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground font-medium">No pivot roadmaps generated yet</p>
          <p className="text-sm text-muted-foreground">
            Click "Generate Roadmap" on any pivot path to see the step-by-step journey
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-96 bg-background border rounded-lg overflow-hidden ${className}`}>
      {/* Debug Info */}
      <div className="absolute top-2 left-2 z-10 bg-yellow-100 p-2 text-xs rounded">
        Nodes: {updatedNodes.length} | Edges: {edges.length}
        <br/>
        NodeTypes: {Object.keys(nodeTypes).join(', ')}
        <br/>
        Container Size: {updatedNodes.length > 0 ? 'Has nodes' : 'No nodes'}
      </div>
      
      {/* Temporary raw node display for debugging */}
      {updatedNodes.length > 0 && (
        <div className="absolute top-20 left-2 z-10 bg-red-100 p-2 text-xs rounded max-w-xs">
          First Node: {JSON.stringify(updatedNodes[0], null, 2).substring(0, 200)}...
        </div>
      )}
      
      <ReactFlow
        nodes={updatedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
        fitViewOptions={{
          padding: 40,
          minZoom: 0.1,
          maxZoom: 2,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 w-full h-full"
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
      >
        <Controls 
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="bg-background border shadow-sm"
        />
        <Background 
          gap={20} 
          size={1} 
          color="hsl(var(--muted-foreground))"
          className="opacity-30"
        />
      </ReactFlow>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-sm space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Career Pivot Roadmaps</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm bg-green-200 border border-green-300"></div>
            <span className="text-muted-foreground">Starting Point</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm bg-blue-200 border border-blue-300"></div>
            <span className="text-muted-foreground">Learning Step</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm bg-purple-200 border border-purple-300"></div>
            <span className="text-muted-foreground">Career Goal</span>
          </div>
        </div>
      </div>
    </div>
  );
};