import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCourseIntelligence } from './useCourseIntelligence';
import { fetchCiCourseSummaries, logAiModelUsage } from '@/shared/lib/api/telemetry';

interface CourseDetails {
  id: string;
  title: string;
  slug: string;
  url?: string | null;
  difficulty: number;
  duration_hours?: number | null;
  platform: {
    id: string;
    slug: string;
    name: string;
    website_url?: string | null;
  } | null;
  instructor: {
    id: string;
    name: string;
    reputation?: number | null;
  } | null;
}

export function useCourseRecommendationUtils() {
  const [loadingCourses, setLoadingCourses] = useState<Record<string, boolean>>({});
  const [courseCache, setCourseCache] = useState<Record<string, CourseDetails[]>>({});
  const { toast } = useToast();
  const { recordCourseEvent } = useCourseIntelligence();

  const fetchCourseSummaries = useCallback(async (courseIds: string[]): Promise<CourseDetails[]> => {
    if (!courseIds.length) return [];
    
    const cacheKey = [...courseIds].sort().join(',');
    if (courseCache[cacheKey]) {
      return courseCache[cacheKey];
    }

    setLoadingCourses(prev => ({ ...prev, [cacheKey]: true }));

    try {
      const courses = await fetchCiCourseSummaries(courseIds);
      setCourseCache(prev => ({ ...prev, [cacheKey]: courses }));
      return courses;
    } catch (error) {
      console.error('Failed to fetch course summaries:', error);
      toast({
        title: "Failed to load courses",
        description: "Course details could not be retrieved.",
        variant: "destructive",
        duration: 3000,
      });
      return [];
    } finally {
      setLoadingCourses(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [courseCache, toast]);

  const saveCourseToRecommendations = useCallback(async (userId: string, courseId: string, courseTitle: string) => {
    try {
      const success = await recordCourseEvent(userId, courseId, 'enrolled', undefined, 'Saved from Maya recommendations');
      
      if (success) {
        toast({
          title: "Course saved to plan",
          description: `${courseTitle} has been added to your learning plan.`,
          duration: 4000,
        });
        
        await logAiModelUsage({
          userId,
          task: 'maya_course_save',
          route: 'maya_recommendations',
          functionName: 'course_save_action',
        });
      }
      
      return success;
    } catch (error) {
      console.error('Failed to save course:', error);
      toast({
        title: "Save failed",
        description: "Could not save course to your plan. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }
  }, [recordCourseEvent, toast]);

  const logRecommendationView = useCallback(async (userId: string, insightId: string, courseIds: string[], trackId?: string) => {
    await logAiModelUsage({
      userId,
      task: 'maya_reco_view',
      route: 'maya_insights_card',
      functionName: 'recommendation_display',
      complexity: JSON.stringify({
        insight_id: insightId,
        course_ids: courseIds,
        track_id: trackId,
        course_count: courseIds.length,
      }),
    });
  }, []);

  const isCourseLoading = useCallback((courseIds: string[]) => {
    const cacheKey = [...courseIds].sort().join(',');
    return loadingCourses[cacheKey] || false;
  }, [loadingCourses]);

  return {
    fetchCourseSummaries,
    saveCourseToRecommendations,
    logRecommendationView,
    isCourseLoading,
    courseCache
  };
}
