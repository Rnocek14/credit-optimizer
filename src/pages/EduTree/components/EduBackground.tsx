import React from 'react';

interface EduBackgroundProps {
  width: number;
  height: number;
}

export function EduBackground({ width, height }: EduBackgroundProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Core Years Background Zone */}
      <div 
        className="absolute top-0 bg-gradient-to-r from-background via-muted/20 to-muted/40 border-r border-dashed border-border/30"
        style={{
          left: 0,
          width: 3.5 * 450, // Up to transition point
          height: '100%'
        }}
      >
        <div className="absolute top-8 left-8">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Core Curriculum
          </div>
          <div className="text-xs text-muted-foreground/70 mt-1">
            Years 1-3 • Foundation & Requirements
          </div>
        </div>
      </div>

      {/* Transition Zone */}
      <div 
        className="absolute top-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
        style={{
          left: 3.3 * 450,
          width: 0.4 * 450,
          height: '100%'
        }}
      >
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <div className="text-sm font-medium text-primary uppercase tracking-wide text-center">
            Decision Point
          </div>
        </div>
      </div>

      {/* Specialization Zone */}
      <div 
        className="absolute top-0 bg-gradient-to-r from-accent/10 via-accent/20 to-accent/10"
        style={{
          left: 3.7 * 450,
          width: width - 3.7 * 450,
          height: '100%'
        }}
      >
        <div className="absolute top-8 left-8">
          <div className="text-sm font-medium text-accent-foreground uppercase tracking-wide">
            Specialization Tracks
          </div>
          <div className="text-xs text-accent-foreground/70 mt-1">
            Year 4+ • Choose Your Path
          </div>
        </div>
      </div>

      {/* Year Markers */}
      {[1, 2, 3, 4].map((year) => (
        <div
          key={year}
          className="absolute top-0 border-l border-dashed border-border/20"
          style={{
            left: year * 450,
            height: '100%'
          }}
        >
          <div className="absolute -top-2 -left-6 bg-background px-2 py-1 rounded text-xs font-medium text-muted-foreground border">
            Year {year}
          </div>
        </div>
      ))}

      {/* Flow Path Indicators */}
      <svg 
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      >
        <defs>
          <marker
            id="flow-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
            fill="hsl(var(--primary))"
            opacity="0.3"
          >
            <polygon points="0 0, 8 3, 0 6" />
          </marker>
        </defs>
        
        {/* Subtle flow indicators */}
        <path
          d={`M ${1.5 * 450} 200 Q ${2.5 * 450} 180 ${3.5 * 450} 200`}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          fill="none"
          opacity="0.2"
          strokeDasharray="5,5"
          markerEnd="url(#flow-arrow)"
        />
        <path
          d={`M ${3.7 * 450} 300 Q ${4.2 * 450} 200 ${4.5 * 450} 150`}
          stroke="hsl(var(--accent))"
          strokeWidth="2"
          fill="none"
          opacity="0.2"
          strokeDasharray="5,5"
        />
        <path
          d={`M ${3.7 * 450} 300 Q ${4.2 * 450} 400 ${4.5 * 450} 600`}
          stroke="hsl(var(--accent))"
          strokeWidth="2"
          fill="none"
          opacity="0.2"
          strokeDasharray="5,5"
        />
      </svg>
    </div>
  );
}