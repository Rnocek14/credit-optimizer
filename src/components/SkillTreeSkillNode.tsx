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
    description, 
    isCompleted, 
    isLocked, 
    difficultyLevel, 
    estimatedWeeks, 
    trackCategory,
    isFoundational,
    categoryColor = 'hsl(var(--primary))'
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
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3"
        style={{ background: categoryColor }}
      />
      
      <Card className={cn(
        "w-44 transition-all duration-300 border-2",
        isCompleted && "border-green-500/50 bg-green-50/20 shadow-green-500/20",
        isFoundational && "ring-2 ring-primary/20",
        "hover:shadow-lg hover-scale"
      )} style={{ borderColor: categoryColor + '40' }}>
        <CardContent className="p-3">
          {/* Header with status and category */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
              {!isCompleted && <Circle className="w-4 h-4" style={{ color: categoryColor }} />}
            </div>
            
            {/* Category badge */}
            <Badge 
              variant="outline"
              className="text-xs animate-fade-in"
              style={{ 
                borderColor: categoryColor,
                color: categoryColor
              }}
            >
              {trackCategory}
            </Badge>
          </div>
          
          {/* Skill name */}
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">
            {name}
          </h3>
          
          {/* Foundational indicator */}
          {isFoundational && (
            <div className="flex items-center gap-1 mb-2 text-xs font-medium text-primary">
              <Star className="w-3 h-3" />
              <span>Foundation</span>
            </div>
          )}
          
          {/* Difficulty and time */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{estimatedWeeks}</span>
            </div>
            
            <Badge 
              variant={difficultyLevel === 'advanced' ? 'destructive' : 
                      difficultyLevel === 'intermediate' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {difficultyLevel}
            </Badge>
          </div>
          
          {/* Progress bar for completed skills */}
          {isCompleted && (
            <div className="mt-2 w-full bg-green-100 rounded-full h-1">
              <div className="bg-green-500 h-1 rounded-full w-full animate-scale-in" />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3"
        style={{ background: categoryColor }}
      />
    </div>
  );
});

SkillTreeSkillNode.displayName = 'SkillTreeSkillNode';