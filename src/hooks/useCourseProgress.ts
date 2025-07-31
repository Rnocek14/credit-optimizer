import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CourseProgress {
  id: string;
  user_id: string;
  course_id: string;
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

export function useCourseProgress() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all course progress for the current user
  const { data: courseProgress, isLoading } = useQuery({
    queryKey: ['course-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false });

      if (error) throw error;
      return data as CourseProgress[];
    },
    enabled: true
  });

  // Get learning milestones
  const { data: milestones } = useQuery({
    queryKey: ['learning-milestones'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('learning_milestones')
        .select('*')
        .eq('user_id', user.id)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      return data as LearningMilestone[];
    },
    enabled: true
  });

  // Start course progress
  const startCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('start_course_progress', {
        user_id_param: user.id,
        course_id_param: courseId
      });

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('complete_course_progress', {
        user_id_param: user.id,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
        .eq('user_id', user.id)
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
    return courseProgress?.reduce((total, p) => total + p.xp_awarded, 0) || 0;
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