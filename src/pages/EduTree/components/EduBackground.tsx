import React from 'react';

interface EduBackgroundProps {
  width: number;
  height: number;
  nodes?: Array<{ position: { x: number; y: number }; data: { level_year?: number } }>;
}

export function EduBackground({ width, height, nodes = [] }: EduBackgroundProps) {
  // Calculate actual node positions for dynamic background alignment
  const yearPositions = nodes.reduce((acc, node) => {
    const year = node.data.level_year;
    if (year && year >= 1 && year <= 4) {
      if (!acc[year]) acc[year] = [];
      acc[year].push(node.position.x);
    }
    return acc;
  }, {} as Record<number, number[]>);

  // Calculate average positions for each year, fallback to standard spacing
  const getYearPosition = (year: number) => {
    const positions = yearPositions[year];
    return positions && positions.length > 0 
      ? positions.reduce((sum, x) => sum + x, 0) / positions.length
      : year * 450; // fallback to standard spacing
  };

  const year3Pos = getYearPosition(3);
  const transitionPos = year3Pos + 200;
  const specializationPos = transitionPos + 100;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Core Years Background Zone - Dynamic width based on actual Year 3 position */}
      <div 
        className="absolute top-0 bg-gradient-to-r from-background via-muted/20 to-muted/40 border-r border-dashed border-border/30"
        style={{
          left: 0,
          width: transitionPos,
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

      {/* Transition Zone - Positioned relative to actual transition block */}
      <div 
        className="absolute top-0 bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 border-x border-dashed border-primary/30"
        style={{
          left: transitionPos - 50,
          width: 150,
          height: '100%'
        }}
      >
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <div className="text-sm font-medium text-primary uppercase tracking-wide text-center">
            Decision Point
          </div>
        </div>
      </div>

      {/* Specialization Zone - Dynamic positioning */}
      <div 
        className="absolute top-0 bg-gradient-to-r from-accent/10 via-accent/20 to-accent/10"
        style={{
          left: specializationPos,
          width: width - specializationPos,
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

      {/* Dynamic Year Markers - Aligned with actual node positions */}
      {[1, 2, 3, 4].map((year) => {
        const yearPos = getYearPosition(year);
        return (
          <div
            key={year}
            className="absolute top-0 border-l border-dashed border-border/20"
            style={{
              left: yearPos,
              height: '100%'
            }}
          >
            <div className="absolute -top-2 -left-6 bg-background px-2 py-1 rounded text-xs font-medium text-muted-foreground border">
              Year {year}
            </div>
          </div>
        );
      })}

      {/* Enhanced Flow Path Indicators - Curved paths between actual positions */}
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
            opacity="0.4"
          >
            <polygon points="0 0, 8 3, 0 6" />
          </marker>
          <marker
            id="specialization-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
            fill="hsl(var(--accent))"
            opacity="0.4"
          >
            <polygon points="0 0, 8 3, 0 6" />
          </marker>
        </defs>
        
        {/* Progressive flow from Year 1-3 */}
        <path
          d={`M ${getYearPosition(1) + 100} 200 Q ${getYearPosition(2)} 180 ${getYearPosition(3) - 50} 200`}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
          strokeDasharray="8,4"
          markerEnd="url(#flow-arrow)"
        />
        
        {/* Transition to specializations */}
        <path
          d={`M ${transitionPos} 180 Q ${specializationPos - 50} 150 ${specializationPos + 50} 120`}
          stroke="hsl(var(--accent))"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
          strokeDasharray="8,4"
          markerEnd="url(#specialization-arrow)"
        />
        <path
          d={`M ${transitionPos} 220 Q ${specializationPos - 50} 250 ${specializationPos + 50} 280`}
          stroke="hsl(var(--accent))"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
          strokeDasharray="8,4"
          markerEnd="url(#specialization-arrow)"
        />
      </svg>
    </div>
  );
}