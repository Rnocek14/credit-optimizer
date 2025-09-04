import React from 'react';

interface InstitutionLaneProps {
  id: string;
  title: string;
  color: string;
  x: number;
  width: number;
  height: number;
  isOrphan?: boolean;
}

export function InstitutionLane({ 
  id, 
  title, 
  color, 
  x, 
  width, 
  height, 
  isOrphan = false 
}: InstitutionLaneProps) {
  return (
    <div
      className="absolute top-0 bottom-0 border-r border-dashed border-border/30"
      style={{
        left: x,
        width: width,
        backgroundColor: `${color}08`
      }}
    >
      <div 
        className="absolute top-4 left-4 text-xs font-medium text-muted-foreground uppercase tracking-wide"
        style={{ color: color }}
      >
        <div>{title}</div>
        {isOrphan && (
          <div className="text-xs font-normal normal-case opacity-75 mt-1">
            Independent
          </div>
        )}
      </div>
    </div>
  );
}