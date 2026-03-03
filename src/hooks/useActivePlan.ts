/**
 * useActivePlan — returns the user's most recent plan.
 *
 * Queries user_plans ordered by created_at DESC, returns the first.
 * Consumers get { planId, planName, isLoading } without threading
 * userId + programId through every component.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';

interface ActivePlan {
  id: string;
  name: string;
  program_id: string;
  target_career_id: string | null;
}

export function useActivePlan() {
  return useQuery({
    queryKey: ['edutree', 'active-plan'],
    queryFn: async (): Promise<ActivePlan | null> => {
      const user = await getCurrentUser();
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_plans')
        .select('id, name, program_id, target_career_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min — plans don't change often
  });
}
