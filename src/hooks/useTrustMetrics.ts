import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      const { error: rpcError } = await supabase.rpc('upsert_user_trust_metrics', {
        user_id_param: userId,
        days_back: 90
      });
      if (rpcError) {
        console.error('Trust metrics upsert error:', rpcError);
      }

      const { data: row, error: selectError } = await supabase
        .from('user_trust_metrics')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) throw selectError;
      return { metrics: (row as unknown as TrustMetrics) || null };
    }
  });

  const refresh = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user');
      const { error } = await supabase.rpc('upsert_user_trust_metrics', {
        user_id_param: userId,
        days_back: 90
      });
      if (error) throw error;
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
