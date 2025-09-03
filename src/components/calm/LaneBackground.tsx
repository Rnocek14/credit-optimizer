// Lane Background: Semantic columns for skill tree organization
import React from 'react';
import { Card } from '@/components/ui/card';

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
          className="absolute top-0"
          style={{
            left: lane.x,
            width: lane.width,
            height: height,
            background: `linear-gradient(180deg, ${lane.color}08 0%, ${lane.color}04 100%)`,
            borderLeft: `1px solid ${lane.color}20`,
            borderRight: `1px solid ${lane.color}20`
          }}
        >
          {/* Lane Header */}
          <div 
            className="sticky top-4 left-4 z-10"
            style={{ marginLeft: 16, marginTop: 16 }}
          >
            <Card className="px-3 py-1.5 bg-background/90 backdrop-blur-sm border">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: lane.color }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {lane.title}
                </span>
              </div>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
};

// Lane configuration
export const CALM_LANES = [
  {
    id: 'foundations',
    title: 'Foundations',
    color: 'hsl(210, 40%, 60%)', // Blue
    x: 100,
    width: 320
  },
  {
    id: 'skills',
    title: 'Core Skills', 
    color: 'hsl(142, 40%, 60%)', // Green
    x: 420,
    width: 320
  },
  {
    id: 'projects',
    title: 'Projects',
    color: 'hsl(43, 40%, 60%)', // Yellow
    x: 740,
    width: 320
  },
  {
    id: 'credentials',
    title: 'Credentials',
    color: 'hsl(271, 40%, 60%)', // Purple
    x: 1060,
    width: 320
  },
  {
    id: 'jobs',
    title: 'Jobs',
    color: 'hsl(25, 40%, 60%)', // Orange
    x: 1380,
    width: 320
  }
];