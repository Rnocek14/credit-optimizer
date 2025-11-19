import { generateYearTemplates } from './yearTemplateGenerator';
import type { YearTemplate } from '../types/templates';
import type { ModuleData, MarketplaceOption } from '../types/v5';
import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { RequirementBlock } from '@/lib/types/eduTree';

export type DegreeOptimizationMode = 'cheapest' | 'fastest' | 'balanced';

export interface DegreeTemplateTotals {
  credits: number;
  costUsd: number;
  weeks: number;
  avgCri?: number | null;
}

export interface DegreeTemplate {
  id: string;
  programId: string;
  anchorSchool: string;
  optimization: DegreeOptimizationMode;
  label: string;
  yearTemplates: YearTemplate[];
  totals: DegreeTemplateTotals;
}

export interface GenerateDegreeTemplateOptions {
  modules: ModuleData[];
  blocks: RequirementBlock[];
  allOptions: MarketplaceOption[];
  basket: BasketItem[];
  constraints: Constraints;
  anchorPolicy?: any | null;
  years?: number;
}

/**
 * Helper to pick the YearTemplate matching the chosen optimization.
 * Assumes year templates use badges like 'Cheapest' | 'Fastest' | 'Balanced'
 */
function pickTemplateByOptimization(
  templates: YearTemplate[],
  optimization: DegreeOptimizationMode
): YearTemplate | null {
  if (!templates.length) return null;

  const badgeMap: Record<DegreeOptimizationMode, string> = {
    cheapest: 'Cheapest',
    fastest: 'Fastest',
    balanced: 'Balanced',
  };

  const targetBadge = badgeMap[optimization];
  const match = templates.find((t) => t.badge === targetBadge);

  // Fallback: first template if the exact badge isn't found
  return match ?? templates[0];
}

/**
 * Aggregate totals across all YearTemplates.
 */
function computeTotals(yearTemplates: YearTemplate[]): DegreeTemplateTotals {
  const totals: DegreeTemplateTotals = {
    credits: 0,
    costUsd: 0,
    weeks: 0,
    avgCri: null,
  };

  if (!yearTemplates.length) return totals;

  let criSum = 0;
  let criCount = 0;

  for (const yt of yearTemplates) {
    const est = (yt as any).est ?? (yt as any).estimate ?? {};
    if (typeof est.credits === 'number') totals.credits += est.credits;
    if (typeof est.costUsd === 'number') totals.costUsd += est.costUsd;
    if (typeof est.weeks === 'number') totals.weeks += est.weeks;

    if (typeof est.avgCri === 'number') {
      criSum += est.avgCri;
      criCount += 1;
    }
  }

  if (criCount > 0) {
    totals.avgCri = criSum / criCount;
  }

  return totals;
}

/**
 * Core engine: wraps year template generation into a single DegreeTemplate.
 * Generates templates for each year of a degree program and aggregates totals.
 */
export async function generateDegreeTemplate(
  programId: string,
  anchorSchool: string,
  optimization: DegreeOptimizationMode,
  opts: GenerateDegreeTemplateOptions
): Promise<DegreeTemplate> {
  const {
    modules,
    blocks,
    allOptions,
    basket,
    constraints,
    anchorPolicy,
    years = 4,
  } = opts;

  const yearTemplates: YearTemplate[] = [];

  for (let year = 1; year <= years; year++) {
    const yearModules = modules.filter(
      (m) => m.year === year
    );

    const templatesForYear = await generateYearTemplates(
      year,
      yearModules,
      blocks,
      allOptions,
      basket,
      constraints,
      anchorPolicy
    );

    const chosen = pickTemplateByOptimization(templatesForYear, optimization);
    if (chosen) {
      yearTemplates.push(chosen);
    }
  }

  const totals = computeTotals(yearTemplates);

  const label = `${programId.toUpperCase()} @ ${anchorSchool.toUpperCase()} • ${
    optimization.charAt(0).toUpperCase() + optimization.slice(1)
  }`;

  return {
    id: `${programId}_${anchorSchool}_${optimization}`,
    programId,
    anchorSchool,
    optimization,
    label,
    yearTemplates,
    totals,
  };
}
