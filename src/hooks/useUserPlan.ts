import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserPlan {
  id: string;
  user_id: string;
  program_id: string;
  name: string; // Changed from plan_name to match DB schema
  target_completion_date?: string;
  created_at: string;
}

interface UserPlanCourse {
  id: string;
  plan_id: string;
  requirement_id: string;
  course_id: string;
  provider_id: string;
  status: string;
  planned_start_date?: string;
}

export function useUserPlan(userId?: string, programId?: string) {
  return useQuery({
    queryKey: ['user-plan', userId, programId],
    queryFn: async (): Promise<UserPlan | null> => {
      if (!userId || !programId) return null;

      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('program_id', programId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!programId,
  });
}

export function useUserPlanCourses(planId?: string) {
  return useQuery({
    queryKey: ['user-plan-courses', planId],
    queryFn: async (): Promise<UserPlanCourse[]> => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('user_plan_courses')
        .select('*')
        .eq('plan_id', planId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!planId,
  });
}

export function useAddCourseToPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      planId,
      requirementId,
      courseId,
      providerId,
    }: {
      planId: string;
      requirementId: string;
      courseId: string;
      providerId: string;
    }) => {
      const { data, error } = await supabase
        .from('user_plan_courses')
        .insert({
          plan_id: planId,
          requirement_id: requirementId,
          course_id: courseId,
          provider_id: providerId,
          status: 'planned',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-plan-courses', variables.planId] });
      toast({
        title: 'Course added to plan',
        description: 'The course has been added to your degree plan.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add course to plan',
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveCourseFromPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ planCourseId }: { planCourseId: string }) => {
      const { error } = await supabase
        .from('user_plan_courses')
        .delete()
        .eq('id', planCourseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-plan-courses'] });
      toast({
        title: 'Course removed',
        description: 'The course has been removed from your plan.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove course',
        variant: 'destructive',
      });
    },
  });
}
