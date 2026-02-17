import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QUERY_KEYS } from '@/lib/queryKeys';
import {
  fetchCourseProgress,
  fetchRecommendedCoursesByIds,
  rpcStartCourseProgress,
  updateCourseProgressTrack,
  rpcCompleteCourseProgress,
  updateCourseProgressRow,
  fetchLearningMilestones,
} from '@/shared/lib/api/progress';

export interface CourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  track_id?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  last_accessed_at?: string;
  time_spent_hours: number;
  xp_awarded: number;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
  title?: string;
  platform?: string;
}

export interface LearningMilestone {
  id: string;
  user_id: string;
  milestone_type: string;
  milestone_data: Record<string, any>;
  achieved_at: string;
  xp_awarded: number;
  created_at: string;
}

export function useCourseProgress(trackId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to get userId (auth call is allowed exception per API_SEAMS.md)
  const getUserId = async (): Promise<string> => {
    const devUser = localStorage.getItem("devUser");
    if (devUser) {
      return JSON.parse(devUser).id;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
  };

  // Get course progress for the current user, optionally filtered by track
  const { data: courseProgress, isLoading } = useQuery({
    queryKey: QUERY_KEYS.COURSE_PROGRESS(undefined, trackId),
    queryFn: async () => {
      const userId = await getUserId();

      const progressData = await fetchCourseProgress(userId, trackId);
      const courseIds = progressData.map((p: any) => p.course_id);
      const coursesData = await fetchRecommendedCoursesByIds(courseIds);

      const coursesMap = new Map(coursesData.map(course => [course.id, course]));

      return progressData.map((progress: any) => ({
        ...progress,
        title: coursesMap.get(progress.course_id)?.title,
        platform: coursesMap.get(progress.course_id)?.platform,
      })) as CourseProgress[];
    },
    enabled: true
  });

  // Get learning milestones
  const { data: milestones } = useQuery({
    queryKey: QUERY_KEYS.LEARNING_MILESTONES(undefined, trackId),
    queryFn: async () => {
      const userId = await getUserId();
      return fetchLearningMilestones(userId) as Promise<LearningMilestone[]>;
    },
    enabled: true
  });

  // Start course progress
  const startCourse = useMutation({
    mutationFn: async ({ courseId, trackId: courseTrackId }: { courseId: string; trackId?: string }) => {
      const userId = await getUserId();

      const data = await rpcStartCourseProgress(userId, courseId);

      if (courseTrackId && data) {
        await updateCourseProgressTrack(userId, courseId, courseTrackId);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      const { trackId: courseTrackId } = variables;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_PROGRESS(undefined, courseTrackId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_LEVEL(undefined, courseTrackId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_TRACK_XP(undefined, courseTrackId) });
      queryClient.invalidateQueries({ queryKey: ['edu-courses'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-courses'] });
      toast({
        title: "Course Started!",
        description: "You've started learning this course and earned 5 XP!"
      });
    },
    onError: (error) => {
      console.error('Error starting course:', error);
      toast({
        title: "Error",
        description: "Failed to start course. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Complete course progress
  const completeCourse = useMutation({
    mutationFn: async ({ courseId, notes }: { courseId: string; notes?: string }) => {
      const userId = await getUserId();
      return rpcCompleteCourseProgress(userId, courseId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_PROGRESS(undefined, trackId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEARNING_MILESTONES(undefined, trackId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_LEVEL(undefined, trackId) });
      queryClient.invalidateQueries({ queryKey: ['edu-courses'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-courses'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-selections'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_TRACK_XP(undefined, trackId) });
      toast({
        title: "Course Completed! 🎉",
        description: "Congratulations! You've earned 50 XP for completing this course!"
      });
    },
    onError: (error) => {
      console.error('Error completing course:', error);
      toast({
        title: "Error",
        description: "Failed to complete course. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update course progress
  const updateProgress = useMutation({
    mutationFn: async ({ courseId, progressPercentage, timeSpent }: { 
      courseId: string; 
      progressPercentage?: number; 
      timeSpent?: number;
    }) => {
      const userId = await getUserId();

      const updateData: Record<string, unknown> = {
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (progressPercentage !== undefined) {
        updateData.progress_percentage = progressPercentage;
      }

      if (timeSpent !== undefined) {
        updateData.time_spent_hours = timeSpent;
      }

      return updateCourseProgressRow(userId, courseId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_PROGRESS(undefined, trackId) });
    },
    onError: (error) => {
      console.error('Error updating progress:', error);
    }
  });

  // Helper functions
  const getProgressForCourse = (courseId: string): CourseProgress | undefined => {
    return courseProgress?.find(p => p.course_id === courseId);
  };

  const getProgressStatus = (courseId: string): CourseProgress['status'] => {
    const progress = getProgressForCourse(courseId);
    return progress?.status || 'not_started';
  };

  const getTotalCompletedCourses = (): number => {
    return courseProgress?.filter(p => p.status === 'completed').length || 0;
  };

  const getTotalXPFromCourses = (): number => {
    return courseProgress?.reduce((total, p) => {
      if (p.status === 'completed') {
        return total + 50;
      }
      return total + p.xp_awarded;
    }, 0) || 0;
  };

  const getInProgressCourses = (): CourseProgress[] => {
    return courseProgress?.filter(p => p.status === 'in_progress') || [];
  };

  const getCompletedCourses = (): CourseProgress[] => {
    return courseProgress?.filter(p => p.status === 'completed') || [];
  };

  return {
    courseProgress,
    milestones,
    isLoading,
    startCourse,
    completeCourse,
    updateProgress,
    getProgressForCourse,
    getProgressStatus,
    getTotalCompletedCourses,
    getTotalXPFromCourses,
    getInProgressCourses,
    getCompletedCourses
  };
}
