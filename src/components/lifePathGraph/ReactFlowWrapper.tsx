import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import LifePathCanvas from './LifePathCanvas';
import { LifePathGraph } from '@/hooks/useLifePathGraph';
import { GraphNode, PathfindingResult } from '@/types/lifePathGraph';

interface ReactFlowWrapperProps {
  graph: LifePathGraph;
  pathfindingResult?: PathfindingResult | null;
  onNodeClick?: (node: GraphNode) => void;
  selectedNode?: GraphNode | null;
  findPaths?: (goalId: string) => void;
  activeGoal?: string;
}

/**
 * Wrapper component that provides ReactFlow context
 * This ensures useReactFlow() hook works properly in LifePathCanvas
 */
export default function ReactFlowWrapper(props: ReactFlowWrapperProps) {
  return (
    <ReactFlowProvider>
      <LifePathCanvas {...props} />
    </ReactFlowProvider>
  );
}