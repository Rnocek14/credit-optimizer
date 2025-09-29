import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanEvaluation {
  credits_total: number;
  credits_by_category: {
    general_education?: number;
    core?: number;
    electives?: number;
    [key: string]: number | undefined;
  };
  transfer_used: number;
  transfer_cap: number;
  residency_progress: number;
  residency_required: number;
  upper_division_credits: number;
  estimated_cost: number;
  warnings: string[];
}

export function useEvaluatePlan(planId?: string) {
  return useQuery<PlanEvaluation>({
    queryKey: ['evaluate-plan', planId],
    queryFn: async () => {
      if (!planId) throw new Error('Plan ID required');
      
      const { data, error } = await supabase.functions.invoke('evaluate-plan', {
        body: { planId }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
    staleTime: 30_000,
  });
}
