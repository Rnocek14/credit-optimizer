import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MinimapSkill {
  id: string;
  name: string;
  category: string;
  position: { x: number; y: number };
  status: 'locked' | 'available' | 'in_progress' | 'completed';
}

interface SkillTreeMinimapProps {
  skills: MinimapSkill[];
  selectedSkillId?: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  containerDimensions: { width: number; height: number };
  skillTreeBounds: { minX: number; maxX: number; minY: number; maxY: number };
  onZoomToSkill: (skillId: string) => void;
  onViewportChange: (zoom: number, pan: { x: number; y: number }) => void;
  className?: string;
}

const MINIMAP_SIZE = { width: 200, height: 150 };
const CLUSTER_RADIUS = 12;
const DOT_SIZE = 3;

export const SkillTreeMinimap: React.FC<SkillTreeMinimapProps> = ({
  skills,
  selectedSkillId,
  zoomLevel,
  panOffset,
  containerDimensions,
  skillTreeBounds,
  onZoomToSkill,
  onViewportChange,
  className
}) => {
  // Calculate scale factor to fit skill tree in minimap
  const scaleFactor = useMemo(() => {
    const treeWidth = skillTreeBounds.maxX - skillTreeBounds.minX;
    const treeHeight = skillTreeBounds.maxY - skillTreeBounds.minY;
    return Math.min(
      (MINIMAP_SIZE.width - 20) / Math.max(treeWidth, 1),
      (MINIMAP_SIZE.height - 20) / Math.max(treeHeight, 1)
    );
  }, [skillTreeBounds]);

  // Create skill clusters for better visualization
  const skillClusters = useMemo(() => {
    const clusters = new Map<string, { skills: MinimapSkill[]; center: { x: number; y: number } }>();
    
    skills.forEach(skill => {
      if (!clusters.has(skill.category)) {
        clusters.set(skill.category, { skills: [], center: { x: 0, y: 0 } });
      }
      clusters.get(skill.category)!.skills.push(skill);
    });

    // Calculate cluster centers and create summary dots
    clusters.forEach((cluster, category) => {
      const avgX = cluster.skills.reduce((sum, s) => sum + s.position.x, 0) / cluster.skills.length;
      const avgY = cluster.skills.reduce((sum, s) => sum + s.position.y, 0) / cluster.skills.length;
      cluster.center = { x: avgX, y: avgY };
    });

    return Array.from(clusters.entries()).map(([category, cluster]) => ({
      category,
      skills: cluster.skills,
      center: cluster.center,
      completedCount: cluster.skills.filter(s => s.status === 'completed').length,
      totalCount: cluster.skills.length
    }));
  }, [skills]);

  // Convert skill position to minimap coordinates
  const skillToMinimapPos = useCallback((skill: MinimapSkill) => {
    const x = (skill.position.x - skillTreeBounds.minX) * scaleFactor + 10;
    const y = (skill.position.y - skillTreeBounds.minY) * scaleFactor + 10;
    return { x, y };
  }, [scaleFactor, skillTreeBounds]);

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    const viewWidth = containerDimensions.width / zoomLevel;
    const viewHeight = containerDimensions.height / zoomLevel;
    
    const x = (-panOffset.x - skillTreeBounds.minX) * scaleFactor + 10;
    const y = (-panOffset.y - skillTreeBounds.minY) * scaleFactor + 10;
    const width = viewWidth * scaleFactor;
    const height = viewHeight * scaleFactor;
    
    return { x, y, width, height };
  }, [panOffset, zoomLevel, containerDimensions, scaleFactor, skillTreeBounds]);

  const handleMinimapClick = useCallback((event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left - 10;
    const clickY = event.clientY - rect.top - 10;
    
    // Convert minimap coordinates back to skill tree coordinates
    const treeX = (clickX / scaleFactor) + skillTreeBounds.minX;
    const treeY = (clickY / scaleFactor) + skillTreeBounds.minY;
    
    // Find closest skill to click
    let closestSkill: MinimapSkill | null = null;
    let closestDistance = Infinity;
    
    skills.forEach(skill => {
      const distance = Math.sqrt(
        Math.pow(skill.position.x - treeX, 2) + Math.pow(skill.position.y - treeY, 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSkill = skill;
      }
    });
    
    if (closestSkill && closestDistance < 100) {
      onZoomToSkill(closestSkill.id);
    }
  }, [scaleFactor, skillTreeBounds, skills, onZoomToSkill]);

  const getSkillColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'hsl(var(--success))';
      case 'in_progress': return 'hsl(var(--warning))';
      case 'available': return 'hsl(var(--primary))';
      default: return 'hsl(var(--muted))';
    }
  }, []);

  const getCategoryColor = useCallback((category: string) => {
    const colors = {
      'Frontend': 'hsl(210, 70%, 60%)',
      'Backend': 'hsl(120, 60%, 50%)',
      'Data Science': 'hsl(280, 60%, 60%)',
      'DevOps': 'hsl(30, 70%, 55%)',
      'Mobile': 'hsl(340, 60%, 60%)',
    };
    return colors[category as keyof typeof colors] || 'hsl(var(--muted-foreground))';
  }, []);

  return (
    <div className={cn(
      "fixed top-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg z-40",
      "transition-all duration-200 hover:bg-background/98",
      className
    )}>
      <div className="text-xs font-medium text-muted-foreground mb-2">Skill Tree Overview</div>
      
      <svg
        width={MINIMAP_SIZE.width}
        height={MINIMAP_SIZE.height}
        className="border border-border rounded cursor-pointer bg-muted/20"
        onClick={handleMinimapClick}
      >
        {/* Skill clusters as summary dots */}
        {skillClusters.map(cluster => {
          const pos = skillToMinimapPos({ 
            id: '', 
            name: '', 
            category: cluster.category, 
            position: cluster.center, 
            status: 'available' 
          });
          const completionRatio = cluster.completedCount / cluster.totalCount;
          
          return (
            <g key={cluster.category}>
              {/* Cluster background circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={CLUSTER_RADIUS}
                fill={getCategoryColor(cluster.category)}
                fillOpacity={0.2}
                stroke={getCategoryColor(cluster.category)}
                strokeWidth={1}
                strokeOpacity={0.5}
              />
              
              {/* Progress arc */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={CLUSTER_RADIUS - 2}
                fill="none"
                stroke={getCategoryColor(cluster.category)}
                strokeWidth={2}
                strokeDasharray={`${completionRatio * 2 * Math.PI * (CLUSTER_RADIUS - 2)} ${2 * Math.PI * (CLUSTER_RADIUS - 2)}`}
                strokeDashoffset={-Math.PI * (CLUSTER_RADIUS - 2) / 2}
                transform={`rotate(-90 ${pos.x} ${pos.y})`}
                opacity={0.8}
              />
              
              {/* Completion count text */}
              <text
                x={pos.x}
                y={pos.y + 2}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                className="text-foreground font-medium"
              >
                {cluster.completedCount}/{cluster.totalCount}
              </text>
            </g>
          );
        })}

        {/* Individual skills as dots (only for selected or important skills) */}
        {skills
          .filter(skill => skill.id === selectedSkillId || skill.status === 'in_progress')
          .map(skill => {
            const pos = skillToMinimapPos(skill);
            return (
              <circle
                key={skill.id}
                cx={pos.x}
                cy={pos.y}
                r={skill.id === selectedSkillId ? DOT_SIZE + 1 : DOT_SIZE}
                fill={getSkillColor(skill.status)}
                stroke={skill.id === selectedSkillId ? 'hsl(var(--ring))' : 'none'}
                strokeWidth={skill.id === selectedSkillId ? 2 : 0}
                className="transition-all duration-200"
              />
            );
          })}

        {/* Viewport rectangle */}
        <rect
          x={Math.max(0, Math.min(viewportRect.x, MINIMAP_SIZE.width))}
          y={Math.max(0, Math.min(viewportRect.y, MINIMAP_SIZE.height))}
          width={Math.min(viewportRect.width, MINIMAP_SIZE.width - Math.max(0, viewportRect.x))}
          height={Math.min(viewportRect.height, MINIMAP_SIZE.height - Math.max(0, viewportRect.y))}
          fill="none"
          stroke="hsl(var(--ring))"
          strokeWidth={2}
          strokeDasharray="4,2"
          className="animate-pulse"
        />
      </svg>

      {/* Legend */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-success"></div>
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-warning"></div>
          <span className="text-muted-foreground">In Progress</span>
        </div>
      </div>
    </div>
  );
};