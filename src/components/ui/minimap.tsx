import React from 'react';
import { MiniMap } from '@xyflow/react';

/**
 * Custom MiniMap component with proper styling
 */
export function EduTreeMiniMap() {
  return (
    <MiniMap
      nodeStrokeColor={(n) => {
        if (n.type === 'blockGroup') {
          return n.data.isComplete ? 'hsl(var(--primary))' : 'hsl(var(--border))';
        }
        return 'hsl(var(--muted-foreground))';
      }}
      nodeColor={(n) => {
        if (n.type === 'blockGroup') {
          return n.data.isUnlocked ? 'hsl(var(--card))' : 'hsl(var(--muted))';
        }
        return 'hsl(var(--background))';
      }}
      nodeBorderRadius={8}
      maskColor="hsl(var(--background) / 0.8)"
      className="!bg-card !border !border-border !rounded-lg"
      style={{ 
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))'
      }}
    />
  );
}