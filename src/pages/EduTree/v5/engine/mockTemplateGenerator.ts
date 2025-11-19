import type { DegreeTemplate, DegreeOptimizationMode } from './degreeTemplateGenerator';

export type DegreeTemplatesByMode = {
  [mode in DegreeOptimizationMode]?: DegreeTemplate;
};

interface MappingInput {
  program_id: string;
  anchor_school: string;
}

/**
 * Generate mock templates for a program/anchor mapping
 * Used as fallback when real template generation isn't available
 */
export function generateMockTemplatesForMapping(
  mapping: MappingInput
): DegreeTemplatesByMode {
  const modes: DegreeOptimizationMode[] = ['balanced', 'cheapest', 'fastest'];
  const templatesByMode: DegreeTemplatesByMode = {};

  for (const mode of modes) {
    const costMultiplier = mode === 'cheapest' ? 0.85 : mode === 'fastest' ? 1.1 : 1.0;
    const timeMultiplier = mode === 'fastest' ? 0.75 : mode === 'cheapest' ? 1.15 : 1.0;

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
              year === 1 ? 'Foundation' : year === 4 ? 'Capstone' : 'Elective'
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

  return templatesByMode;
}
