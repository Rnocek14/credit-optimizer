import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, ExternalLink, Star, Clock, TrendingUp, Bookmark, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CIRecommendation } from '@/types/course-intelligence';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyStateCard } from '@/components/LoadingStates';
import { RecommendationsRailSkeleton } from '@/components/LoadingStates';
import { validateDifficulty } from '@/utils/validation';

interface RecommendationsRailProps {
  recommendations: CIRecommendation[];
  onSaveCourse: (courseId: string) => void;
  onOpenCourse: (url: string) => void;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

type Strategy = 'gap_fill' | 'foundations' | 'accelerate';
type DifficultyFilter = 'all' | '1-2' | '3' | '4-5';

export function RecommendationsRail({ 
  recommendations, 
  onSaveCourse, 
  onOpenCourse, 
  className,
  isLoading = false,
  error = null,
  onRetry
}: RecommendationsRailProps) {
  const [strategy, setStrategy] = useState<Strategy>('gap_fill');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [platformFilters, setPlatformFilters] = useState<Set<string>>(new Set());

  const formatDuration = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const getDifficultyLabel = (level: number): string => {
    if (level <= 1) return 'Beginner';
    if (level <= 2) return 'Elementary';
    if (level <= 3) return 'Intermediate';
    if (level <= 4) return 'Advanced';
    return 'Expert';
  };

  // Get unique platforms for filtering with memoization
  const availablePlatforms = useMemo(() => {
    return Array.from(new Set(recommendations.map(r => r.course.platform.name)));
  }, [recommendations]);

  // Filter recommendations with memoization and validation
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      // Validate recommendation data
      if (!rec.course?.id || !validateDifficulty(rec.course.difficulty)) {
        console.warn('Invalid recommendation data:', rec);
        return false;
      }

      // Difficulty filter
      if (difficultyFilter !== 'all') {
        const difficulty = rec.course.difficulty;
        if (difficultyFilter === '1-2' && difficulty > 2) return false;
        if (difficultyFilter === '3' && difficulty !== 3) return false;
        if (difficultyFilter === '4-5' && difficulty < 4) return false;
      }

      // Platform filter
      if (platformFilters.size > 0 && !platformFilters.has(rec.course.platform.name)) {
        return false;
      }

      return true;
    });
  }, [recommendations, difficultyFilter, platformFilters]);

  const handlePlatformToggle = (platform: string, checked: boolean) => {
    const newFilters = new Set(platformFilters);
    if (checked) {
      newFilters.add(platform);
    } else {
      newFilters.delete(platform);
    }
    setPlatformFilters(newFilters);
  };

  // Loading state
  if (isLoading) {
    return <RecommendationsRailSkeleton className={className} />;
  }

  // Error state
  if (error) {
    return (
      <EmptyStateCard
        icon={AlertCircle}
        title="Failed to load recommendations"
        description="There was an error loading course recommendations. Please try again."
        action={onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Try Again
          </Button>
        )}
        className={className}
      />
    );
  }

  // Empty state
  if (!recommendations || recommendations.length === 0) {
    return (
      <EmptyStateCard
        icon={BookOpen}
        title="No recommendations available"
        description="Check back later for personalized course suggestions based on your learning goals."
        className={className}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className={cn('space-y-6', className)}>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg" role="search" aria-label="Course filters">
          <div className="flex items-center gap-2">
            <Label htmlFor="strategy-select">Strategy:</Label>
            <Select value={strategy} onValueChange={(value: Strategy) => setStrategy(value)}>
              <SelectTrigger id="strategy-select" className="w-[140px]" aria-label="Select recommendation strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gap_fill">Gap Fill</SelectItem>
                <SelectItem value="foundations">Foundations</SelectItem>
                <SelectItem value="accelerate">Accelerate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="difficulty-select">Difficulty:</Label>
            <Select value={difficultyFilter} onValueChange={(value: DifficultyFilter) => setDifficultyFilter(value)}>
              <SelectTrigger id="difficulty-select" className="w-[120px]" aria-label="Filter by difficulty level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1-2">Beginner</SelectItem>
                <SelectItem value="3">Intermediate</SelectItem>
                <SelectItem value="4-5">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {availablePlatforms.length > 1 && (
            <div className="flex items-center gap-2">
              <Label>Platforms:</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Platform filters">
                {availablePlatforms.map(platform => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={`platform-${platform}`}
                      checked={platformFilters.has(platform)}
                      onCheckedChange={(checked) => handlePlatformToggle(platform, checked as boolean)}
                      aria-describedby={`platform-${platform}-label`}
                    />
                    <Label
                      id={`platform-${platform}-label`}
                      htmlFor={`platform-${platform}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {platform}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

        {/* Recommendations Grid */}
        {filteredRecommendations.length === 0 ? (
          <EmptyStateCard
            icon={BookOpen}
            title="No courses match your filters"
            description="Try adjusting the criteria above to see more recommendations."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Course recommendations">
            {filteredRecommendations.map((recommendation) => (
              <CourseCard
                key={recommendation.course.id}
                recommendation={recommendation}
                onSave={() => onSaveCourse(recommendation.course.id)}
                onOpen={() => onOpenCourse(recommendation.course.url)}
                formatDuration={formatDuration}
                getDifficultyLabel={getDifficultyLabel}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

interface CourseCardProps {
  recommendation: CIRecommendation;
  onSave: () => void;
  onOpen: () => void;
  formatDuration: (hours: number) => string;
  getDifficultyLabel: (level: number) => string;
}

function CourseCard({ 
  recommendation, 
  onSave, 
  onOpen, 
  formatDuration, 
  getDifficultyLabel 
}: CourseCardProps) {
  const { course, score, expectedCRIChange, reason } = recommendation;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 h-full flex flex-col" role="listitem">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2 leading-tight">
            {course.title}
          </CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {Math.round(score * 100)}%
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {course.platform.name}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getDifficultyLabel(course.difficulty)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {formatDuration(course.durationHours)}
          </Badge>
        </div>

        {course.instructor && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>by {course.instructor.name}</span>
            {course.instructor.reputation && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{course.instructor.reputation.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {reason}
        </p>

        {expectedCRIChange > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-600 font-medium">
              +{expectedCRIChange.toFixed(1)} CRI
            </span>
          </div>
        )}

        <div className="flex gap-2 mt-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            className="flex-1"
            aria-label={`Save ${course.title} to plan`}
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Save to Plan
          </Button>
          <Button
            size="sm"
            onClick={onOpen}
            className="flex-1"
            aria-label={`Open ${course.title} course`}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}