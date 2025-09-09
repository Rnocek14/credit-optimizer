import React from 'react';

interface LaneRailsProps {
  visible: boolean;
}

export function LaneRails({ visible }: LaneRailsProps) {
  if (!visible) return null;

  const years = [1, 2, 3, 4];
  const columnWidth = 320;

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {/* Vertical rails for each year */}
      {years.map((year) => {
        const x = year * columnWidth;
        return (
          <div
            key={year}
            className="absolute top-0 bottom-0 w-px bg-border/20"
            style={{ left: x - columnWidth / 2 }}
          />
        );
      })}
      
      {/* Year labels */}
      <div className="sticky top-4 left-0 z-10">
        {years.map((year) => {
          const x = year * columnWidth;
          return (
            <div
              key={`label-${year}`}
              className="absolute bg-background/80 backdrop-blur px-2 py-1 rounded text-xs font-medium text-muted-foreground"
              style={{ left: x - columnWidth / 2 - 20, top: 0 }}
            >
              Year {year}
            </div>
          );
        })}
      </div>
    </div>
  );
}