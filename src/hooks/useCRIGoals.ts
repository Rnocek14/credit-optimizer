/**
 * Hook for managing user CRI goals
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CRIGoal {
  id: string;
  user_id: string;
  target_cri: number;
  created_at: string;
  updated_at: string;
}

export const useCRIGoals = (userId?: string) => {
  const queryClient = useQueryClient();

  // Get user's CRI goal
  const { data: criGoal, isLoading } = useQuery({
    queryKey: ['cri-goal', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_cri_goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as CRIGoal | null;
    },
    enabled: !!userId
  });

  // Set or update CRI goal
  const updateGoalMutation = useMutation({
    mutationFn: async (targetCRI: number) => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('user_cri_goals')
        .upsert({
          user_id: userId,
          target_cri: targetCRI
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cri-goal', userId] });
      toast.success('CRI goal updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating CRI goal:', error);
      toast.error('Failed to update CRI goal');
    }
  });

  const targetCRI = criGoal?.target_cri || 80; // Default to 80

  return {
    criGoal,
    targetCRI,
    isLoading,
    updateGoal: updateGoalMutation.mutate,
    isUpdating: updateGoalMutation.isPending
  };
};