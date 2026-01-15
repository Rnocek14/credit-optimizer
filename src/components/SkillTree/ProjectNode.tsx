import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code2, Clock, Target, CheckCircle2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeOpenExternal } from '@/components/ui/SafeExternalLink';

interface ProjectNodeData {
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  skillsDemonstrated: string[];
  projectType: string; // 'portfolio', 'practice', 'certification'
  isCompleted?: boolean;
  isInProgress?: boolean;
  githubUrl?: string;
  liveUrl?: string;
}

interface ProjectNodeProps {
  data: ProjectNodeData;
  selected?: boolean;
  onStartProject?: (projectId: string) => void;
  onViewProject?: (projectId: string) => void;
}

export const ProjectNode: React.FC<ProjectNodeProps> = memo(({ 
  data, 
  selected, 
  onStartProject, 
  onViewProject 
}) => {
  const {
    title,
    description,
    difficulty,
    estimatedTime,
    skillsDemonstrated,
    projectType,
    isCompleted,
    isInProgress,
    githubUrl,
    liveUrl
  } = data;

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'advanced': return 'text-red-600 bg-red-50 dark:bg-red-950';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'portfolio': return '💼';
      case 'practice': return '🎯';
      case 'certification': return '🏆';
      default: return '📁';
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return 'border-green-500 bg-green-50 dark:bg-green-950';
    if (isInProgress) return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
    return '';
  };

  const handleAction = () => {
    if (isCompleted && onViewProject) {
      onViewProject(title);
    } else if (onStartProject) {
      onStartProject(title);
    }
  };

  return (
    <div className="group">
      <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100" />
      
      <Card className={`
        w-80 p-4 transition-all duration-200 hover:shadow-lg
        border border-border hover:border-primary
        ${getStatusColor()}
        ${selected ? 'ring-2 ring-primary ring-inset' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-muted">
                <Code2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {getProjectTypeIcon(projectType)} {projectType}
                </Badge>
                <Badge variant="outline" className={`text-xs ${getDifficultyColor(difficulty)}`}>
                  {difficulty}
                </Badge>
              </div>
            </div>
            <h3 className="font-semibold text-base leading-tight mb-1">
              {title}
            </h3>
          </div>
          
          {/* Status Indicator */}
          <div className="ml-2">
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {isInProgress && !isCompleted && (
              <PlayCircle className="h-5 w-5 text-blue-600" />
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {description}
          </p>
        )}

        {/* Project Details */}
        <div className="space-y-3 mb-4">
          {/* Estimated Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Estimated time: {estimatedTime}
            </span>
          </div>

          {/* Skills Demonstrated */}
          {skillsDemonstrated && skillsDemonstrated.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Skills Demonstrated:</span>
              </div>
              <div className="flex flex-wrap gap-1 ml-6">
                {skillsDemonstrated.slice(0, 4).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                    {skill}
                  </Badge>
                ))}
                {skillsDemonstrated.length > 4 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    +{skillsDemonstrated.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        {(githubUrl || liveUrl) && (
          <div className="flex gap-2 mb-4">
            {githubUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs flex-1"
                onClick={() => safeOpenExternal(githubUrl)}
              >
                GitHub
              </Button>
            )}
            {liveUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs flex-1"
                onClick={() => safeOpenExternal(liveUrl)}
              >
                Live Demo
              </Button>
            )}
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant={isCompleted ? 'outline' : 'default'}
          size="sm" 
          className="w-full text-sm"
          onClick={handleAction}
        >
          {isCompleted ? (
            'View Project'
          ) : isInProgress ? (
            'Continue Project'
          ) : (
            'Start Project'
          )}
        </Button>

        {/* Progress Status */}
        {(isCompleted || isInProgress) && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Status: {isCompleted ? 'Completed' : 'In Progress'}
              </span>
              {isCompleted && (
                <span className="text-green-600 font-medium">
                  ✓ Portfolio Ready
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
});

ProjectNode.displayName = 'ProjectNode';