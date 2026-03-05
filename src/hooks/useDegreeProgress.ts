/**
 * useDegreeProgress — real degree progress from plan courses + program requirements.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchDegreeProgress } from '@/shared/lib/api/degreeProgress';
import { useActivePlan } from './useActivePlan';

export function useDegreeProgress() {
  const { data: activePlan, isLoading: planLoading } = useActivePlan();

  const query = useQuery({
    queryKey: ['degree-progress', activePlan?.id, activePlan?.program_id],
    queryFn: () => fetchDegreeProgress(activePlan!.id, activePlan?.program_id ?? null),
    enabled: !!activePlan?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    planId: activePlan?.id ?? null,
    planName: activePlan?.name ?? null,
    isLoadingPlan: planLoading,
  };
}
