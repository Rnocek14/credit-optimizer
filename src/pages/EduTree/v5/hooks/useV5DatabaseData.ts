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

      // 2. Fetch all options for these requirements
      const requirementIds = requirements.map((r) => r.id);
      const { data: options, error: optsError } = await supabase
        .from('requirement_options')
        .select(`
          id,
          requirement_id,
          option_kind,
          option_ref_id,
          credits_awarded
        `)
        .in('requirement_id', requirementIds);

      if (optsError) throw optsError;

      // 3. Fetch edu courses and marketplace courses separately
      // Note: We fetch all course IDs and check both tables since option_kind is generic ("course", "exam", "cert")
      const allOptionIds = options?.map(o => o.option_ref_id) || [];

      const { data: eduCourses } = await supabase
        .from('edu_courses')
        .select('id, code, title, credits')
        .in('id', allOptionIds.length > 0 ? allOptionIds : ['']);

      const { data: marketplaceCourses } = await supabase
        .from('marketplace_courses')
        .select('id, code, title, credits, cost_usd, duration_weeks, provider_id')
        .in('id', allOptionIds.length > 0 ? allOptionIds : ['']);

      // 4. Enrich options with course data (try edu_courses first, then marketplace_courses)
      const enrichedOptions = options?.map(opt => {
        const eduCourse = eduCourses?.find(c => c.id === opt.option_ref_id);
        const mkCourse = marketplaceCourses?.find(c => c.id === opt.option_ref_id);
        return {
          ...opt,
          edu_courses: eduCourse || null,
          marketplace_courses: mkCourse || null
        };
      }) || [];

      // 5. Transform to V5 format
      const modulesByYear = transformToModuleData(
        requirements as any,
        enrichedOptions as any
      );

      return { modulesByYear };
    },
    enabled,
    staleTime: 0,
    refetchOnMount: 'always'
  });
}
