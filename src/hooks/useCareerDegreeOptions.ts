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

interface DegreeOptionWithRoi {
  template: DegreeTemplate;
  roi: {
    paybackYears: number | null;
    roiMultiple: number | null;
  };
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

      // For Phase 2, we'll create mock templates to demonstrate the UI
      // Full integration with useV5DatabaseData will come in Phase 2.5
      const results: DegreeOptionWithRoi[] = [];

      for (const mapping of mappings) {
        // Mock template for demonstration
        const mockTemplate: DegreeTemplate = {
          id: `${mapping.program_id}_${mapping.anchor_school}_balanced`,
          programId: mapping.program_id,
          anchorSchool: mapping.anchor_school,
          optimization: 'balanced' as DegreeOptimizationMode,
          label: `${mapping.program_id.toUpperCase()} @ ${mapping.anchor_school.toUpperCase()} • Balanced`,
          yearTemplates: [],
          totals: {
            credits: 120,
            costUsd: mapping.anchor_school === 'TESU' ? 8200 : 
                     mapping.anchor_school === 'WGU' ? 9500 : 10800,
            weeks: mapping.anchor_school === 'WGU' ? 130 : 156,
            avgCri: 75,
          },
        };

        const roi = estimateDegreeRoi({
          totalCostUsd: mockTemplate.totals.costUsd,
          totalWeeks: mockTemplate.totals.weeks,
          careerSalary: career.average_salary,
          baselineSalary: career.baseline_salary,
        });

        results.push({ template: mockTemplate, roi });
      }

      return results;
    },
  });

  return {
    career: career ?? null,
    degreeOptions: degreeOptions ?? [],
    isLoading,
    error: (careerError || mappingsError || degreeError) as Error | null,
  };
}
