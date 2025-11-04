/**
 * React hook for exploration analytics with React Query integration
 * Handles loading states, errors, and automatic refetching
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  getExplorationAnalytics, 
  type ExplorationParams,
  type BucketSplitRow,
  type FunnelRow,
  type DailyRow
} from './explorationApi';

export interface UseExplorationAnalyticsOptions extends ExplorationParams {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export interface ExplorationAnalyticsData {
  split: BucketSplitRow[];
  funnel: FunnelRow[];
  daily: DailyRow[];
}

/**
 * Hook to fetch exploration analytics with automatic error handling and caching
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useExplorationAnalytics({
 *   since: '21 days',
 *   moduleCategory: 'gen_ed',
 *   planYear: 1,
 *   providerType: 'ACE'
 * });
 * ```
 */
export function useExplorationAnalytics(options: UseExplorationAnalyticsOptions = {}) {
  const { enabled = true, refetchInterval = false, ...params } = options;

  return useQuery<ExplorationAnalyticsData>({
    queryKey: ['exploration-analytics', params],
    queryFn: () => getExplorationAnalytics(supabase, params),
    enabled,
    refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Helper hook to fetch only bucket split data
 */
export function useBucketSplit(params?: ExplorationParams) {
  return useQuery({
    queryKey: ['exploration-bucket-split', params],
    queryFn: async () => {
      const { split } = await getExplorationAnalytics(supabase, params);
      return split;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Helper hook to fetch only funnel data
 */
export function useFunnel(params?: ExplorationParams) {
  return useQuery({
    queryKey: ['exploration-funnel', params],
    queryFn: async () => {
      const { funnel } = await getExplorationAnalytics(supabase, params);
      return funnel;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Helper hook to fetch only daily rollup data
 */
export function useDailyRollup(params?: Omit<ExplorationParams, 'since'> & { days?: number }) {
  return useQuery({
    queryKey: ['exploration-daily', params],
    queryFn: async () => {
      const { daily } = await getExplorationAnalytics(supabase, params);
      return daily;
    },
    staleTime: 5 * 60 * 1000,
  });
}
