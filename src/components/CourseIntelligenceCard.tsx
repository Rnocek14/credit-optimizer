/**
 * Enhanced Course Card with Intelligence Engine Features
 * Displays courses with difficulty ratings, CRI scores, instructor prestige, and skill tags
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Clock, 
  DollarSign, 
  Award, 
  BookOpen, 
  ExternalLink,
  TrendingUp,
  Shield,
  Users
} from 'lucide-react';
import { EnhancedCourse } from '@/hooks/useCourseIntelligenceEngine';
import useCourseIntelligenceEngine from '@/hooks/useCourseIntelligenceEngine';
import { isVerifiedCourseUrl } from '@/lib/urlValidation';

interface CourseIntelligenceCardProps {
  course: EnhancedCourse;
  onRateCourse?: (courseId: string) => void;
  onViewDetails?: (courseId: string) => void;
  showFullDetails?: boolean;
}

export const CourseIntelligenceCard: React.FC<CourseIntelligenceCardProps> = ({
  course,
  onRateCourse,
  onViewDetails,
  showFullDetails = false
}) => {
  const { getPrestigeBadgeColor, getDifficultyColor, getCRIColor, formatStars } = useCourseIntelligenceEngine();

  const criScore = course.cri_score?.overall_cri_score;
  const difficultyRating = course.difficulty_rating?.normalized_difficulty;
  const instructor = course.instructor_profile;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
              {course.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {course.description || 'AI-curated course with enhanced intelligence scoring'}
            </CardDescription>
          </div>
          {criScore && (
            <Badge 
              variant="secondary" 
              className={`ml-3 font-semibold ${getCRIColor(criScore)}`}
            >
              CRI: {criScore}
            </Badge>
          )}
        </div>

        {/* Platform and Verification Status */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {course.platform}
          </Badge>
          {course.verification_status === 'verified' && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Instructor Information */}
        {instructor && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{instructor.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  className={`text-xs ${getPrestigeBadgeColor(instructor.prestige_tier)}`}
                  variant="outline"
                >
                  <Award className="w-3 h-3 mr-1" />
                  {instructor.prestige_tier.toUpperCase()}
                </Badge>
                {instructor.average_rating > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatStars(instructor.average_rating)} ({instructor.average_rating.toFixed(1)})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Course Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Difficulty Rating */}
          {difficultyRating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Difficulty</span>
                <Badge 
                  className={`text-xs ${getDifficultyColor(difficultyRating)}`}
                  variant="outline"
                >
                  {difficultyRating.toFixed(1)}★
                </Badge>
              </div>
              <Progress value={difficultyRating * 20} className="h-2" />
            </div>
          )}

          {/* CRI Score */}
          {criScore && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CRI Score</span>
                <span className={`text-sm font-semibold ${getCRIColor(criScore)}`}>
                  {criScore}/100
                </span>
              </div>
              <Progress value={criScore} className="h-2" />
            </div>
          )}
        </div>

        {/* Course Details */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{course.estimated_hours}h</span>
          </div>
          
          {course.cost_usd > 0 ? (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span>${course.cost_usd}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Free</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="capitalize">{course.difficulty_level || 'Mixed'}</span>
          </div>
        </div>

        {/* Skill Tags */}
        {course.skill_mappings && course.skill_mappings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Skills Covered:</p>
            <div className="flex flex-wrap gap-1">
              {course.skill_mappings.slice(0, showFullDetails ? undefined : 4).map((skill, index) => (
                <Badge 
                  key={skill.id || index} 
                  variant="secondary" 
                  className="text-xs"
                >
                  {skill.skill_name}
                </Badge>
              ))}
              {!showFullDetails && course.skill_mappings.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{course.skill_mappings.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* CRI Breakdown (Full Details) */}
        {showFullDetails && course.cri_score && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium">CRI Breakdown:</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between">
                <span>Difficulty:</span>
                <span className="font-medium">{course.cri_score.difficulty_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Skills:</span>
                <span className="font-medium">{course.cri_score.skill_coverage_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Projects:</span>
                <span className="font-medium">{course.cri_score.project_rigor_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Outcomes:</span>
                <span className="font-medium">{course.cri_score.outcome_conversion_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Instructor:</span>
                <span className="font-medium">{course.cri_score.instructor_prestige_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Platform:</span>
                <span className="font-medium">{course.cri_score.platform_credibility_score}/100</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails?.(course.id)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            View Details
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRateCourse?.(course.id)}
          >
            <Star className="w-4 h-4 mr-2" />
            Rate
          </Button>

          {isVerifiedCourseUrl(course.course_url) && (
            <Button
              variant="secondary"
              size="sm"
              asChild
            >
              <a 
                href={course.course_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseIntelligenceCard;