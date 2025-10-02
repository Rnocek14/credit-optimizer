/**
 * Tree Skeleton - Maintains column structure during index build
 * Prevents layout collapse while waiting for INDEX_READY
 */

import React from 'react';
import { laneXs } from '../utils/layoutTokens';

export const TreeSkeleton: React.FC = () => {
  const lanes = laneXs();
  const columns = [
    { x: lanes.y1, label: 'Year 1' },
    { x: lanes.gatePG, label: 'Programs' },
    { x: lanes.y2, label: 'Year 2' },
    { x: lanes.gateTG, label: 'Tracks' },
    { x: lanes.y3L, label: 'Year 3' },
    { x: lanes.y4L, label: 'Year 4' },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
      <div className="relative w-full h-full">
        {columns.map(col => (
          <div
            key={col.x}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center gap-4 opacity-40"
            style={{ left: col.x, width: 200, transform: 'translateX(-50%)' }}
          >
            <div className="text-xs text-muted-foreground">{col.label}</div>
            <div className="w-32 h-20 rounded-lg border border-dashed border-border animate-pulse" />
            <div className="w-32 h-20 rounded-lg border border-dashed border-border animate-pulse" />
            <div className="w-32 h-20 rounded-lg border border-dashed border-border animate-pulse" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Building index...</div>
        </div>
      </div>
    </div>
  );
};
