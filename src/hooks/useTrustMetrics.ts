import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  upsertTrustMetrics,
  fetchTrustMetrics,
} from '@/shared/lib/api/userState';

export interface TrustMetrics {
  id?: string;
  user_id: string;
  trust_score: number;
  satisfaction_score: number;
  engagement_score: number;
  recommendation_accuracy: number;
  feedback_volume: number;
  last_calculated_at?: string;
  trend: { week: string; effectiveness: number }[];
}

export function useTrustMetrics(userId?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ metrics: TrustMetrics | null }>({
    queryKey: ['user-trust-metrics', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { metrics: null };

      // Ensure up-to-date aggregate (safe SECURITY DEFINER function)
      try {
        await upsertTrustMetrics(userId, 90);
      } catch (rpcError) {
        console.error('Trust metrics upsert error:', rpcError);
      }

      const row = await fetchTrustMetrics(userId);
      return { metrics: (row as unknown as TrustMetrics) || null };
    }
  });

  const refresh = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user');
      await upsertTrustMetrics(userId, 90);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-trust-metrics', userId] });
      toast.success('Trust metrics refreshed');
    },
    onError: (e: any) => {
      console.error('Failed to refresh trust metrics', e);
      toast.error(e.message || 'Failed to refresh trust metrics');
    }
  });

  return {
    metrics: data?.metrics ?? null,
    isLoading,
    error,
    refresh: refresh.mutate,
    isRefreshing: refresh.isPending
  };
}
