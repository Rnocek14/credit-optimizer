import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Play, CheckCircle2, Star, Clock, ExternalLink, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import TutorialTip from '@/tutorial/TutorialTip';
import { TIPS } from '@/tutorial/tutorial-map';
import { safeOpenExternal } from '@/components/ui/SafeExternalLink';

interface SavedCourse {
  course_id: string;
  event_type: 'saved' | 'enrolled' | 'completed';
  score?: number;
  completion_date?: string;
  course_details?: {
    id: string;
    title: string;
    platform_name?: string;
    difficulty?: number;
    duration_hours?: number;
    url?: string;
    instructor_name?: string;
    instructor_reputation?: number;
  };
  expectedCRIChange?: number;
}

interface SavedCoursesListProps {
  currentCRI: number;
  className?: string;
}

export function SavedCoursesList({ currentCRI, className }: SavedCoursesListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved courses with course details
  const { data: savedCourses = [], isLoading } = useQuery({
    queryKey: ['saved-courses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_course_events')
        .select(`
          course_id,
          event_type,
          score,
          completion_date,
          notes,
          created_at
        `)
        .eq('user_id', user.id)
        .in('event_type', ['saved', 'enrolled', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique course IDs
      const courseIds = [...new Set(data.map(event => event.course_id))];
      
      if (courseIds.length === 0) return [];

      // Fetch course details from ci_courses
      const { data: courseDetails, error: courseError } = await supabase
        .from('ci_courses')
        .select(`
          id,
          title,
          url,
          difficulty,
          duration_hours,
          platform:ci_platforms(name),
          instructor:ci_instructors(name, reputation)
        `)
        .in('id', courseIds);

      if (courseError) console.error('Error fetching course details:', courseError);

      // Combine events with course details and get latest status for each course
      const courseMap = new Map();
      
      data.forEach(event => {
        const existing = courseMap.get(event.course_id);
        if (!existing || new Date(event.created_at) > new Date(existing.created_at)) {
          courseMap.set(event.course_id, event);
        }
      });

      return Array.from(courseMap.values()).map(event => {
        const details = courseDetails?.find(c => c.id === event.course_id);
        return {
          ...event,
          course_details: details ? {
            id: details.id,
            title: details.title,
            platform_name: details.platform?.name,
            difficulty: details.difficulty,
            duration_hours: details.duration_hours,
            url: details.url,
            instructor_name: details.instructor?.name,
            instructor_reputation: details.instructor?.reputation
          } : null,
          expectedCRIChange: Math.random() * 8 + 2 // Mock CRI change for now
        };
      });
    }
  });

  // Update course status mutation
  const updateCourseStatus = useMutation({
    mutationFn: async ({ courseId, newStatus, score }: { 
      courseId: string; 
      newStatus: 'enrolled' | 'completed'; 
      score?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_course_events')
        .insert({
          user_id: user.id,
          course_id: courseId,
          event_type: newStatus,
          score,
          completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-courses'] });
      toast({
        title: 'Course status updated',
        description: 'Your learning progress has been recorded.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update course status.',
        variant: 'destructive',
      });
    }
  });

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

  // Calculate projected CRI
  const savedAndEnrolledCourses = savedCourses.filter(c => 
    c.event_type === 'saved' || c.event_type === 'enrolled'
  );
  const topCRIBoosts = savedAndEnrolledCourses
    .sort((a, b) => (b.expectedCRIChange || 0) - (a.expectedCRIChange || 0))
    .slice(0, 5);
  const projectedCRIIncrease = topCRIBoosts.reduce((sum, course) => 
    sum + (course.expectedCRIChange || 0), 0
  );
  const projectedCRI = currentCRI + projectedCRIIncrease;

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const groupedCourses = {
    saved: savedCourses.filter(c => c.event_type === 'saved'),
    enrolled: savedCourses.filter(c => c.event_type === 'enrolled'),
    completed: savedCourses.filter(c => c.event_type === 'completed')
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* CRI Projection */}
      {projectedCRIIncrease > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Projected CRI After Plan
              <TutorialTip id="planProjectedCRI" label={TIPS.planProjectedCRI} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current: {currentCRI.toFixed(1)}</span>
              <span className="text-lg font-bold text-emerald-600">
                Projected: {projectedCRI.toFixed(1)} (+{projectedCRIIncrease.toFixed(1)})
              </span>
            </div>
            <Progress value={(projectedCRI / 100) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Based on estimated impact of your top 5 saved courses
            </p>
          </CardContent>
        </Card>
      )}

      {/* Course Lists */}
      {Object.entries(groupedCourses).map(([status, courses]) => {
        if (courses.length === 0) return null;

        const statusConfig = {
          saved: { icon: BookOpen, label: 'Saved Courses', color: 'blue' },
          enrolled: { icon: Play, label: 'Currently Learning', color: 'amber' },
          completed: { icon: CheckCircle2, label: 'Completed Courses', color: 'emerald' }
        };

        const config = statusConfig[status as keyof typeof statusConfig];

        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-4">
              <config.icon className={`h-5 w-5 text-${config.color}-600`} />
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {config.label}
                {status === 'saved' && <TutorialTip id="plansSavedCourses" label={TIPS.plansSavedCourses} />}
              </h3>
              <Badge variant="secondary">{courses.length}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <CourseCard
                  key={course.course_id}
                  course={course}
                  status={status as 'saved' | 'enrolled' | 'completed'}
                  onUpdateStatus={updateCourseStatus.mutateAsync}
                  formatDuration={formatDuration}
                  getDifficultyLabel={getDifficultyLabel}
                />
              ))}
            </div>
          </div>
        );
      })}

      {savedCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No saved courses yet</h3>
          <p className="text-muted-foreground">
            Start exploring courses and save them to your plan to see them here.
          </p>
        </div>
      )}
    </div>
  );
}

interface CourseCardProps {
  course: SavedCourse;
  status: 'saved' | 'enrolled' | 'completed';
  onUpdateStatus: (params: { courseId: string; newStatus: 'enrolled' | 'completed'; score?: number }) => Promise<void>;
  formatDuration: (hours: number) => string;
  getDifficultyLabel: (level: number) => string;
}

function CourseCard({ course, status, onUpdateStatus, formatDuration, getDifficultyLabel }: CourseCardProps) {
  const details = course.course_details;
  
  if (!details) {
    return (
      <Card className="opacity-50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Course details not available</p>
        </CardContent>
      </Card>
    );
  }

  const handleStatusUpdate = async (newStatus: 'enrolled' | 'completed') => {
    try {
      await onUpdateStatus({ 
        courseId: course.course_id, 
        newStatus,
        score: newStatus === 'completed' ? 85 : undefined // Mock score
      });
    } catch (error) {
      console.error('Failed to update course status:', error);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base line-clamp-2">{details.title}</CardTitle>
        
        <div className="flex flex-wrap gap-1">
          {details.platform_name && (
            <Badge variant="outline" className="text-xs">{details.platform_name}</Badge>
          )}
          {details.difficulty && (
            <Badge variant="outline" className="text-xs">
              {getDifficultyLabel(details.difficulty)}
            </Badge>
          )}
          {details.duration_hours && (
            <Badge variant="outline" className="text-xs">
              {formatDuration(details.duration_hours)}
            </Badge>
          )}
        </div>

        {details.instructor_name && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>by {details.instructor_name}</span>
            {details.instructor_reputation && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{details.instructor_reputation.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {course.expectedCRIChange && course.expectedCRIChange > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-600 font-medium">
              +{course.expectedCRIChange.toFixed(1)} CRI
            </span>
          </div>
        )}

        {status === 'completed' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Completed</span>
              {course.score && <span>{course.score}%</span>}
            </div>
            {course.completion_date && (
              <p className="text-xs text-muted-foreground">
                Finished on {new Date(course.completion_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {status === 'saved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate('enrolled')}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" />
              Start Learning
            </Button>
          )}
          
          {status === 'enrolled' && (
            <Button
              size="sm"
              onClick={() => handleStatusUpdate('completed')}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          )}

          {details.url && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => safeOpenExternal(details.url)}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Course
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}