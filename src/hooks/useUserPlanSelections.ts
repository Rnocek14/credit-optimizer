import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserPlanSelections(planId?: string) {
  return useQuery({
    queryKey: ['user-plan-selections', planId],
    queryFn: async () => {
      if (!planId) return new Map<string, any>();
      
      const { data, error } = await supabase
        .from('user_plan_courses')
        .select(`
          requirement_id,
          course:marketplace_courses(id, title, cost_usd, provider_id),
          provider:providers!user_plan_courses_provider_id_fkey(name)
        `)
        .eq('plan_id', planId);
      
      if (error) throw error;
      
      return new Map(
        (data ?? []).map(d => [d.requirement_id, {
          id: d.course?.id,
          title: d.course?.title,
          cost: d.course?.cost_usd,
          provider: d.provider?.name
        }])
      );
    },
    enabled: !!planId,
    staleTime: 30_000, // 30 seconds - fresher data for selections
  });
}
