import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmartWeights } from './explorationApi';

export type WeightsRow = SmartWeights & {
  id: number;
  version: number;
  active: boolean;
  notes: string | null;
  activated_at: string | null;
  created_at: string;
};

export function useSmartWeights() {
  return useQuery({
    queryKey: ['smart-weights', 'active'],
    queryFn: async (): Promise<WeightsRow | null> => {
      // @ts-ignore - RPC will be available after running SQL migration
      const { data, error } = await supabase.rpc('get_active_re_rank_weights');
      if (error) throw error;
      return (data as WeightsRow) ?? null;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
