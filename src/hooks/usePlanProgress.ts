/**
 * usePlanProgress — lightweight course-count progress for a plan.
 *
 * Returns { completed, total, percent } based on user_plan_courses statuses.
 * "complete" status counts as done; everything except "dropped" counts toward total.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlanProgress {
  completed: number;
  total: number;
  percent: number;
}

export function usePlanProgress(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['plan-progress', planId],
    queryFn: async (): Promise<PlanProgress> => {
      const { data, error } = await supabase
        .from('user_plan_courses')
        .select('status')
        .eq('plan_id', planId!);

      if (error) throw error;

      const courses = data ?? [];
      const active = courses.filter((c) => c.status !== 'dropped');
      const completed = active.filter((c) => c.status === 'complete').length;
      const total = active.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { completed, total, percent };
    },
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}
