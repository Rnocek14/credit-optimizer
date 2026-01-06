import React from 'react';
import { MiniMap } from '@xyflow/react';

/**
 * Custom MiniMap component with proper styling
 * Note: CSS variables contain full OKLCH values, so use var() directly (not hsl())
 */
export function EduTreeMiniMap() {
  return (
    <MiniMap
      nodeStrokeColor={(n) => {
        if (n.type === 'blockGroup') {
          return n.data.isComplete ? 'var(--primary)' : 'var(--border)';
        }
        return 'var(--muted-foreground)';
      }}
      nodeColor={(n) => {
        if (n.type === 'blockGroup') {
          return n.data.isUnlocked ? 'var(--card)' : 'var(--muted)';
        }
        return 'var(--background)';
      }}
      nodeBorderRadius={8}
      maskColor="color-mix(in oklch, var(--background) 80%, transparent)"
      className="!bg-card !border !border-border !rounded-lg"
      style={{ 
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)'
      }}
    />
  );
}
