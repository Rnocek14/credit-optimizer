import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const testNodes: Node[] = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Test Node 1' },
    type: 'default',
  },
  {
    id: '2',
    position: { x: 0, y: 100 },
    data: { label: 'Test Node 2' },
    type: 'default',
  },
];

const testEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
  },
];

export const ReactFlowTest: React.FC = () => {
  return (
    <div className="h-96 w-full bg-red-50 border-2 border-red-500">
      <div className="absolute top-2 left-2 z-10 bg-green-100 p-2 text-xs rounded">
        ReactFlow Test - Should show 2 nodes
      </div>
      <ReactFlow
        nodes={testNodes}
        edges={testEdges}
        fitView
        className="w-full h-full"
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};