/**
 * Checkpoint Controls Component
 * Expand/Collapse actions for gates
 */

import React from 'react';
import { useSuffixCompareStore } from '../state/useSuffixCompareStore';

interface CheckpointControlsProps {
  checkpointId: string;
  gateType: 'program' | 'track';
  className?: string;
}

export function CheckpointControls({ checkpointId, gateType, className = '' }: CheckpointControlsProps) {
  const { checkpointId: activeCheckpoint, enabled, setSuffix, clearSuffix } = useSuffixCompareStore();
  
  const isActive = enabled && activeCheckpoint === checkpointId;
  
  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSuffix({ checkpointId, enabled: true });
  };
  
  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSuffix();
  };
  
  return (
    <div className={`mt-2 ${className}`}>
      {!isActive ? (
        <button
          onClick={handleExpand}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors"
          title="Show differences from this point onward"
        >
          Expand from here
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary font-medium">
            Expanded (suffix)
          </span>
          <button
            onClick={handleCollapse}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground border transition-colors"
          >
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}