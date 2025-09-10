import React from 'react';

export interface EduLaneBackgroundProps {
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

export const EduLaneBackground: React.FC<EduLaneBackgroundProps> = ({
  lanes,
  height
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {lanes.map((lane, index) => (
        <div
          key={lane.id}
          className="absolute top-0 bottom-0 border-r border-dashed border-muted-foreground/20"
          style={{
            left: lane.x,
            width: lane.width,
            backgroundColor: index % 2 === 0 ? 'transparent' : 'hsl(var(--muted)/0.02)'
          }}
        >
          <div 
            className="absolute top-4 left-4 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            style={{ color: lane.color }}
          >
            <div className="font-semibold">{lane.title}</div>
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

// Educational progression lanes based on academic years
export const EDU_YEAR_LANES = [
  {
    id: 'year-1',
    title: 'Year 1',
    subtitle: 'Foundations • 0-30 Credits',
    color: 'hsl(var(--primary))',
    x: 0,
    width: 400
  },
  {
    id: 'year-2', 
    title: 'Year 2',
    subtitle: 'Lower Division • 30-60 Credits',
    color: 'hsl(var(--secondary))',
    x: 400,
    width: 400
  },
  {
    id: 'year-3',
    title: 'Year 3',
    subtitle: 'Upper Division • 60-90 Credits',
    color: 'hsl(var(--accent))',
    x: 800,
    width: 400
  },
  {
    id: 'year-4',
    title: 'Year 4',
    subtitle: 'Specialization • 90-120 Credits',
    color: 'hsl(var(--muted-foreground))',
    x: 1200,
    width: 400
  }
];