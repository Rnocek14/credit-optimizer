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
import { GhostCourseNode } from './nodes/GhostCourseNode';
import { ExternalNode } from './nodes/ExternalNode';
import { TransferEdge } from './edges/TransferEdge';
import { CompareEdge } from './edges/CompareEdge';
import '../styles/v4-canvas.css';
import '../styles/EduTreeV4.css';

interface EduTreeV4CanvasProps {
  nodes: PlanNode[];
  edges: PlanEdge[];
  overlays: OverlayState;
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypes = {
  [NodeType.Year]: SpineNode,
  [NodeType.Course]: CourseNode,
  [NodeType.External]: ExternalNode,
  [NodeType.Requirement]: CourseNode,
  [NodeType.Bundle]: CourseNode,
  ghost: GhostCourseNode,
};

const edgeTypes = {
  transfer: TransferEdge,
  compare: CompareEdge,
};

function CanvasInner({ nodes: initialNodes, edges: initialEdges, overlays, onNodeClick }: EduTreeV4CanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const { fitView } = useReactFlow();

  // Apply layout on mount
  useEffect(() => {
    async function applyLayout() {
      console.log('[V4 Canvas] Applying ELK layout...');
      const positioned = await layoutSpineGraph(initialNodes, initialEdges);
      
      // Convert to React Flow format
      const reactFlowNodes: Node[] = positioned.map(node => {
        const isGhostNode = node.className?.includes('ghost-node');
        const isCourseNode = [NodeType.Course, NodeType.Requirement, NodeType.Bundle].includes(node.type);
        const onClick = isCourseNode && onNodeClick ? () => onNodeClick(node.id) : undefined;
        
        console.log(`[Layout] ${node.id}: type=${node.type}, isCourseNode=${isCourseNode}, onClick=${!!onClick}`);
        
        return {
          id: node.id,
          type: isGhostNode ? 'ghost' : node.type,
          position: node.position,
          data: { 
            ...node.data,
            onClick,
          },
          hidden: isGhostNode && !overlays.compare,
        };
      });

      setLayoutedNodes(reactFlowNodes);
      setNodes(reactFlowNodes);
      
      console.log('[V4 Canvas] Layout complete, fitted view');
      
      // Fit view after layout
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 400 });
      });
    }

    applyLayout();
  }, [initialNodes, initialEdges, fitView, onNodeClick]);

  // Manual ghost node positioning when Compare overlay is active
  useEffect(() => {
    if (layoutedNodes.length === 0) return;
    
    // Skip ghost positioning if Compare overlay is not active
    if (!overlays.compare) {
      setNodes(layoutedNodes); // Use original layouted nodes directly
      return;
    }
    
    const updatedNodes = layoutedNodes.map(node => {
      const isGhost = node.type === 'ghost';
      if (!isGhost) {
        console.log(`[Ghost Effect] ${node.id}: non-ghost, preserving, onClick=${!!node.data.onClick}`);
        return node;
      }
      
      // Find the source node this ghost replaces
      const alternativeFor = node.data.alternativeFor;
      if (!alternativeFor) return node;
      
      const sourceNode = layoutedNodes.find(n => n.data.label === alternativeFor);
      if (!sourceNode) return node;
      
      // Position ghost node in the same column as source, offset below by 80px
      return {
        ...node,
        position: {
          x: sourceNode.position.x,
          y: sourceNode.position.y + 80,
        },
        hidden: !overlays.compare, // Show when compare is active, hide otherwise
      };
    });
    
    setNodes(updatedNodes);
  }, [overlays.compare, layoutedNodes]);

  // Update edge visibility based on overlays
  useEffect(() => {
    const reactFlowEdges: Edge[] = initialEdges.map(edge => {
      const isEquivEdge = edge.type === EdgeType.Equivalency;
      const isCompareEdge = edge.className?.includes('compare-edge');
      
      // Determine visibility
      const shouldHideTransfer = isEquivEdge && !isCompareEdge && !overlays.transfer;
      const shouldHideCompare = isCompareEdge && !overlays.compare;
      const shouldHide = shouldHideTransfer || shouldHideCompare;

      // Determine edge type
      let edgeType = 'default';
      if (isEquivEdge && !isCompareEdge && overlays.transfer) {
        edgeType = 'transfer';
      } else if (isCompareEdge && overlays.compare) {
        edgeType = 'compare';
      }

      // Determine label
      let label = edge.label;
      if (isEquivEdge && !isCompareEdge) {
        label = 'Transfer: CLEP Exam';
      } else if (isCompareEdge) {
        label = 'Alternative';
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        animated: edge.animated,
        label,
        labelStyle: (isEquivEdge || isCompareEdge) ? { 
          fontSize: 11, 
          fill: 'hsl(var(--foreground))',
          fontWeight: 600 
        } : undefined,
        data: isEquivEdge && !isCompareEdge ? {
          policyText: "Transfer Credit: CLEP Calculus → MATH 151\nPolicy: Max 60 transfer credits. CLEP requires score ≥ 50.\nResidency: Must complete ≥30 credits in residence."
        } : isCompareEdge ? {
          comparisonText: "Plan B Alternative: Lighter prerequisites\nSaves 1 year completion time"
        } : undefined,
        className: `
          ${edge.type === EdgeType.Sequence ? 'spine-edge' : ''}
          ${edge.type === EdgeType.Prerequisite ? 'prereq-edge' : ''}
          ${edge.type === EdgeType.Equivalency && !isCompareEdge ? 'equiv-edge' : ''}
          ${isCompareEdge ? 'compare-edge' : ''}
          ${edge.type === EdgeType.Fulfills ? 'fulfill-edge' : ''}
          ${shouldHide ? 'hidden' : ''}
        `.trim(),
        hidden: shouldHide,
      };
    });

    setEdges(reactFlowEdges);
  }, [initialEdges, overlays]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ type: 'default' }}
      onNodeClick={(event, node) => {
        // Trigger for all nodes that render as CourseNode component
        const courseNodeTypes = [NodeType.Course, NodeType.Requirement, NodeType.Bundle];
        const nodeData = node.data as any;
        
        console.log('[RF onNodeClick]', {
          id: node.id,
          type: node.type,
          isCourseType: courseNodeTypes.includes(node.type as NodeType),
          hasOnClick: typeof nodeData?.onClick === 'function',
          data: nodeData
        });
        
        if (courseNodeTypes.includes(node.type as NodeType) && typeof nodeData?.onClick === 'function') {
          console.log('[V4 Canvas] Node clicked:', node.id, node.type);
          nodeData.onClick();
        }
      }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export default function EduTreeV4Canvas(props: EduTreeV4CanvasProps) {
  return <CanvasInner {...props} />;
}
