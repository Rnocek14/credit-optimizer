import React from 'react';
import { ExternalLink, Clock, DollarSign, Star, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCourseIntelligence } from '@/hooks/useCourseIntelligence';
import { useUser } from '@/hooks/useUser';

interface CourseRecommendation {
  courseId: string;
  title: string;
  description?: string;
  url?: string;
  platform: string;
  instructor?: string;
  estimatedHours?: number;
  cost?: number;
  difficulty?: string;
  score: number;
  reasons: string[];
  skillsCovered: string[];
}

interface CourseRecommendationCardProps {
  recommendation: CourseRecommendation;
  onEnroll?: (courseId: string) => void;
}

export const CourseRecommendationCard: React.FC<CourseRecommendationCardProps> = ({
  recommendation,
  onEnroll
}) => {
  const { recordCourseEvent } = useCourseIntelligence();
  const user = useUser();

  const handleEnroll = async () => {
    if (!user?.user?.id) return;
    
    await recordCourseEvent(user.user.id, recommendation.courseId, 'enrolled');
    onEnroll?.(recommendation.courseId);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100';
      case 'intermediate': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'coursera': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'edx': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'udemy': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
    }
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 mb-1">
              {recommendation.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {recommendation.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{Math.round(recommendation.score)}/100</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge className={getPlatformColor(recommendation.platform)}>
            {recommendation.platform}
          </Badge>
          {recommendation.difficulty && (
            <Badge className={getDifficultyColor(recommendation.difficulty)}>
              {recommendation.difficulty}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Course Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {recommendation.estimatedHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{recommendation.estimatedHours}h</span>
            </div>
          )}
          {recommendation.cost !== undefined && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>{recommendation.cost === 0 ? 'Free' : `$${recommendation.cost}`}</span>
            </div>
          )}
          {recommendation.instructor && (
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span className="truncate">{recommendation.instructor}</span>
            </div>
          )}
        </div>

        {/* Reasons */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Why this course?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {recommendation.reasons.slice(0, 3).map((reason, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Skills Covered */}
        {recommendation.skillsCovered.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Skills you'll learn</h4>
            <div className="flex flex-wrap gap-1">
              {recommendation.skillsCovered.slice(0, 4).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {recommendation.skillsCovered.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{recommendation.skillsCovered.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {recommendation.url && (
            <Button asChild className="flex-1">
              <a 
                href={recommendation.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Course
              </a>
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleEnroll}
            className="flex-1"
          >
            Mark as Enrolled
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};