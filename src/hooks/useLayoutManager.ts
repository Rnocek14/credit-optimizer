import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { layoutWithElk, layoutAsGrid, ViewMode } from '@/lib/layout/elkLayout';

export function useLayoutManager() {
  const [isLayouting, setIsLayouting] = useState(false);
  const layoutInProgressRef = useRef(false);
  const layoutTimeoutRef = useRef<NodeJS.Timeout>();

  const applyLayout = useCallback(async (
    mode: ViewMode, 
    nodes: Node[], 
    edges: Edge[]
  ): Promise<Node[]> => {
    if (layoutInProgressRef.current || !nodes.length) {
      return nodes;
    }

    layoutInProgressRef.current = true;
    setIsLayouting(true);

    try {
      const result = await layoutWithElk(nodes, edges, mode);
      return Array.isArray(result) ? result : nodes;
    } catch (error) {
      console.error('Layout failed:', error);
      return layoutAsGrid(nodes, 'board');
    } finally {
      layoutInProgressRef.current = false;
      setIsLayouting(false);
    }
  }, []);

  const clearLayoutTimeout = useCallback(() => {
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
      layoutTimeoutRef.current = undefined;
    }
  }, []);

  return {
    applyLayout,
    isLayouting,
    clearLayoutTimeout,
    layoutTimeoutRef
  };
}