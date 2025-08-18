import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { CourseProgressBadge } from './CourseProgressBadge';

interface StartLearningButtonProps {
  courseId: string;
  courseUrl?: string;
  trackId?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg";
  showProgressBadge?: boolean;
  className?: string;
}

export function StartLearningButton({ 
  courseId, 
  courseUrl, 
  trackId,
  variant = "default",
  size = "default",
  showProgressBadge = false,
  className
}: StartLearningButtonProps) {
  const { 
    startCourse, 
    getProgressForCourse, 
    getProgressStatus,
    updateProgress 
  } = useCourseProgress(trackId);

  const progress = getProgressForCourse(courseId);
  const status = getProgressStatus(courseId);

  const handleClick = async () => {
    if (status === 'not_started') {
      // Start the course first
      await startCourse.mutateAsync({ courseId, trackId });
    } else {
      // Update last accessed time
      updateProgress.mutate({ courseId });
    }

    // Open the course URL if available
    if (courseUrl) {
      window.open(courseUrl, '_blank');
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          text: 'Review Course',
          disabled: false
        };
      case 'in_progress':
        return {
          icon: PlayCircle,
          text: 'Continue Learning',
          disabled: false
        };
      case 'paused':
        return {
          icon: PlayCircle,
          text: 'Resume Course',
          disabled: false
        };
      default:
        return {
          icon: PlayCircle,
          text: 'Start Learning',
          disabled: false
        };
    }
  };

  const config = getButtonConfig();
  const Icon = config.icon;
  const isLoading = startCourse.isPending;

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        disabled={config.disabled || isLoading || !courseUrl}
        className={className}
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Icon className="h-4 w-4 mr-2" />
        )}
        {config.text}
        {courseUrl && <ExternalLink className="h-3 w-3 ml-2" />}
      </Button>
      
      {showProgressBadge && progress && (
        <CourseProgressBadge progress={progress} />
      )}
    </div>
  );
}