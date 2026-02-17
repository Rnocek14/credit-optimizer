import { useQuery } from '@tanstack/react-query';
import { fetchUserPlanSelections } from '@/shared/lib/api';

export function useUserPlanSelections(planId?: string) {
  return useQuery({
    queryKey: ['user-plan-selections', planId],
    queryFn: () => fetchUserPlanSelections(planId!),
    enabled: !!planId,
    staleTime: 30_000,
  });
}
