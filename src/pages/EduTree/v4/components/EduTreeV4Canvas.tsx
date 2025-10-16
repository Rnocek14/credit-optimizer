/**
 * EduTree V4 Canvas - React Flow canvas with ELK layout
 */
import React, { useEffect, useState, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Node, 
  Edge,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlanNode, PlanEdge, NodeType, EdgeType, OverlayState } from '../types/v4';
import { layoutSpineGraph } from '../engine/layoutEngine';
import { SpineNode } from './nodes/SpineNode';
import { CourseNode } from './nodes/CourseNode';
import { ExternalNode } from './nodes/ExternalNode';
import '../styles/v4-canvas.css';

interface EduTreeV4CanvasProps {
  nodes: PlanNode[];
  edges: PlanEdge[];
  overlays: OverlayState;
}

const nodeTypes = {
  [NodeType.Year]: SpineNode,
  [NodeType.Course]: CourseNode,
  [NodeType.External]: ExternalNode,
  [NodeType.Requirement]: CourseNode,
  [NodeType.Bundle]: CourseNode,
};

function CanvasInner({ nodes: initialNodes, edges: initialEdges, overlays }: EduTreeV4CanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const { fitView } = useReactFlow();

  // Apply layout on mount
  useEffect(() => {
    async function applyLayout() {
      console.log('[V4 Canvas] Applying ELK layout...');
      const positioned = await layoutSpineGraph(initialNodes, initialEdges);
      
      // Convert to React Flow format
      const reactFlowNodes: Node[] = positioned.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: { ...node.data },
      }));

      setNodes(reactFlowNodes);
      
      console.log('[V4 Canvas] Layout complete, fitted view');
      
      // Fit view after layout
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 400 });
      });
    }

    applyLayout();
  }, [initialNodes, initialEdges, fitView]);

  // Update edge visibility based on overlays
  useEffect(() => {
    const reactFlowEdges: Edge[] = initialEdges.map(edge => {
      const isEquivEdge = edge.type === EdgeType.Equivalency;
      const shouldHide = isEquivEdge && !overlays.transfer;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'default',
        animated: edge.animated,
        label: edge.label,
        className: `
          ${edge.type === EdgeType.Sequence ? 'spine-edge' : ''}
          ${edge.type === EdgeType.Prerequisite ? 'prereq-edge' : ''}
          ${edge.type === EdgeType.Equivalency ? 'equiv-edge' : ''}
          ${edge.type === EdgeType.Fulfills ? 'fulfill-edge' : ''}
          ${shouldHide ? 'hidden' : ''}
        `.trim(),
      };
    });

    setEdges(reactFlowEdges);
  }, [initialEdges, overlays]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ type: 'default' }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export default function EduTreeV4Canvas(props: EduTreeV4CanvasProps) {
  return <CanvasInner {...props} />;
}
