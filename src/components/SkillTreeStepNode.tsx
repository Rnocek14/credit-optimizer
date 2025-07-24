import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock, Target } from 'lucide-react';

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
  prerequisites: string[];
  skills: Skill[];
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
    estimatedDuration,
    skills = []
  } = data;

  return (
    <div className="group">
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
      
      <Card className={`
        w-64 p-4 border-2 transition-all duration-200 hover:shadow-lg
        ${isTerminal 
          ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950' 
          : 'border-border hover:border-primary'
        }
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isTerminal && <Crown className="h-4 w-4 text-yellow-600" />}
              <Badge variant="secondary" className="text-xs">
                Level {level}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm leading-tight mb-1">
              {title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Duration */}
        {estimatedDuration && (
          <div className="flex items-center gap-1 mb-3">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {estimatedDuration}
            </span>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">Key Skills</span>
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
              <Target className="h-3 w-3" />
              <span className="text-xs font-medium">Career Goal</span>
            </div>
          </div>
        )}
      </Card>

      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
});

SkillTreeStepNode.displayName = 'SkillTreeStepNode';