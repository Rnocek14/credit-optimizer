import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RequirementOptionSummary {
  optionsCount: number;
  hasAceCredit: boolean;
  hasClep: boolean;
}

export function useRequirementOptionSummary(requirementId: string) {
  return useQuery({
    queryKey: ['requirement-options-summary', requirementId],
    queryFn: async (): Promise<RequirementOptionSummary> => {
      const { data, error } = await supabase
        .from('requirement_option_counts')
        .select('*')
        .eq('requirement_id', requirementId)
        .maybeSingle();

      if (error) throw error;

      return {
        optionsCount: data?.options_count || 0,
        hasAceCredit: data?.has_ace_credit || false,
        hasClep: data?.has_clep || false,
      };
    },
    enabled: !!requirementId,
  });
}

export interface CourseOption {
  requirement_id: string;
  option_kind: string;
  course_id: string;
  title: string;
  credits: number;
  cost_usd: number;
  duration_weeks: number;
  modality: string;
  cri_score: number;
  level: number;
  skill_tags: string[];
  provider_id: string;
  provider_name: string;
  provider_type: string;
  transfer_fit: 'excellent' | 'good' | 'fair';
}

export interface CourseSearchFilters {
  providerTypes?: string[];
  maxCost?: number;
  modality?: string[];
  minCriScore?: number;
}

export function useRequirementOptions(
  requirementId: string,
  filters?: CourseSearchFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['requirement-options', requirementId, JSON.stringify(filters)],
    queryFn: async (): Promise<CourseOption[]> => {
      let query = supabase
        .from('requirement_options_view')
        .select('*')
        .eq('requirement_id', requirementId);

      // Apply filters with guards
      if (filters?.providerTypes?.length && filters.providerTypes.length > 0) {
        query = query.in('provider_type', filters.providerTypes as any);
      }
      if (filters?.maxCost) {
        query = query.lte('cost_usd', filters.maxCost);
      }
      if (filters?.modality?.length && filters.modality.length > 0) {
        query = query.in('modality', filters.modality as any);
      }
      if (filters?.minCriScore) {
        query = query.gte('cri_score', filters.minCriScore);
      }

      const { data, error } = await query.order('transfer_fit', { ascending: false });

      if (error) throw error;
      return data as CourseOption[];
    },
    enabled: options?.enabled ?? !!requirementId,
  });
}
