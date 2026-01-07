// Lane Background: Semantic columns for skill tree organization
import React from 'react';

export interface LaneBackgroundProps {
  lanes: Array<{
    id: string;
    title: string;
    subtitle?: string;
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
            <div>{lane.title}</div>
            {lane.subtitle && (
              <div className="text-xs font-normal normal-case opacity-75 mt-1">
                {lane.subtitle}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Define lane configuration with institution labels
export const CALM_LANES = [
  {
    id: 'foundations',
    title: 'FCC',
    subtitle: 'Community College',
    color: 'var(--primary)',
    x: 100,
    width: 280
  },
  {
    id: 'skills',
    title: 'Global/Orphan', 
    subtitle: 'Skills • Projects',
    color: 'var(--secondary)',
    x: 380,
    width: 280
  },
  {
    id: 'projects',
    title: 'FSU',
    subtitle: 'Universities',
    color: 'var(--accent)',
    x: 660,
    width: 280
  },
  {
    id: 'credentials',
    title: 'Credentials',
    subtitle: 'Degrees • Certs',
    color: 'var(--muted-foreground)',
    x: 940,
    width: 280
  },
  {
    id: 'jobs',
    title: 'Career Goals',
    subtitle: 'Jobs • Roles',
    color: 'var(--destructive)',
    x: 1220,
    width: 280
  }
];