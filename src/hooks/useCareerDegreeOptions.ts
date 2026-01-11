import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCareerPathPrograms } from '@/hooks/useCareerPathPrograms';
import type { CareerPath } from '@/types/career';
import type {
  DegreeTemplate,
  DegreeOptimizationMode,
} from '@/pages/EduTree/v5/engine/degreeTemplateGenerator';
import { fetchCareerV5DataFor } from '@/pages/EduTree/v5/engine/fetchCareerV5Data';
import { buildDegreeTemplateContextForMapping } from '@/pages/EduTree/v5/engine/buildDegreeTemplateContext';
import { generateDegreeTemplate } from '@/pages/EduTree/v5/engine/degreeTemplateGenerator';
import { generateMockTemplatesForMapping } from '@/pages/EduTree/v5/engine/mockTemplateGenerator';

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
  planSource: 'real' | 'mock';
  diagnostics?: {
    totalCredits: number;
    hasBlocks: boolean;
    coverage: number;
    passedGating: boolean;
  };
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

      // Feature flag: toggle between real templates and mocks
      const USE_REAL_TEMPLATES = true;

      const modes: DegreeOptimizationMode[] = ['balanced', 'cheapest', 'fastest'];
      const results: DegreeOptionWithRoi[] = [];

      for (const mapping of effectiveMappings) {
        let templatesByMode: DegreeTemplatesByMode = {};
        let planSource: 'real' | 'mock' = 'mock';
        let diagnostics: DegreeOptionWithRoi['diagnostics'];

        if (USE_REAL_TEMPLATES) {
          try {
            console.log('[CareerDegreeOptions] 🔍 Checking data quality for:', mapping);

            // Fetch V5 data using non-hook helper
            const v5Data = await fetchCareerV5DataFor(
              mapping.program_id,
              mapping.anchor_school
            );

            // Run diagnostic checks (Phase 2 gating)
            const totalCredits = v5Data.modules.reduce(
              (sum, m) => sum + (m.credits_required ?? 0),
              0
            );
            const hasBlocks = v5Data.blocks.length > 0;
            const coveredRequirements = new Set(
              v5Data.allOptions.map((opt: any) => opt.requirement_id)
            ).size;
            const totalRequirements = v5Data.modules.length;
            const coverage = totalRequirements > 0 
              ? (coveredRequirements / totalRequirements) * 100 
              : 0;

            diagnostics = {
              totalCredits,
              hasBlocks,
              coverage,
              passedGating: totalCredits >= 110 && hasBlocks && coverage >= 80,
            };

            // === V5_GATING LOG: Single source of truth for mock vs real decision ===
            console.log('[V5_GATING] credits=%d blocks=%d coverage=%d modules=%d options=%d planSource=%s program=%s anchor=%s',
              totalCredits,
              v5Data.blocks.length,
              Math.round(coverage),
              v5Data.modules.length,
              v5Data.allOptions.length,
              diagnostics.passedGating ? 'real' : 'mock',
              mapping.program_id,
              mapping.anchor_school
            );
            
            console.log('[CareerDegreeOptions] 📊 Diagnostic results:', {
              ...diagnostics,
              mapping,
            });

            // Gate real generation by diagnostic thresholds
            if (diagnostics.passedGating) {
              console.log('[CareerDegreeOptions] ✅ Diagnostics passed, generating real templates');

              // Build context for the engine
              const ctx = buildDegreeTemplateContextForMapping(v5Data, { years: 4 });

              // Generate real templates for each mode
              for (const mode of modes) {
                const template = await generateDegreeTemplate(
                  mapping.program_id,
                  mapping.anchor_school,
                  mode,
                  ctx
                );
                templatesByMode[mode] = template;
              }

              planSource = 'real';
              console.log('[CareerDegreeOptions] ✅ Real template generation successful');
            } else {
              const reasons = [];
              if (totalCredits < 110) reasons.push(`insufficient credits (${totalCredits}/110)`);
              if (!hasBlocks) reasons.push('missing requirement blocks');
              if (coverage < 80) reasons.push(`low coverage (${coverage.toFixed(0)}%/80%)`);

              console.warn(
                `[CareerDegreeOptions] ⚠️ Diagnostics failed: ${reasons.join(', ')} – using mocks`
              );
              templatesByMode = generateMockTemplatesForMapping(mapping);
            }
          } catch (err) {
            const errorType = err instanceof Error ? err.constructor.name : 'Unknown';
            const errorMsg = err instanceof Error ? err.message : String(err);
            
            console.warn(
              `[CareerDegreeOptions] ❌ Real template generation failed (${errorType}: ${errorMsg}) – using mocks`
            );
            templatesByMode = generateMockTemplatesForMapping(mapping);
          }
        } else {
          console.log('[CareerDegreeOptions] Using mock templates (feature flag disabled)');
          templatesByMode = generateMockTemplatesForMapping(mapping);
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
          planSource,
          diagnostics,
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
