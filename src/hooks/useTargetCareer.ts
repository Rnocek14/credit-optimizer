/**
 * useTargetCareer — resolves the target career name from an active plan.
 *
 * Given a careerId (from user_plans.target_career_id), fetches the
 * career_paths title so the planner can display "Building your path to {title}".
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTargetCareer(careerId: string | null | undefined) {
  return useQuery({
    queryKey: ['target-career', careerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_paths')
        .select('id, title, key_skills')
        .eq('id', careerId!)
        .single();

      if (error) throw error;
      return data as { id: string; title: string; key_skills: string[] | null };
    },
    enabled: !!careerId,
    staleTime: 10 * 60 * 1000, // career names don't change
  });
}
