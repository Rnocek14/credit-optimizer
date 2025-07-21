import React, { useMemo, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SkillTreeMinimapProps {
  skills: Array<{ id: string; name: string; category: string }>;
  skillPositions: Map<string, { x: number; y: number }>;
  userProgress: Array<{ skill_id: string; status: string }>;
  goalSkills: string[];
  checkpointSkills: string[];
  recommendedSkills: string[];
  currentViewport: {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
  };
  onViewportChange: (x: number, y: number) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const SkillTreeMinimap: React.FC<SkillTreeMinimapProps> = ({
  skills,
  skillPositions,
  userProgress,
  goalSkills,
  checkpointSkills,
  recommendedSkills,
  currentViewport,
  onViewportChange,
  className,
  isExpanded = false,
  onToggleExpanded
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapSize = isExpanded ? 240 : 120;
  const scale = 0.08;

  // Calculate minimap bounds
  const bounds = useMemo(() => {
    if (skillPositions.size === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 800 };
    
    const positions = Array.from(skillPositions.values());
    return {
      minX: Math.min(...positions.map(p => p.x)) - 50,
      maxX: Math.max(...positions.map(p => p.x)) + 150,
      minY: Math.min(...positions.map(p => p.y)) - 50,
      maxY: Math.max(...positions.map(p => p.y)) + 100
    };
  }, [skillPositions]);

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  
  // Scale to fit minimap
  const scaleX = minimapSize / contentWidth;
  const scaleY = minimapSize / contentHeight;
  const minimapScale = Math.min(scaleX, scaleY, scale);

  const handleMinimapClick = (e: React.MouseEvent) => {
    if (!minimapRef.current) return;
    
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert minimap coordinates to world coordinates
    const worldX = (clickX / minimapScale) + bounds.minX;
    const worldY = (clickY / minimapScale) + bounds.minY;
    
    // Center the viewport on this position
    const newPanX = currentViewport.width / 2 - worldX * currentViewport.zoom;
    const newPanY = currentViewport.height / 2 - worldY * currentViewport.zoom;
    
    onViewportChange(newPanX, newPanY);
  };

  const getSkillStatus = (skillId: string) => {
    const progress = userProgress.find(p => p.skill_id === skillId);
    return progress?.status || 'locked';
  };

  const getSkillColor = (skill: any) => {
    const status = getSkillStatus(skill.id);
    
    if (checkpointSkills.includes(skill.id)) return '#a855f7'; // Purple for checkpoints
    if (goalSkills.includes(skill.id)) return '#eab308'; // Yellow for goals
    if (recommendedSkills.includes(skill.id)) return '#f97316'; // Orange for recommended
    
    switch (status) {
      case 'completed': return '#22c55e'; // Green
      case 'in_progress': return '#3b82f6'; // Blue
      case 'available': return '#6b7280'; // Gray
      default: return '#d1d5db'; // Light gray for locked
    }
  };

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    const worldViewX = (-currentViewport.x / currentViewport.zoom) - bounds.minX;
    const worldViewY = (-currentViewport.y / currentViewport.zoom) - bounds.minY;
    const worldViewWidth = currentViewport.width / currentViewport.zoom;
    const worldViewHeight = currentViewport.height / currentViewport.zoom;
    
    return {
      x: worldViewX * minimapScale,
      y: worldViewY * minimapScale,
      width: worldViewWidth * minimapScale,
      height: worldViewHeight * minimapScale
    };
  }, [currentViewport, bounds, minimapScale]);

  return (
    <div className={cn(
      "fixed top-4 right-4 z-40 bg-card/90 backdrop-blur-md border border-border/50 rounded-lg shadow-lg transition-all duration-300",
      isExpanded ? "p-4" : "p-2",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <Navigation className="h-3 w-3 text-primary" />
          {isExpanded && (
            <span className="text-xs font-medium text-foreground">Map</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Minimap Canvas */}
      <div
        ref={minimapRef}
        className="relative bg-muted/30 rounded border border-border/30 cursor-pointer overflow-hidden"
        style={{
          width: minimapSize,
          height: minimapSize
        }}
        onClick={handleMinimapClick}
      >
        {/* Skill Nodes */}
        <svg
          width={minimapSize}
          height={minimapSize}
          className="absolute inset-0"
        >
          {skills.map(skill => {
            const position = skillPositions.get(skill.id);
            if (!position) return null;
            
            const x = (position.x - bounds.minX) * minimapScale;
            const y = (position.y - bounds.minY) * minimapScale;
            const size = checkpointSkills.includes(skill.id) ? 6 : 4;
            
            return (
              <circle
                key={skill.id}
                cx={x + size/2}
                cy={y + size/2}
                r={size/2}
                fill={getSkillColor(skill)}
                stroke={goalSkills.includes(skill.id) ? '#fbbf24' : 'none'}
                strokeWidth={goalSkills.includes(skill.id) ? 1 : 0}
                className="transition-colors"
              />
            );
          })}
        </svg>

        {/* Viewport Rectangle */}
        <div
          className="absolute border-2 border-primary/70 bg-primary/10 rounded"
          style={{
            left: Math.max(0, Math.min(viewportRect.x, minimapSize - viewportRect.width)),
            top: Math.max(0, Math.min(viewportRect.y, minimapSize - viewportRect.height)),
            width: Math.min(viewportRect.width, minimapSize),
            height: Math.min(viewportRect.height, minimapSize)
          }}
        />
      </div>

      {/* Legend (only when expanded) */}
      {isExpanded && (
        <div className="mt-2 space-y-1">
          <div className="text-xs font-medium text-foreground mb-1">Legend</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-muted-foreground">Done</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-muted-foreground">Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full border border-yellow-600" />
              <span className="text-muted-foreground">Goal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-muted-foreground">Milestone</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};