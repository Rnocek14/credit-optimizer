import { useQuery } from '@tanstack/react-query';
import {
  fetchRequirementOptionSummary,
  fetchRequirementOptions,
} from '@/shared/lib/api';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { CourseOption, CourseSearchFilters } from '@/shared/lib/api';

export type { CourseOption, CourseSearchFilters };

interface RequirementOptionSummary {
  optionsCount: number;
  hasAceCredit: boolean;
  hasClep: boolean;
}

export function useRequirementOptionSummary(requirementId: string) {
  return useQuery({
    queryKey: ['requirement-options-summary', requirementId],
    queryFn: async (): Promise<RequirementOptionSummary> => {
      const data = await fetchRequirementOptionSummary(requirementId);
      return {
        optionsCount: data?.options_count ?? 0,
        hasAceCredit: data?.has_ace_credit ?? false,
        hasClep: data?.has_clep ?? false,
      };
    },
    enabled: !!requirementId,
  });
}

export function useRequirementOptions(
  requirementId: string,
  filters?: CourseSearchFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.BATCH_REQUIREMENT_OPTIONS([requirementId]),
    queryFn: () => fetchRequirementOptions(requirementId, filters),
    enabled: options?.enabled ?? !!requirementId,
  });
}
