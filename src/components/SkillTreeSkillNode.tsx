import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Clock, CheckCircle, Circle, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillTreeSkillNodeData {
  name: string;
  category: string;
  description: string;
  isCompleted: boolean;
  isLocked: boolean;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedWeeks: string;
  trackCategory: string;
  isFoundational: boolean;
  categoryColor?: string;
}

interface SkillTreeSkillNodeProps {
  data: SkillTreeSkillNodeData;
}

export const SkillTreeSkillNode: React.FC<SkillTreeSkillNodeProps> = memo(({ data }) => {
  const { 
    name, 
    category, 
    isCompleted, 
    isLocked, 
    difficultyLevel, 
    estimatedWeeks, 
    trackCategory,
    isFoundational,
    categoryColor = '#3B82F6'
  } = data;

  const StatusIcon = isCompleted ? CheckCircle : isLocked ? Lock : Circle;
  const statusColor = isCompleted ? 'text-green-500' : isLocked ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2"
        style={{ background: categoryColor }}
      />
      
      <Card className={cn(
        "w-36 border transition-colors",
        isCompleted && "border-green-500 bg-green-50",
        isFoundational && "ring-1 ring-blue-300",
        !isCompleted && "border-gray-200 hover:border-gray-400"
      )}>
        <CardContent className="p-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <StatusIcon className={cn("w-3 h-3", statusColor)} />
            {isFoundational && <Star className="w-3 h-3 text-blue-500" />}
          </div>
          
          {/* Skill name */}
          <h3 className="font-medium text-xs mb-2 line-clamp-2">
            {name}
          </h3>
          
          {/* Category and time */}
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium" style={{ color: categoryColor }}>
              {trackCategory}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{estimatedWeeks}</span>
            </div>
            
            <span className={cn(
              "px-1 py-0.5 rounded text-xs",
              difficultyLevel === 'advanced' ? 'bg-red-100 text-red-800' :
              difficultyLevel === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            )}>
              {difficultyLevel}
            </span>
          </div>
          
          {/* Progress indicator */}
          {isCompleted && (
            <div className="mt-1 w-full bg-gray-200 rounded-full h-0.5">
              <div className="bg-green-500 h-0.5 rounded-full w-full" />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2"
        style={{ background: categoryColor }}
      />
    </div>
  );
});

SkillTreeSkillNode.displayName = 'SkillTreeSkillNode';