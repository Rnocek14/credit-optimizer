import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingData {
  career_goal: string;
  target_role: string;
  location: string;
}

interface OnboardingResult {
  success: boolean;
  score: number;
  score_bucket: string;
  insights: string[];
  referralCode: string;
  onboarding_id: string;
}

export function useOnboardingSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnboardingData): Promise<OnboardingResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const { data: result, error } = await supabase.functions.invoke('onboarding-submit', {
        body: data,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      if (!result.success) {
        throw new Error(result.error || 'Onboarding submission failed');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate quota check to update usage
      queryClient.invalidateQueries({ queryKey: ['quota-check'] });
    },
  });
}