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
      className="absolute top-0 bottom-0 pointer-events-none z-0"
      style={{
        left: x,
        width: width,
        height: height,
        backgroundColor: isOrphan 
          ? 'hsl(var(--muted) / 0.1)' 
          : `${color}08`
      }}
    >
      {/* Lane border */}
      <div 
        className={`absolute top-0 bottom-0 right-0 w-px ${
          isOrphan 
            ? 'bg-border/30 border-r border-dashed' 
            : 'border-r border-dashed border-border/30'
        }`} 
      />
      
      {/* Sticky header */}
      <div 
        className="sticky top-0 z-10 p-3 bg-background/80 backdrop-blur-sm border-b border-border/20"
        style={{
          borderColor: isOrphan ? 'hsl(var(--muted-foreground))' : color
        }}
      >
        <div 
          className="text-xs font-medium uppercase tracking-wide"
          style={{ 
            color: isOrphan ? 'hsl(var(--muted-foreground))' : color 
          }}
        >
          {title}
        </div>
        {isOrphan && (
          <div className="text-xs text-muted-foreground mt-1">
            Standalone Credentials
          </div>
        )}
      </div>
    </div>
  );
}