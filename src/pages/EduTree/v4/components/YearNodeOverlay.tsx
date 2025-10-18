/**
 * Year Node Overlay - Renders clickable chevron buttons outside React Flow
 * Positioned absolutely to bypass elementsSelectable={false} blocking
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useNodes, useViewport } from '@xyflow/react';
import { NodeType } from '../types/v4';

interface YearNodeOverlayProps {
  onToggleCollapse: (yearNodeId: string) => void;
}

export function YearNodeOverlay({ onToggleCollapse }: YearNodeOverlayProps) {
  const nodes = useNodes();
  const { x: viewportX, y: viewportY, zoom } = useViewport();

  // Filter only year nodes
  const yearNodes = nodes.filter(n => n.type === NodeType.Year);

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-[100]"
      style={{ overflow: 'hidden' }}
    >
      {yearNodes.map(node => {
        const isCollapsed = node.data.isCollapsed || false;
        
        // Calculate button position with viewport transform
        const buttonX = node.position.x * zoom + viewportX + (140 * zoom); // Center of 180px node + label width
        const buttonY = node.position.y * zoom + viewportY + (20 * zoom); // Top of node

        return (
          <button
            key={node.id}
            onClick={() => {
              console.log('[YearNodeOverlay] Chevron clicked!', node.id);
              onToggleCollapse(node.id);
            }}
            className="absolute p-1 hover:bg-primary/20 rounded cursor-pointer bg-white/50 pointer-events-auto transition-colors"
            style={{
              left: `${buttonX}px`,
              top: `${buttonY}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
            type="button"
            aria-label={isCollapsed ? 'Expand year' : 'Collapse year'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-primary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
