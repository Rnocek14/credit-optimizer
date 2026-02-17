import { useQuery } from '@tanstack/react-query';
import { fetchUserPlanSelections } from '@/shared/lib/api';
import { QUERY_KEYS } from '@/lib/queryKeys';

export function useUserPlanSelections(planId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.USER_PLAN_SELECTIONS(planId),
    queryFn: () => fetchUserPlanSelections(planId!),
    enabled: !!planId,
    staleTime: 30_000,
  });
}
