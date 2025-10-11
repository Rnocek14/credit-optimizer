import React from 'react';
import { validateNoOverlaps } from '../engine/overlapValidator';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

interface DevToolbarProps {
  nodes: V3Node[];
  checkpointsEnabled?: boolean;
  onToggleCheckpoints?: () => void;
  useVerticalLayout?: boolean;
  useLifePathSource?: boolean;
  onToggleDataSource?: () => void;
}

export function DevToolbar({ nodes, checkpointsEnabled = false, onToggleCheckpoints, useVerticalLayout = false, useLifePathSource = false, onToggleDataSource }: DevToolbarProps) {
  const onValidate = () => {
    const res = validateNoOverlaps(nodes, LAYOUT_TOKENS);
    alert(res.hasOverlaps ? `Overlaps: ${res.overlaps.length}` : 'No overlaps ✅');
  };
  
  const checkpointCount = nodes.filter(n => n.type === 'checkpoint').length;
  
  return (
    <div className="fixed top-2 left-2 z-50 rounded bg-black/80 text-white px-3 py-2 text-sm flex gap-3 items-center">
      <button onClick={onValidate} className="underline hover:no-underline">
        Validate Overlaps
      </button>
      
      {/* Data Source Toggle */}
      {onToggleDataSource && (
        <button 
          onClick={onToggleDataSource}
          className={`px-2 py-1 rounded transition-colors ${
            useLifePathSource 
              ? 'bg-purple-600/80 hover:bg-purple-600' 
              : 'bg-gray-600/80 hover:bg-gray-600'
          }`}
        >
          Data: {useLifePathSource ? 'LifePath' : 'Seed'}
        </button>
      )}
      
      {/* Phase 3B: Hide toggle in vertical mode */}
      {onToggleCheckpoints && !useVerticalLayout && (
        <button 
          onClick={onToggleCheckpoints}
          className={`px-2 py-1 rounded transition-colors ${
            checkpointsEnabled 
              ? 'bg-green-600/80 hover:bg-green-600' 
              : 'bg-gray-600/80 hover:bg-gray-600'
          }`}
        >
          Checkpoints {checkpointsEnabled ? 'ON' : 'OFF'}
          {checkpointsEnabled && checkpointCount > 0 && (
            <span className="ml-1 text-xs opacity-75">({checkpointCount})</span>
          )}
        </button>
      )}
      
      {useVerticalLayout && (
        <div className="text-xs text-gray-300 px-2 py-1 bg-blue-600/20 rounded border border-blue-500/30">
          ℹ️ Checkpoints always enabled in vertical mode
        </div>
      )}
    </div>
  );
}
