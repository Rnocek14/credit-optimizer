import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCareerPathPrograms } from '@/hooks/useCareerPathPrograms';
import type { CareerPath } from '@/types/career';
import type {
  DegreeTemplate,
  DegreeOptimizationMode,
} from '@/pages/EduTree/v5/engine/degreeTemplateGenerator';

export interface DegreeRoiEstimate {
  paybackYears: number | null;
  roiMultiple: number | null;
}

export type DegreeTemplatesByMode = {
  [mode in DegreeOptimizationMode]?: DegreeTemplate;
};

export interface DegreeOptionWithRoi {
  templates: DegreeTemplatesByMode;
  primaryTemplate: DegreeTemplate;
  roi: DegreeRoiEstimate;
  programId: string;
  anchorSchool: string;
}

interface UseCareerDegreeOptionsResult {
  career: CareerPath | null;
  degreeOptions: DegreeOptionWithRoi[];
  isLoading: boolean;
  error: Error | null;
}

export function estimateDegreeRoi(args: {
  totalCostUsd: number;
  totalWeeks: number;
  careerSalary: number | null | undefined;
  baselineSalary: number | null | undefined;
}): DegreeRoiEstimate {
  const { totalCostUsd, totalWeeks, careerSalary, baselineSalary } = args;

  if (!totalCostUsd || !careerSalary || !baselineSalary) {
    return { paybackYears: null, roiMultiple: null };
  }

  const baseline = baselineSalary > 0 ? baselineSalary : 45000;
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

      // @ts-ignore
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
    enabled: !!careerPathId && !!career,
    queryFn: async () => {
      if (!careerPathId || !career) return [];

      console.log('[CareerDegreeOptions] Career:', career.title);
      console.log(
        '[CareerDegreeOptions] DB mappings length:',
        mappings?.length ?? 0
      );

      // 1) Use DB mappings if present, else fallback by slug
      let effectiveMappings: { program_id: string; anchor_school: string }[] =
        (mappings as any[])?.map((m: any) => ({
          program_id: m.program_id,
          anchor_school: m.anchor_school,
        })) ?? [];

      if (!effectiveMappings.length) {
        console.warn(
          '[CareerDegreeOptions] No DB mappings – using slug-based fallback'
        );

        const slug = (career as any).slug ?? '';

        if (slug === 'software-engineer') {
          effectiveMappings = [
            { program_id: 'bs_cs', anchor_school: 'TESU' },
            { program_id: 'bs_cs', anchor_school: 'WGU' },
            { program_id: 'bs_cs', anchor_school: 'EXCU' },
          ];
        } else if (slug === 'data-analyst') {
          effectiveMappings = [
            { program_id: 'bs_it', anchor_school: 'TESU' },
            { program_id: 'bs_cs', anchor_school: 'WGU' },
          ];
        } else if (slug === 'cybersecurity-analyst') {
          effectiveMappings = [
            { program_id: 'bs_it', anchor_school: 'WGU' },
            { program_id: 'bs_it', anchor_school: 'UMGC' },
          ];
        } else {
          effectiveMappings = [
            { program_id: 'bs_general', anchor_school: 'TESU' },
          ];
        }
      }

      if (!effectiveMappings.length) return [];

      const modes: DegreeOptimizationMode[] = [
        'balanced',
        'cheapest',
        'fastest',
      ];
      const results: DegreeOptionWithRoi[] = [];

      for (const mapping of effectiveMappings) {
        const templatesByMode: DegreeTemplatesByMode = {};

        for (const mode of modes) {
          const costMultiplier =
            mode === 'cheapest' ? 0.85 : mode === 'fastest' ? 1.1 : 1.0;
          const timeMultiplier =
            mode === 'fastest' ? 0.75 : mode === 'cheapest' ? 1.15 : 1.0;

          const baseCredits = 30;
          const baseCost =
            mapping.anchor_school === 'TESU'
              ? 2000
              : mapping.anchor_school === 'WGU'
              ? 2300
              : 2500;
          const baseWeeks = 32;

          const yearTemplates = Array.from({ length: 4 }, (_, i) => {
            const year = i + 1;
            const estCredits = baseCredits;
            const estCost = Math.round(baseCost * costMultiplier);
            const estWeeks = Math.round(baseWeeks * timeMultiplier);

            return {
              id: `${mapping.program_id}_${mapping.anchor_school}_${mode}_y${year}`,
              year,
              badge:
                mode === 'cheapest'
                  ? 'Cheapest'
                  : mode === 'fastest'
                  ? 'Fastest'
                  : 'Balanced',
              est: {
                credits: estCredits,
                costUsd: estCost,
                weeks: estWeeks,
                avgCri: mode === 'cheapest' ? 68 : mode === 'fastest' ? 72 : 75,
              },
              modules: [
                {
                  id: `Y${year}_M1`,
                  code: `${mapping.program_id.toUpperCase()}-${year}01`,
                  title: `Year ${year} Core Requirement (${estCredits / 2} credits)`,
                },
                {
                  id: `Y${year}_M2`,
                  code: `${mapping.program_id.toUpperCase()}-${year}02`,
                  title: `Year ${year} ${
                    year === 1
                      ? 'Foundation'
                      : year === 4
                      ? 'Capstone'
                      : 'Elective'
                  } (${estCredits / 2} credits)`,
                },
              ],
            };
          });

          const template: DegreeTemplate = {
            id: `${mapping.program_id}_${mapping.anchor_school}_${mode}`,
            programId: mapping.program_id,
            anchorSchool: mapping.anchor_school,
            optimization: mode,
            label: `${mapping.program_id.toUpperCase()} @ ${mapping.anchor_school.toUpperCase()} • ${
              mode.charAt(0).toUpperCase() + mode.slice(1)
            }`,
            yearTemplates: yearTemplates as any,
            totals: {
              credits: yearTemplates.reduce(
                (sum: number, y: any) => sum + (y.est?.credits ?? 0),
                0
              ),
              costUsd: yearTemplates.reduce(
                (sum: number, y: any) => sum + (y.est?.costUsd ?? 0),
                0
              ),
              weeks: yearTemplates.reduce(
                (sum: number, y: any) => sum + (y.est?.weeks ?? 0),
                0
              ),
              avgCri: mode === 'cheapest' ? 68 : mode === 'fastest' ? 72 : 75,
            },
          };

          templatesByMode[mode] = template;
        }

        const primaryTemplate =
          templatesByMode.balanced ??
          templatesByMode.cheapest ??
          templatesByMode.fastest!;

        const roi = estimateDegreeRoi({
          totalCostUsd: primaryTemplate.totals.costUsd,
          totalWeeks: primaryTemplate.totals.weeks,
          careerSalary: (career as any).average_salary,
          baselineSalary: (career as any).baseline_salary,
        });

        results.push({
          templates: templatesByMode,
          primaryTemplate,
          roi,
          programId: mapping.program_id,
          anchorSchool: mapping.anchor_school,
        });
      }

      console.log(
        '[CareerDegreeOptions] Built degreeOptions:',
        results.length
      );
      return results;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Don't propagate mappingsError if it's just a missing table (code 42P01)
  // That's expected before migration and we have fallback logic
  const isMissingTableError = (mappingsError as any)?.code === '42P01';
  const criticalError = careerError || degreeError || (mappingsError && !isMissingTableError);

  return {
    career: career ?? null,
    degreeOptions: degreeOptions ?? [],
    isLoading,
    error: criticalError as Error | null,
  };
}
