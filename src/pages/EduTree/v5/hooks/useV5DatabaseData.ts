import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { transformToModuleData } from '../utils/transformDbToV5';
import type { ModuleData } from '../types/v5';

interface UseV5DatabaseDataOptions {
  programId?: string;
  enabled?: boolean;
}

export function useV5DatabaseData(options: UseV5DatabaseDataOptions = {}) {
  const { programId = 'bs_cs', enabled = true } = options;

  return useQuery({
    queryKey: ['v5-program-data', programId],
    queryFn: async () => {
      // 1. Fetch all requirements for this program
      const { data: requirements, error: reqError } = await supabase
        .from('program_requirements')
        .select('id, year, category, name, description, credits_required')
        .eq('program_id', programId)
        .order('year', { ascending: true });

      if (reqError) throw reqError;
      if (!requirements || requirements.length === 0) {
        return { modulesByYear: { 1: [], 2: [], 3: [], 4: [] } };
      }

      // 2. Fetch all options for these requirements with joined course data
      const requirementIds = requirements.map((r) => r.id);
      const { data: options, error: optsError } = await supabase
        .from('requirement_options')
        .select(`
          id,
          requirement_id,
          option_kind,
          option_ref_id,
          credits_awarded,
          edu_courses:option_ref_id (
            id,
            code,
            title,
            credits
          ),
          marketplace_courses:option_ref_id (
            id,
            code,
            title,
            credits,
            cost_usd,
            duration_weeks,
            provider_id
          )
        `)
        .in('requirement_id', requirementIds);

      if (optsError) throw optsError;

      // 3. Transform to V5 format
      const modulesByYear = transformToModuleData(
        requirements as any,
        options as any || []
      );

      return { modulesByYear };
    },
    enabled,
    staleTime: 60_000, // Cache for 1 minute
  });
}
