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
    description,
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

  // Get difficulty styling
  const getDifficultyColor = () => {
    switch (difficultyLevel) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get progress icon
  const ProgressIcon = isCompleted ? CheckCircle : isInProgress ? Circle : isLocked ? Lock : Circle;
  const progressColor = isCompleted ? 'text-green-500' : isInProgress ? 'text-yellow-500' : isLocked ? 'text-gray-400' : 'text-gray-300';

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-primary/50"
      />
      
      <Card className={cn(
        "w-64 transition-all duration-300 border-2",
        isCompleted && "border-green-500/50 bg-green-50/20 shadow-green-500/20",
        isInProgress && "border-yellow-500/50 bg-yellow-50/20 shadow-yellow-500/20 animate-pulse",
        isLocked && "border-muted bg-muted/30 opacity-60",
        isTerminal && "border-yellow-500/70 bg-gradient-to-br from-yellow-50/30 to-amber-50/30",
        !isLocked && !isCompleted && !isInProgress && "border-primary/30 hover:border-primary/60 hover:shadow-lg hover-scale"
      )}>
        <CardContent className="p-4">
          {/* Header with status icon and terminal indicator */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {isTerminal && <Crown className="w-4 h-4 text-yellow-600" />}
              {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
              {isInProgress && <Circle className="w-4 h-4 text-yellow-500 animate-spin" />}
              {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
              {!isLocked && !isCompleted && !isInProgress && !isTerminal && <Circle className="w-4 h-4 text-primary" />}
            </div>
            
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs animate-fade-in">
                Level {level}
              </Badge>
              <Badge 
                variant={difficultyLevel === 'advanced' ? 'destructive' : 
                        difficultyLevel === 'intermediate' ? 'default' : 'secondary'}
                className="text-xs animate-fade-in"
              >
                {difficultyLevel}
              </Badge>
            </div>
          </div>
          
          {/* Title */}
          <h3 className={cn(
            "font-semibold text-sm mb-2 line-clamp-2",
            isLocked ? "text-muted-foreground" : "text-foreground"
          )}>
            {title}
          </h3>
          
          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {description}
            </p>
          )}
          
          {/* Time estimate */}
          <div className="flex items-center gap-1 mb-3 p-2 bg-muted/50 rounded-md">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium">{estimatedWeeks}</span>
          </div>
          
          {/* Skills count */}
          {skills?.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-2">
                <Target className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium">Key Skills ({skills.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 3).map((skill) => (
                  <Badge 
                    key={skill.id} 
                    variant="outline" 
                    className="text-xs px-1 py-0"
                    style={{
                      opacity: 0.6 + (skill.importance * 0.4)
                    }}
                  >
                    {skill.name}
                  </Badge>
                ))}
                {skills.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{skills.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Terminal indicator */}
          {isTerminal && (
            <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
                <Target className="w-3 h-3" />
                <span className="text-xs font-medium">Career Goal</span>
              </div>
            </div>
          )}
          
          {/* Progress bar for in-progress items */}
          {isInProgress && progress?.completion_percentage && (
            <div className="mt-3 w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500 animate-scale-in"
                style={{ width: `${progress.completion_percentage}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-primary/50"
      />
    </div>
  );
});

SkillTreeStepNode.displayName = 'SkillTreeStepNode';