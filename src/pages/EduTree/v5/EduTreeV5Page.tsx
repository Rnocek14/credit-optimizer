import React, { useCallback } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  Background, 
  Controls,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { YearSpineNode } from './components/YearSpineNode';
import { useYearSpine } from './hooks/useYearSpine';
import './styles/v5.css';

const nodeTypes = {
  yearSpine: YearSpineNode
};

function EduTreeV5Canvas() {
  const { yearNodes, toggleYear } = useYearSpine();

  // Handle node click - THIS IS THE ONLY INTERACTION LOGIC
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('[V5 Canvas] Node clicked:', node.id);
    
    // Toggle year collapse
    if (node.type === 'yearSpine') {
      toggleYear(node.id);
    }
  }, [toggleYear]);

  return (
    <div className="w-full h-screen bg-background">
      {/* Debug Header */}
      <div className="absolute top-4 left-4 z-10 bg-card p-4 rounded-lg border shadow-sm">
        <h1 className="text-lg font-bold mb-2">EduTree V5 Testbed</h1>
        <p className="text-sm text-muted-foreground">
          Click any year node to collapse/expand
        </p>
        <div className="text-xs text-muted-foreground mt-2">
          Nodes: {yearNodes.length}
        </div>
      </div>

      <ReactFlow
        nodes={yearNodes}
        edges={[]} // No edges in Phase 1
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function EduTreeV5Page() {
  return (
    <ReactFlowProvider>
      <EduTreeV5Canvas />
    </ReactFlowProvider>
  );
}
