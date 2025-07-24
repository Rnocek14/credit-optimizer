import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ClusterNodeData {
  category: string;
  skillCount: number;
  completedCount: number;
  completionRate: number;
  color: string;
  icon: string;
  description: string;
  isExpanded: boolean;
  skills: any[];
  radius: number;
  level: number;
}

interface ClusterNodeProps {
  data: ClusterNodeData;
}

export const ClusterNode: React.FC<ClusterNodeProps> = memo(({ data }) => {
  const {
    category,
    skillCount,
    completedCount,
    completionRate,
    color,
    icon,
    description,
    isExpanded,
    radius
  } = data;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 border-2"
        style={{ borderColor: color }}
      />
      
      <div 
        className="relative flex items-center justify-center cursor-pointer group"
        style={{
          width: radius * 2,
          height: radius * 2,
          borderRadius: '50%',
        }}
      >
        {/* Cluster background with gradient */}
        <div 
          className="absolute inset-0 rounded-full transition-all duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${color}20, ${color}10)`,
            border: `3px solid ${color}`,
            boxShadow: `0 4px 20px ${color}30`
          }}
        />
        
        {/* Content container */}
        <div className="relative flex flex-col items-center justify-center text-center p-4 z-10">
          {/* Category icon */}
          <div className="text-3xl mb-2">
            {icon}
          </div>
          
          {/* Category name */}
          <h3 className="font-semibold text-sm mb-1" style={{ color }}>
            {category}
          </h3>
          
          {/* Skill count */}
          <div className="text-xs text-muted-foreground mb-2">
            {skillCount} skill{skillCount !== 1 ? 's' : ''}
          </div>
          
          {/* Progress indicator */}
          <div className="w-full max-w-16 mb-2">
            <Progress 
              value={completionRate * 100} 
              className="h-1"
            />
          </div>
          
          {/* Completion rate */}
          <div className="text-xs font-medium">
            {completedCount}/{skillCount}
          </div>
          
          {/* Expand/collapse indicator */}
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" style={{ color }} />
            ) : (
              <ChevronRight className="w-3 h-3" style={{ color }} />
            )}
          </div>
        </div>
        
        {/* Hover tooltip */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
          <Card className="p-2 max-w-48 text-xs bg-background/95 backdrop-blur-sm border">
            <p className="text-muted-foreground">{description}</p>
            {completionRate > 0 && (
              <p className="text-primary mt-1">
                {Math.round(completionRate * 100)}% completed
              </p>
            )}
          </Card>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 border-2"
        style={{ borderColor: color }}
      />
    </>
  );
});