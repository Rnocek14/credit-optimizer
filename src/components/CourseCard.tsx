
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, Star, Clock, DollarSign } from 'lucide-react';
import SaveButton from '@/components/SaveButton';
import { StartLearningButton } from '@/components/StartLearningButton';
import { CourseProgressBadge } from '@/components/CourseProgressBadge';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { CourseCompletionModal } from '@/components/CourseCompletionModal';
import { Trophy } from 'lucide-react';
import { SaveToPlanButton } from '@/components/SaveToPlanButton';
import TutorialTip from '@/tutorial/TutorialTip';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    platform: string;
    url?: string;
    difficulty?: string;
    cost?: string;
    description?: string;
    skill_tags?: string[];
  };
  onStartCourse?: (courseId: string) => void;
  compact?: boolean;
  showSaveButton?: boolean;
}

const difficultyColors = {
  'Beginner': 'bg-green-100 text-green-800',
  'Intermediate': 'bg-yellow-100 text-yellow-800',
  'Advanced': 'bg-red-100 text-red-800',
  'Expert': 'bg-primary-light text-primary'
};

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  onStartCourse, 
  compact = false,
  showSaveButton = true
}) => {
  const { getProgressForCourse, getProgressStatus } = useCourseProgress();
  const progress = getProgressForCourse(course.id);
  const [showCompletionModal, setShowCompletionModal] = React.useState(false);

  const handleStartCourse = () => {
    if (course.url) {
      window.open(course.url, '_blank');
    }
    onStartCourse?.(course.id);
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{course.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{course.platform}</p>
              <div className="flex items-center gap-2 mt-2">
                {course.difficulty && (
                   <Badge 
                     variant="outline" 
                     className={`text-readable-xs ${difficultyColors[course.difficulty as keyof typeof difficultyColors] || 'bg-gray-100 text-gray-800'}`}
                   >
                    {course.difficulty}
                  </Badge>
                )}
                {course.cost && (
                  <div className="flex items-center gap-1 text-readable-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    {course.cost}
                  </div>
                )}
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleStartCourse}
              className="flex-shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{course.title}</CardTitle>
            <p className="text-muted-foreground mt-1">{course.platform}</p>
          </div>
          <div className="flex items-center gap-2">
            {course.difficulty && (
              <Badge 
                variant="outline" 
                className={difficultyColors[course.difficulty as keyof typeof difficultyColors] || 'bg-gray-100 text-gray-800'}
              >
                {course.difficulty}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {course.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {course.cost && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {course.cost}
            </div>
          )}
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Course
          </div>
        </div>

        {course.skill_tags && course.skill_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
             {course.skill_tags.slice(0, 3).map((tag, index) => (
               <Badge key={index} variant="secondary" className="text-readable-xs">
                 {tag}
               </Badge>
             ))}
             {course.skill_tags.length > 3 && (
               <Badge variant="secondary" className="text-readable-xs">
                 +{course.skill_tags.length - 3} more
               </Badge>
             )}
          </div>
        )}

        <div className="space-y-2">
          {progress && (
            <CourseProgressBadge progress={progress} />
          )}
          <div className="flex gap-2">
            <StartLearningButton
              courseId={course.id}
              courseUrl={course.url}
              variant="default"
              size="default"
              className="flex-1"
            />
            
            {getProgressStatus(course.id) === 'in_progress' && (
              <Button
                variant="secondary"
                size="default"
                onClick={() => setShowCompletionModal(true)}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                Complete
              </Button>
            )}
            
            {showSaveButton && (
              <SaveToPlanButton 
                item={{
                  type: 'course',
                  id: course.id,
                  title: course.title,
                  description: course.description,
                  skillTags: course.skill_tags,
                  metadata: {
                    platform: course.platform,
                    difficulty: course.difficulty,
                    cost: course.cost,
                    url: course.url
                  }
                }}
                variant="outline" 
                size="default"
                showPrioritySelector={true}
              />
            )}
          </div>
        </div>
      </CardContent>
      
      <CourseCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        courseId={course.id}
        courseTitle={course.title}
      />
    </Card>
  );
};
