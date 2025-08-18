import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Get course progress for the current user, optionally filtered by track
  const { data: courseProgress, isLoading } = useQuery({
    queryKey: ['course-progress', trackId],
    queryFn: async () => {
      // Support both dev login and real auth
      const devUser = localStorage.getItem("devUser");
      let userId: string;
      
      if (devUser) {
        const parsedDevUser = JSON.parse(devUser);
        userId = parsedDevUser.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      let query = supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', userId);

      // Filter by track if provided
      if (trackId) {
        query = query.eq('track_id', trackId);
      }

      const { data: progressData, error } = await query
        .order('last_accessed_at', { ascending: false });

      if (error) throw error;

      // Fetch course information for each course_id
      const courseIds = progressData?.map(p => p.course_id) || [];
      
      const { data: coursesData } = await supabase
        .from('recommended_courses')
        .select('id, title, platform')
        .in('id', courseIds);

      // Create a map for quick course lookup
      const coursesMap = new Map(coursesData?.map(course => [course.id, course]) || []);

      // Transform the data to include course information
      const transformedData = progressData?.map(progress => ({
        ...progress,
        title: coursesMap.get(progress.course_id)?.title,
        platform: coursesMap.get(progress.course_id)?.platform
      })) || [];
      
      return transformedData as CourseProgress[];
    },
    enabled: true
  });

  // Get learning milestones
  const { data: milestones } = useQuery({
    queryKey: ['learning-milestones'],
    queryFn: async () => {
      // Support both dev login and real auth
      const devUser = localStorage.getItem("devUser");
      let userId: string;
      
      if (devUser) {
        const parsedDevUser = JSON.parse(devUser);
        userId = parsedDevUser.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('learning_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      return data as LearningMilestone[];
    },
    enabled: true
  });

  // Start course progress
  const startCourse = useMutation({
    mutationFn: async ({ courseId, trackId: courseTrackId }: { courseId: string; trackId?: string }) => {
      // Support both dev login and real auth
      const devUser = localStorage.getItem("devUser");
      let userId: string;
      
      if (devUser) {
        const parsedDevUser = JSON.parse(devUser);
        userId = parsedDevUser.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const { data, error } = await supabase.rpc('start_course_progress', {
        user_id_param: userId,
        course_id_param: courseId
      });

      // Update with track_id if provided
      if (courseTrackId && data) {
        await supabase
          .from('course_progress')
          .update({ track_id: courseTrackId })
          .eq('user_id', userId)
          .eq('course_id', courseId);
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-level'] });
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
      // Support both dev login and real auth
      const devUser = localStorage.getItem("devUser");
      let userId: string;
      
      if (devUser) {
        const parsedDevUser = JSON.parse(devUser);
        userId = parsedDevUser.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const { data, error } = await supabase.rpc('complete_course_progress', {
        user_id_param: userId,
        course_id_param: courseId,
        completion_notes_param: notes || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['learning-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['user-level'] });
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
      // Support both dev login and real auth
      const devUser = localStorage.getItem("devUser");
      let userId: string;
      
      if (devUser) {
        const parsedDevUser = JSON.parse(devUser);
        userId = parsedDevUser.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const updateData: any = {
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (progressPercentage !== undefined) {
        updateData.progress_percentage = progressPercentage;
      }

      if (timeSpent !== undefined) {
        updateData.time_spent_hours = timeSpent;
      }

      const { data, error } = await supabase
        .from('course_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
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
        return total + 50; // XP_REWARDS.COURSE_COMPLETED
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