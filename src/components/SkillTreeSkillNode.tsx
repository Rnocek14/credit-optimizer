import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, CheckCircle, Circle, Lock } from 'lucide-react';

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
}

interface SkillTreeSkillNodeProps {
  data: SkillTreeSkillNodeData;
}

export const SkillTreeSkillNode: React.FC<SkillTreeSkillNodeProps> = memo(({ data }) => {
  const { 
    name, 
    category, 
    description, 
    isCompleted, 
    isLocked, 
    difficultyLevel, 
    estimatedWeeks, 
    isFoundational 
  } = data;

  const getCategoryColor = (category: string) => {
    const colors = {
      'Programming': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Framework': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Tools': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Design': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'Data': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'DevOps': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Testing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getDifficultyColor = () => {
    switch (difficultyLevel) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';  
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const ProgressIcon = isCompleted ? CheckCircle : isLocked ? Lock : Circle;
  const progressColor = isCompleted ? 'text-green-500' : isLocked ? 'text-gray-400' : 'text-gray-300';

  return (
    <div className="group">
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
      
      <div className={`
        w-44 p-3 rounded-lg border border-border bg-background/80 backdrop-blur-sm
        transition-all duration-200 hover:shadow-md hover:scale-105 relative
        flex flex-col items-center text-center
        ${isFoundational ? 'ring-2 ring-primary/20' : ''}
        ${isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
        ${isLocked ? 'opacity-60 border-gray-300' : ''}
      `}>
        {/* Progress indicator */}
        <div className="absolute -top-2 -right-2">
          <ProgressIcon className={`h-4 w-4 ${progressColor} bg-background rounded-full border border-background`} />
        </div>

        {/* Foundational indicator */}
        {isFoundational && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full"></div>
        )}

        {/* Icon */}
        <div className="mb-2 p-2 rounded-full bg-muted">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Name */}
        <h4 className="font-medium text-sm mb-1 leading-tight">
          {name}
        </h4>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-2 justify-center">
          <Badge 
            variant="secondary" 
            className={`text-xs ${getCategoryColor(category)}`}
          >
            {category}
          </Badge>
          <Badge className={`text-xs ${getDifficultyColor()}`}>
            {difficultyLevel}
          </Badge>
        </div>

        {/* Time estimate */}
        <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-muted rounded text-xs">
          <Clock className="h-3 w-3" />
          <span>{estimatedWeeks}</span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
});

SkillTreeSkillNode.displayName = 'SkillTreeSkillNode';