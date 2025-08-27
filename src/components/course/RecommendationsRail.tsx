import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, ExternalLink, Star, Clock, TrendingUp, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CIRecommendation } from '@/types/course-intelligence';

interface RecommendationsRailProps {
  recommendations: CIRecommendation[];
  onSaveCourse: (courseId: string) => void;
  onOpenCourse: (url: string) => void;
  className?: string;
}

type Strategy = 'gap_fill' | 'foundations' | 'accelerate';
type DifficultyFilter = 'all' | '1-2' | '3' | '4-5';

export function RecommendationsRail({ 
  recommendations, 
  onSaveCourse, 
  onOpenCourse, 
  className 
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

  // Get unique platforms for filtering
  const availablePlatforms = Array.from(
    new Set(recommendations.map(r => r.course.platform.name))
  );

  // Filter recommendations
  const filteredRecommendations = recommendations.filter(rec => {
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

  const handlePlatformToggle = (platform: string, checked: boolean) => {
    const newFilters = new Set(platformFilters);
    if (checked) {
      newFilters.add(platform);
    } else {
      newFilters.delete(platform);
    }
    setPlatformFilters(newFilters);
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No recommendations available</h3>
        <p className="text-muted-foreground">Check back later for personalized course suggestions.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Label htmlFor="strategy">Strategy:</Label>
          <Select value={strategy} onValueChange={(value: Strategy) => setStrategy(value)}>
            <SelectTrigger className="w-[140px]">
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
          <Label htmlFor="difficulty">Difficulty:</Label>
          <Select value={difficultyFilter} onValueChange={(value: DifficultyFilter) => setDifficultyFilter(value)}>
            <SelectTrigger className="w-[120px]">
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
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map(platform => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={`platform-${platform}`}
                    checked={platformFilters.has(platform)}
                    onCheckedChange={(checked) => handlePlatformToggle(platform, checked as boolean)}
                  />
                  <Label
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
        <div className="text-center py-8 text-muted-foreground">
          No courses match your current filters. Try adjusting the criteria above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <Card className="hover:shadow-lg transition-all duration-200 h-full flex flex-col">
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