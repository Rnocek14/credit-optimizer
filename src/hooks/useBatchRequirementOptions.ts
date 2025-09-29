import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBatchRequirementOptions(requirementIds: string[]) {
  return useQuery({
    queryKey: ['req-opt-batch', requirementIds],
    queryFn: async () => {
      if (!requirementIds.length) return new Map<string, any>();
      
      // DEBUG: Expose IDs for console probing
      if (typeof window !== 'undefined') {
        (window as any).__lastReqIds = requirementIds;
        console.log('[MP-BATCH] Fetching for block IDs:', requirementIds);
      }
      
      const { data, error } = await supabase
        .from('requirement_option_counts_by_block')
        .select('*')
        .in('block_id', requirementIds);
      
      if (error) throw error;
      
      // DEBUG: Show result size
      console.log('[MP-BATCH] Query returned', (data ?? []).length, 'rows');
      
      return new Map(
        (data ?? []).map(d => [d.block_id, {
          optionsCount: d.options_count,
          hasAceCredit: d.has_ace_credit,
          hasClep: d.has_clep
        }])
      );
    },
    enabled: requirementIds.length > 0,
    staleTime: 5 * 60_000,
  });
}
