import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock, Target, Lock, CheckCircle, Circle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Skill {
  id: string;
  name: string;
  category: string;
  importance: number;
}

interface SkillTreeStepNodeData {
  title: string;
  description: string;
  level: number;
  isTerminal: boolean;
  estimatedDuration: string;
  estimatedWeeks: string;
  prerequisites: string[];
  skills: Skill[];
  isCompleted: boolean;
  isInProgress: boolean;
  isLocked: boolean;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  progress?: {
    completion_percentage?: number;
  };
}

interface SkillTreeStepNodeProps {
  data: SkillTreeStepNodeData;
}

export const SkillTreeStepNode: React.FC<SkillTreeStepNodeProps> = memo(({ data }) => {
  const {
    title,
    level,
    isTerminal,
    estimatedWeeks,
    skills = [],
    isCompleted,
    isInProgress,
    isLocked,
    difficultyLevel,
    progress
  } = data;

  // Simple status icon
  const StatusIcon = isCompleted ? CheckCircle : isInProgress ? Circle : isLocked ? Lock : Circle;
  const statusColor = isCompleted ? 'text-green-500' : isInProgress ? 'text-blue-500' : isLocked ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2"
      />
      
      <Card className={cn(
        "w-48 border transition-colors",
        isCompleted && "border-green-500 bg-green-50",
        isInProgress && "border-blue-500 bg-blue-50",
        isLocked && "border-gray-300 bg-gray-50 opacity-70",
        isTerminal && "border-yellow-500 bg-yellow-50",
        !isLocked && !isCompleted && !isInProgress && !isTerminal && "border-gray-200 hover:border-gray-400"
      )}>
        <CardContent className="p-3">
          {/* Simple header */}
          <div className="flex items-center justify-between mb-2">
            <StatusIcon className={cn("w-4 h-4", statusColor)} />
            <div className="flex gap-1 text-xs">
              <span className="text-muted-foreground">L{level}</span>
              {isTerminal && <Crown className="w-3 h-3 text-yellow-600" />}
            </div>
          </div>
          
          {/* Title */}
          <h3 className={cn(
            "font-medium text-sm mb-2",
            isLocked ? "text-gray-500" : "text-gray-900"
          )}>
            {title}
          </h3>
          
          {/* Time and skills count */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{estimatedWeeks}</span>
            </div>
            
            {skills?.length > 0 && (
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>{skills.length} skills</span>
              </div>
            )}
          </div>
          
          {/* Progress bar */}
          {isInProgress && progress?.completion_percentage && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${progress.completion_percentage}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2"
      />
    </div>
  );
});

SkillTreeStepNode.displayName = 'SkillTreeStepNode';