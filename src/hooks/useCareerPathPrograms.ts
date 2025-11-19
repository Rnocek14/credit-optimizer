import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CareerPathProgram } from '@/types/career';

/**
 * Hook to fetch program mappings for a specific career path
 * Returns degree programs (with anchor schools) recommended for a career
 * 
 * NOTE: Table 'career_path_programs' must be created via migration first
 */
export function useCareerPathPrograms(careerPathId?: string) {
  return useQuery({
    queryKey: ['career-path-programs', careerPathId],
    queryFn: async () => {
      if (!careerPathId) return [];
      
      // @ts-ignore - Table will exist after migration, types auto-generated
      const { data, error } = await supabase
        .from('career_path_programs' as any)
        .select('*')
        .eq('career_path_id', careerPathId)
        .or('valid_until.is.null,valid_until.gt.now()')
        .order('strength', { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as unknown as CareerPathProgram[];
    },
    enabled: !!careerPathId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch all career-program mappings (for admin/debugging)
 */
export function useAllCareerPathPrograms() {
  return useQuery({
    queryKey: ['career-path-programs', 'all'],
    queryFn: async () => {
      // @ts-ignore - Table will exist after migration, types auto-generated
      const { data, error } = await supabase
        .from('career_path_programs' as any)
        .select('*')
        .or('valid_until.is.null,valid_until.gt.now()')
        .order('strength', { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as unknown as CareerPathProgram[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
