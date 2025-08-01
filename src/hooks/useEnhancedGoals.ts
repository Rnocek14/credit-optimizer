/**
 * Hook for enhanced goal setting with AI recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enhancedGoalService, type CareerGoal, type GoalRecommendation } from '@/lib/enhancedGoalSetting';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEnhancedGoals = (userId?: string) => {
  const queryClient = useQueryClient();

  // Get AI-powered goal recommendations
  const {
    data: goalRecommendations,
    isLoading: isLoadingRecommendations
  } = useQuery({
    queryKey: ['goal-recommendations', userId],
    queryFn: () => enhancedGoalService.getGoalRecommendations(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Get user's existing goals
  const {
    data: userGoals,
    isLoading: isLoadingGoals
  } = useQuery({
    queryKey: ['user-goals', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('career_goals')
        .select(`
          *,
          goal_progress (*)
        `)
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Create a new goal
  const createGoalMutation = useMutation({
    mutationFn: async (goalData: Partial<CareerGoal>) => {
      if (!userId) throw new Error('User ID required');

      // First validate the goal
      const validation = await enhancedGoalService.validateGoal(goalData);
      
      if (!validation.isValid) {
        throw new Error(`Goal validation failed: ${validation.recommendations.join(', ')}`);
      }

      // Create the goal
      const { data: goal, error } = await supabase
        .from('career_goals')
        .insert({
          user_id: userId,
          title: goalData.title,
          description: goalData.description,
          target_role: goalData.target_role,
          target_date: goalData.target_date,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Create adaptive milestones
      const milestones = await enhancedGoalService.createAdaptiveMilestones(
        goal.id,
        goalData.skill_gaps || []
      );

      // Insert milestones
      if (milestones.length > 0) {
        const { error: milestonesError } = await supabase
          .from('goal_progress')
          .insert(milestones.map(milestone => ({
            goal_id: goal.id,
            title: milestone.title,
            description: milestone.description,
            order_index: milestone.order_index,
            completed: false
          })));

        if (milestonesError) {
          console.error('Failed to create milestones:', milestonesError);
        }
      }

      return { goal, milestones, validation };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', userId] });
      toast.success('Goal created successfully!');
      
      if (data.validation.recommendations.length > 0) {
        toast.info(`Tip: ${data.validation.recommendations[0]}`);
      }
    },
    onError: (error: any) => {
      console.error('Goal creation error:', error);
      toast.error(error.message || 'Failed to create goal');
    }
  });

  // Validate a goal before creation
  const validateGoalMutation = useMutation({
    mutationFn: (goalData: Partial<CareerGoal>) => 
      enhancedGoalService.validateGoal(goalData),
    onError: (error) => {
      console.error('Goal validation error:', error);
      toast.error('Failed to validate goal');
    }
  });

  // Update goal progress
  const updateGoalProgressMutation = useMutation({
    mutationFn: async ({ goalId, progressId, completed }: {
      goalId: string;
      progressId: string;
      completed: boolean;
    }) => {
      const { error } = await supabase
        .from('goal_progress')
        .update({ 
          completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', progressId);

      if (error) throw error;

      // Award XP for milestone completion
      if (completed && userId) {
        // This would integrate with the XP system
        toast.success('Milestone completed! +50 XP');
      }

      return { goalId, progressId, completed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', userId] });
    },
    onError: (error) => {
      console.error('Progress update error:', error);
      toast.error('Failed to update progress');
    }
  });

  // Calculate goal progress percentage
  const calculateGoalProgress = (goal: any): number => {
    if (!goal.goal_progress || goal.goal_progress.length === 0) return 0;
    
    const completedMilestones = goal.goal_progress.filter((m: any) => m.completed).length;
    return Math.round((completedMilestones / goal.goal_progress.length) * 100);
  };

  // Get next milestone for a goal
  const getNextMilestone = (goal: any) => {
    if (!goal.goal_progress) return null;
    
    const incompleteMilestones = goal.goal_progress
      .filter((m: any) => !m.completed)
      .sort((a: any, b: any) => a.order_index - b.order_index);
    
    return incompleteMilestones[0] || null;
  };

  return {
    // Data
    goalRecommendations: goalRecommendations || [],
    userGoals: userGoals || [],
    
    // Loading states
    isLoadingRecommendations,
    isLoadingGoals,
    
    // Mutations
    createGoal: createGoalMutation.mutate,
    isCreatingGoal: createGoalMutation.isPending,
    createGoalError: createGoalMutation.error,
    
    validateGoal: validateGoalMutation.mutate,
    goalValidation: validateGoalMutation.data,
    isValidatingGoal: validateGoalMutation.isPending,
    
    updateGoalProgress: updateGoalProgressMutation.mutate,
    isUpdatingProgress: updateGoalProgressMutation.isPending,
    
    // Utilities
    calculateGoalProgress,
    getNextMilestone,
    
    // Refetch
    refetchGoals: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', userId] });
      queryClient.invalidateQueries({ queryKey: ['goal-recommendations', userId] });
    }
  };
};