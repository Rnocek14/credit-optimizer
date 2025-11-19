import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCareerPathPrograms } from './useCareerPathPrograms';
import type { DegreeTemplate, DegreeOptimizationMode } from '@/pages/EduTree/v5/engine/degreeTemplateGenerator';

interface CareerPath {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  average_salary: number | null;
  baseline_salary: number | null;
  industry: string | null;
}

interface DegreeTemplatesByMode {
  balanced?: DegreeTemplate;
  cheapest?: DegreeTemplate;
  fastest?: DegreeTemplate;
}

interface DegreeOptionWithRoi {
  templates: DegreeTemplatesByMode;
  primaryTemplate: DegreeTemplate;
  roi: {
    paybackYears: number | null;
    roiMultiple: number | null;
  };
  programId: string;
  anchorSchool: string;
}

interface UseCareerDegreeOptionsResult {
  career: CareerPath | null;
  degreeOptions: DegreeOptionWithRoi[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Simple ROI estimator – adapt to your existing Market Intelligence utils if needed.
 */
function estimateDegreeRoi(params: {
  totalCostUsd: number;
  totalWeeks: number;
  careerSalary?: number | null;
  baselineSalary?: number | null;
}): { paybackYears: number | null; roiMultiple: number | null } {
  const { totalCostUsd, totalWeeks, careerSalary, baselineSalary } = params;

  if (!careerSalary || careerSalary <= 0 || totalCostUsd <= 0) {
    return { paybackYears: null, roiMultiple: null };
  }

  const baseline = baselineSalary && baselineSalary > 0 ? baselineSalary : 45000;
  const uplift = careerSalary - baseline;
  if (uplift <= 0) return { paybackYears: null, roiMultiple: null };

  const paybackYears = totalCostUsd / uplift;
  const programYears = totalWeeks > 0 ? totalWeeks / 52 : 4;
  const roiMultiple = (uplift * programYears) / totalCostUsd;

  return { paybackYears, roiMultiple };
}

export function useCareerDegreeOptions(
  careerPathId?: string
): UseCareerDegreeOptionsResult {
  const {
    data: mappings,
    isLoading: isMappingsLoading,
    error: mappingsError,
  } = useCareerPathPrograms(careerPathId);

  const {
    data: career,
    isLoading: isCareerLoading,
    error: careerError,
  } = useQuery({
    queryKey: ['career-path', careerPathId],
    queryFn: async () => {
      if (!careerPathId) return null;

      // @ts-ignore - Table exists after migration
      const { data, error } = await supabase
        .from('career_paths' as any)
        .select('*')
        .eq('id', careerPathId)
        .single();

      if (error) throw error;
      return data as unknown as CareerPath;
    },
    enabled: !!careerPathId,
  });
  
  const isLoading = isCareerLoading || isMappingsLoading;

  const { data: degreeOptions, error: degreeError } = useQuery({
    queryKey: ['career-degree-options', careerPathId],
    enabled: !!careerPathId && !!career && !!mappings?.length,
    queryFn: async () => {
      if (!careerPathId || !career || !mappings?.length) return [];

      // For Phase 2.5: Use mock templates with fallback to real data when available
      // Full integration will require connecting to the complete V5 data pipeline
      console.log('[CareerDegreeOptions] Generating degree templates for career:', career.title);

      // Fetch program requirements
      const { data: modules } = await supabase
        .from('program_requirements')
        .select('*')
        .in('program_id', mappings.map(m => m.program_id));

      const modes: DegreeOptimizationMode[] = ['balanced', 'cheapest', 'fastest'];
      const results: DegreeOptionWithRoi[] = [];

      for (const mapping of mappings) {
        const programModules = modules?.filter(m => m.program_id === mapping.program_id) ?? [];

        const templatesByMode: DegreeTemplatesByMode = {};

        // Generate mock templates for each optimization mode
        for (const mode of modes) {
          const costMultiplier = mode === 'cheapest' ? 0.85 : mode === 'fastest' ? 1.1 : 1.0;
          const timeMultiplier = mode === 'fastest' ? 0.75 : mode === 'cheapest' ? 1.15 : 1.0;
          
          templatesByMode[mode] = {
            id: `${mapping.program_id}_${mapping.anchor_school}_${mode}`,
            programId: mapping.program_id,
            anchorSchool: mapping.anchor_school,
            optimization: mode,
            label: `${mapping.program_id.toUpperCase()} @ ${mapping.anchor_school.toUpperCase()} • ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
            yearTemplates: [],
            totals: {
              credits: 120,
              costUsd: Math.round((mapping.anchor_school === 'TESU' ? 8200 : 
                       mapping.anchor_school === 'WGU' ? 9500 : 10800) * costMultiplier),
              weeks: Math.round((mapping.anchor_school === 'WGU' ? 130 : 156) * timeMultiplier),
              avgCri: mode === 'cheapest' ? 68 : mode === 'fastest' ? 72 : 75,
            },
          };
        }

        const primaryTemplate = templatesByMode.balanced ?? templatesByMode.cheapest ?? templatesByMode.fastest;
        if (!primaryTemplate) continue;

        const roi = estimateDegreeRoi({
          totalCostUsd: primaryTemplate.totals.costUsd,
          totalWeeks: primaryTemplate.totals.weeks,
          careerSalary: career.average_salary,
          baselineSalary: career.baseline_salary,
        });

        results.push({
          templates: templatesByMode,
          primaryTemplate,
          roi,
          programId: mapping.program_id,
          anchorSchool: mapping.anchor_school,
        });
      }

      return results;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    career: career ?? null,
    degreeOptions: degreeOptions ?? [],
    isLoading,
    error: (careerError || mappingsError || degreeError) as Error | null,
  };
}

export type { DegreeTemplatesByMode, DegreeOptionWithRoi };
