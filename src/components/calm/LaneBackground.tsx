// Lane Background: Semantic columns for skill tree organization
import React from 'react';

export interface LaneBackgroundProps {
  lanes: Array<{
    id: string;
    title: string;
    color: string;
    x: number;
    width: number;
  }>;
  height: number;
}

export const LaneBackground: React.FC<LaneBackgroundProps> = ({
  lanes,
  height
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {lanes.map((lane) => (
        <div
          key={lane.id}
          className="absolute top-0 bottom-0 border-r border-dashed border-border/30"
          style={{
            left: lane.x,
            width: lane.width,
            backgroundColor: `${lane.color}08`
          }}
        >
          <div 
            className="absolute top-4 left-4 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            style={{ color: lane.color }}
          >
            {lane.title}
          </div>
        </div>
      ))}
    </div>
  );
};

// Define lane configuration
export const CALM_LANES = [
  {
    id: 'foundations',
    title: 'Foundations',
    color: 'hsl(var(--primary))',
    x: 100,
    width: 280
  },
  {
    id: 'skills',
    title: 'Skills',
    color: 'hsl(var(--secondary))',
    x: 380,
    width: 280
  },
  {
    id: 'projects',
    title: 'Projects',
    color: 'hsl(var(--accent))',
    x: 660,
    width: 280
  },
  {
    id: 'credentials',
    title: 'Credentials',
    color: 'hsl(var(--muted-foreground))',
    x: 940,
    width: 280
  },
  {
    id: 'jobs',
    title: 'Jobs',
    color: 'hsl(var(--destructive))',
    x: 1220,
    width: 280
  }
];