import React, { useCallback, useEffect, useRef } from 'react';
import { ReactFlowInstance } from '@xyflow/react';

interface SkillTreeAccessibilityProps {
  reactFlowInstance: ReactFlowInstance | null;
  nodes: any[];
  onNodeSelect: (nodeId: string) => void;
}

export const SkillTreeAccessibility: React.FC<SkillTreeAccessibilityProps> = ({
  reactFlowInstance,
  nodes,
  onNodeSelect
}) => {
  const [selectedNodeIndex, setSelectedNodeIndex] = React.useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // PR-7: Keyboard navigation between nodes
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!reactFlowInstance || nodes.length === 0) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        setSelectedNodeIndex((prev) => 
          prev < nodes.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        setSelectedNodeIndex((prev) => 
          prev > 0 ? prev - 1 : nodes.length - 1
        );
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (selectedNodeIndex >= 0 && selectedNodeIndex < nodes.length) {
          onNodeSelect(nodes[selectedNodeIndex].id);
        }
        break;
        
      case 'Home':
        event.preventDefault();
        setSelectedNodeIndex(0);
        break;
        
      case 'End':
        event.preventDefault();
        setSelectedNodeIndex(nodes.length - 1);
        break;
    }
  }, [reactFlowInstance, nodes, selectedNodeIndex, onNodeSelect]);

  // PR-7: Focus to selected node
  useEffect(() => {
    if (selectedNodeIndex >= 0 && selectedNodeIndex < nodes.length && reactFlowInstance) {
      const selectedNode = nodes[selectedNodeIndex];
      reactFlowInstance.setCenter(selectedNode.position.x, selectedNode.position.y, {
        zoom: 1.2,
        duration: 300
      });
    }
  }, [selectedNodeIndex, nodes, reactFlowInstance]);

  // PR-7: Keyboard event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="sr-only"
      role="application"
      aria-label="Skill Tree Navigation"
      aria-describedby="skill-tree-instructions"
    >
      <div id="skill-tree-instructions" className="sr-only">
        Use arrow keys to navigate between skills. Press Enter or Space to select a skill.
        Press Home to go to first skill, End to go to last skill.
      </div>
      
      {selectedNodeIndex >= 0 && selectedNodeIndex < nodes.length && (
        <div className="sr-only" aria-live="polite">
          Selected: {nodes[selectedNodeIndex].data?.title || 'Unknown'} 
          ({selectedNodeIndex + 1} of {nodes.length})
        </div>
      )}
    </div>
  );
};