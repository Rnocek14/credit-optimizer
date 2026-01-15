import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, DollarSign, Star, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeOpenExternal } from '@/components/ui/SafeExternalLink';

interface CourseNodeData {
  title: string;
  description: string;
  platform: string;
  cost: string;
  difficulty: string;
  skillTags: string[];
  url?: string;
  isRecommended?: boolean;
  userProgress?: 'not_started' | 'in_progress' | 'completed';
}

interface CourseNodeProps {
  data: CourseNodeData;
  selected?: boolean;
  onStartCourse?: (courseId: string) => void;
}

export const CourseNode: React.FC<CourseNodeProps> = memo(({ data, selected, onStartCourse }) => {
  const {
    title,
    description,
    platform,
    cost,
    difficulty,
    skillTags,
    url,
    isRecommended,
    userProgress = 'not_started'
  } = data;

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'advanced': return 'text-red-600 bg-red-50 dark:bg-red-950';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'completed': return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'in_progress': return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      default: return '';
    }
  };

  const handleCourseAction = () => {
    // Use safe open with allowlisted mode (default)
    if (url && safeOpenExternal(url)) {
      return; // URL opened successfully
    }
    // Fallback to onStartCourse callback
    if (onStartCourse) {
      onStartCourse(data.title);
    }
  };

  return (
    <div className="group">
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
      
      <Card className={`
        w-72 p-4 transition-all duration-200 hover:shadow-lg
        ${isRecommended 
          ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950' 
          : 'border border-border hover:border-primary'
        }
        ${getProgressColor(userProgress)}
        ${selected ? 'ring-2 ring-primary ring-inset' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-muted">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs">
                  {platform}
                </Badge>
                {isRecommended && (
                  <Badge variant="default" className="text-xs bg-blue-600">
                    <Star className="h-3 w-3 mr-1" />
                    Recommended
                  </Badge>
                )}
              </div>
            </div>
            <h3 className="font-semibold text-sm leading-tight mb-1">
              {title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
            {description}
          </p>
        )}

        {/* Course Details */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Cost */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-green-600" />
            <div>
              <p className="text-xs font-medium">
                {cost === 'Free' || cost === '0' ? 'Free' : cost}
              </p>
              <p className="text-xs text-muted-foreground">Cost</p>
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getDifficultyColor(difficulty)}`} />
            <div>
              <p className="text-xs font-medium capitalize">{difficulty}</p>
              <p className="text-xs text-muted-foreground">Level</p>
            </div>
          </div>
        </div>

        {/* Skills */}
        {skillTags && skillTags.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium mb-2">Skills Covered:</p>
            <div className="flex flex-wrap gap-1">
              {skillTags.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                  {skill}
                </Badge>
              ))}
              {skillTags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  +{skillTags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {userProgress !== 'not_started' && (
          <div className="mb-3 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium capitalize">
                {userProgress.replace('_', ' ')}
              </span>
              {userProgress === 'completed' && (
                <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant={userProgress === 'completed' ? 'outline' : 'default'}
          size="sm" 
          className="w-full text-xs"
          onClick={handleCourseAction}
        >
          {userProgress === 'completed' ? (
            'Review Course'
          ) : userProgress === 'in_progress' ? (
            'Continue Course'
          ) : (
            url ? (
              <>
                Start Course
                <ExternalLink className="h-3 w-3 ml-1" />
              </>
            ) : (
              'View Details'
            )
          )}
        </Button>
      </Card>

      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
});

CourseNode.displayName = 'CourseNode';