import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAnchorPolicy } from '@/pages/EduTree/v5/data/anchorPolicies';

/**
 * Fetch Edu-Tree V5 data specifically for career exploration
 * Returns data in the format expected by generateDegreeTemplate
 * 
 * Unlike useV5DatabaseData (which is planner-focused), this:
 * - Doesn't require user basket/progress
 * - Uses generic constraints
 * - Focuses on single program + anchor school
 */
export function useCareerV5Data(programId: string, anchorSchool: string) {
  return useQuery({
    queryKey: ['career-v5-data', programId, anchorSchool],
    enabled: !!programId && !!anchorSchool,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      console.log('[useCareerV5Data] Fetching data for:', { programId, anchorSchool });

      // 1) Program requirements (these become "modules" in the engine)
      const { data: modules, error: modulesError } = await supabase
        .from('program_requirements')
        .select('*')
        .eq('program_id', programId);

      if (modulesError) {
        console.error('[useCareerV5Data] program_requirements error:', modulesError);
        throw modulesError;
      }

      console.log('[useCareerV5Data] Modules fetched:', modules?.length || 0);

      // 2) Requirement blocks (for GE/Core/Elective gating)
      const { data: blocks, error: blocksError } = await supabase
        .from('requirement_blocks')
        .select('*');

      if (blocksError) {
        console.warn('[useCareerV5Data] requirement_blocks error, continuing with empty blocks:', blocksError);
      }

      console.log('[useCareerV5Data] Blocks fetched:', blocks?.length || 0);

      // 3) All marketplace options (requirement_options + educational_courses joined)
      const { data: allOptions, error: optionsError } = await supabase
        .from('requirement_options')
        .select(`
          *,
          educational_courses (*)
        `);

      if (optionsError) {
        console.warn('[useCareerV5Data] requirement_options error, continuing with empty options:', optionsError);
      }

      console.log('[useCareerV5Data] Options fetched:', allOptions?.length || 0);

      // 4) Anchor policy from constants
      const anchorPolicy = getAnchorPolicy(anchorSchool);

      if (!anchorPolicy) {
        console.warn('[useCareerV5Data] No anchor policy found for:', anchorSchool);
      }

      const result = {
        modules: modules ?? [],
        blocks: blocks ?? [],
        allOptions: allOptions ?? [],
        anchorPolicy,
        constraints: {
          target_school: anchorSchool,
          target_program_id: programId,
          // Add other default constraints as needed
        },
        basket: [], // Empty basket for fresh career exploration
        years: 4,
      };

      console.log('[useCareerV5Data] Final context:', {
        modulesCount: result.modules.length,
        blocksCount: result.blocks.length,
        optionsCount: result.allOptions.length,
        hasAnchorPolicy: !!result.anchorPolicy,
      });

      return result;
    },
  });
}
