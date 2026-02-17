import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { getAnchorPolicy } from '@/lib/degree/institutionPolicies';
import {
  fetchProgramRequirements,
  fetchRequirementBlocks,
  fetchRequirementOptionsWithCourses,
} from '@/shared/lib/api/edutree';

/**
 * Fetch Edu-Tree V5 data specifically for career exploration.
 * Returns data in the format expected by generateDegreeTemplate.
 *
 * Unlike useV5DatabaseData (which is planner-focused), this:
 * - Doesn't require user basket/progress
 * - Uses generic constraints
 * - Focuses on single program + anchor school
 */
export function useCareerV5Data(programId: string, anchorSchool: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CAREER_V5_DATA(programId, anchorSchool),
    enabled: !!programId && !!anchorSchool,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const [modules, blocks, allOptions] = await Promise.all([
        fetchProgramRequirements(programId),
        fetchRequirementBlocks({ ordered: false }),
        fetchRequirementOptionsWithCourses(),
      ]);

      const anchorPolicy = getAnchorPolicy(anchorSchool);

      return {
        modules,
        blocks,
        allOptions,
        anchorPolicy,
        constraints: {
          target_school: anchorSchool,
          target_program_id: programId,
        },
        basket: [],
        years: 4,
      };
    },
  });
}
