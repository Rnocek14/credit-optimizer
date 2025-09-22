/**
 * Legend component for dual selection (compare-any) mode
 * Shows primary, secondary, and shared selection indicators
 */

import React from 'react';
import { usePathHighlight } from '../ctx/PathHighlightContext';

export function DualSelectionLegend() {
  const { primarySelection, secondarySelection } = usePathHighlight();
  
  // Only show when we have dual selections
  if (!primarySelection && !secondarySelection) {
    return null;
  }

  return (
    <div className="absolute top-20 left-4 z-40 bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-sm">
      <div className="font-semibold mb-2">Active Comparison</div>
      
      {primarySelection && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 border-2 rounded" style={{ borderColor: 'hsl(var(--lp-primary))' }} />
          <span className="text-xs">
            Primary: {primarySelection.kind === 'program' ? 'Program' : 'Track'} {primarySelection.id.toUpperCase()}
          </span>
        </div>
      )}
      
      {secondarySelection && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 border-2 rounded border-dashed" style={{ borderColor: 'hsl(var(--lp-compare))' }} />
          <span className="text-xs">
            Compare: {secondarySelection.kind === 'program' ? 'Program' : 'Track'} {secondarySelection.id.toUpperCase()}
          </span>
        </div>
      )}
      
      {primarySelection && secondarySelection && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-4 rounded" style={{ borderColor: 'hsl(var(--lp-shared))' }} />
          <span className="text-xs">Shared Requirements</span>
        </div>
      )}
    </div>
  );
}