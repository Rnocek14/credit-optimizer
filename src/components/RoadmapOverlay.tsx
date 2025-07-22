import React from 'react';
import { Button } from '@/components/ui/button';
import { Route, Eye, EyeOff } from 'lucide-react';

interface RoadmapStep {
  title: string;
  order_index: number;
  is_checkpoint: boolean;
  is_capstone: boolean;
}

interface RoadmapStepSkill {
  skill_id: string;
  roadmap_step_id: string;
  roadmap_steps: RoadmapStep;
}

interface RoadmapOverlayProps {
  roadmapStepSkills: RoadmapStepSkill[];
  skillPositions: Map<string, { x: number; y: number }>;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  showOverlay: boolean;
  onToggleOverlay: () => void;
}

export const RoadmapOverlay: React.FC<RoadmapOverlayProps> = ({
  roadmapStepSkills,
  skillPositions,
  zoomLevel,
  panOffset,
  showOverlay,
  onToggleOverlay
}) => {
  // Group skills by roadmap step
  const stepGroups = React.useMemo(() => {
    const groups = new Map<number, {
      step: RoadmapStep;
      skillIds: string[];
      positions: { x: number; y: number }[];
    }>();

    roadmapStepSkills.forEach(({ skill_id, roadmap_steps }) => {
      const orderIndex = roadmap_steps.order_index;
      
      if (!groups.has(orderIndex)) {
        groups.set(orderIndex, {
          step: roadmap_steps,
          skillIds: [],
          positions: []
        });
      }

      const group = groups.get(orderIndex)!;
      group.skillIds.push(skill_id);
      
      const position = skillPositions.get(skill_id);
      if (position) {
        group.positions.push(position);
      }
    });

    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [roadmapStepSkills, skillPositions]);

  // Calculate bounding boxes for each step
  const stepBounds = React.useMemo(() => {
    return stepGroups.map(([orderIndex, group]) => {
      if (group.positions.length === 0) return null;

      const xs = group.positions.map(p => p.x);
      const ys = group.positions.map(p => p.y);
      
      const minX = Math.min(...xs) - 20;
      const maxX = Math.max(...xs) + 140; // Account for node width
      const minY = Math.min(...ys) - 20;
      const maxY = Math.max(...ys) + 100; // Account for node height
      
      return {
        orderIndex,
        step: group.step,
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY
      };
    }).filter(Boolean);
  }, [stepGroups]);

  if (!showOverlay || stepBounds.length === 0) {
    return (
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleOverlay}
          className="flex items-center gap-2"
        >
          {showOverlay ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          Roadmap
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Toggle Button */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleOverlay}
          className="flex items-center gap-2"
        >
          <EyeOff className="w-4 h-4" />
          Hide Roadmap
        </Button>
      </div>

      {/* Roadmap Step Overlays */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
        }}
      >
        {stepBounds.map((bound) => {
          if (!bound) return null;

          const { orderIndex, step, minX, minY, width, height } = bound;
          
          // Determine color based on step type
          let strokeColor = 'hsl(var(--primary))';
          let fillColor = 'hsl(var(--primary) / 0.1)';
          
          if (step.is_checkpoint) {
            strokeColor = 'hsl(var(--warning))';
            fillColor = 'hsl(var(--warning) / 0.1)';
          } else if (step.is_capstone) {
            strokeColor = 'hsl(var(--success))';
            fillColor = 'hsl(var(--success) / 0.1)';
          }

          return (
            <g key={orderIndex}>
              {/* Step boundary */}
              <rect
                x={minX}
                y={minY}
                width={width}
                height={height}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
                strokeDasharray="5,5"
                rx="8"
                className="animate-pulse"
                style={{ animationDuration: '3s' }}
              />
              
              {/* Step label */}
              <foreignObject
                x={minX}
                y={minY - 40}
                width={Math.max(width, 200)}
                height="35"
                className="overflow-visible"
              >
                <div className="pointer-events-auto">
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium shadow-sm"
                    style={{
                      backgroundColor: fillColor,
                      borderColor: strokeColor,
                      color: strokeColor
                    }}
                  >
                    <Route className="w-4 h-4" />
                    <span>Step {orderIndex}: {step.title}</span>
                    {step.is_checkpoint && <span className="text-xs bg-warning/20 px-1 rounded">Checkpoint</span>}
                    {step.is_capstone && <span className="text-xs bg-success/20 px-1 rounded">Capstone</span>}
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};