import React, { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

interface TreeLayoutControlsProps {
  onAutoFillComplete?: () => void;
  onTreeLayoutComplete?: () => void;
}

/**
 * Component that handles fitView functionality for tree layout operations
 * Must be rendered inside ReactFlow to access useReactFlow hook
 */
export function TreeLayoutControls({ onAutoFillComplete, onTreeLayoutComplete }: TreeLayoutControlsProps) {
  const { fitView } = useReactFlow();

  // Listen for layout completion and trigger fitView
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TREE_LAYOUT_COMPLETE') {
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 400 });
        }, 50);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fitView]);

  // Listen for auto-fill completion
  useEffect(() => {
    if (onAutoFillComplete) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [onAutoFillComplete, fitView]);

  // Listen for tree layout completion
  useEffect(() => {
    if (onTreeLayoutComplete) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [onTreeLayoutComplete, fitView]);

  return null; // This component only handles side effects
}