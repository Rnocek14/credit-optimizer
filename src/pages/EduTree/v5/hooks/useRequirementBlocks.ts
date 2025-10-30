import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RequirementBlock } from '@/lib/types/eduTree';

/**
 * Fetch requirement blocks for a given program
 * Used by year planner and degree scope analysis
 */
export function useRequirementBlocks(programId?: string, enabled = true) {
  return useQuery({
    queryKey: ['v5-requirement-blocks', programId],
    enabled: !!programId && enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    queryFn: async () => {
      if (!programId) return [];
      
      const { data, error } = await supabase
        .from('requirement_blocks')
        .select('*')
        .eq('program_id', programId)
        .order('level_year', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) {
        console.error('[useRequirementBlocks] Query error:', error);
        throw error;
      }
      
      console.log('[useRequirementBlocks] Fetched blocks:', {
        programId,
        blockCount: data?.length ?? 0,
        blocks: data?.map(b => ({ id: b.id, title: b.title, slug: b.slug }))
      });
      
      return (data as RequirementBlock[]) ?? [];
    },
  });
}
