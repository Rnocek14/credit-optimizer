/**
 * V5 Data Flattening Utilities
 * 
 * Transforms nested modulesByYear data into flat arrays
 * required by generateDegreeTemplate engine
 */

import type { ModuleData } from '../types/v5';

export interface FlattenedModule {
  id: string;
  year: number;
  category: string;
  name: string;
  description: string;
  credits_required: number;
  marketplaceOptions: FlatMarketplaceOption[];
}

export interface FlatMarketplaceOption {
  id: string;
  requirementId: string;
  moduleId: string;
  optionKind: string;
  courseId: string;
  title: string;
  credits: number;
  costUsd: number;
  durationWeeks: number;
  criScore?: number;
  providerType?: string;
  level?: 'lower' | 'upper';
}

/**
 * Flatten modulesByYear → flat modules array with year annotation
 */
export function flattenModules(
  modulesByYear: Record<number, ModuleData[]>
): FlattenedModule[] {
  const result: FlattenedModule[] = [];

  for (const [year, modules] of Object.entries(modulesByYear)) {
    for (const module of modules) {
      result.push({
        id: module.id,
        year: parseInt(year, 10),
        category: module.requirementArea ?? 'general',
        name: module.label,
        description: module.description,
        credits_required: module.creditsRequired,
        marketplaceOptions: (module.marketplaceOptions ?? []).map(opt => ({
          id: opt.id,
          requirementId: module.requirement_block_id ?? module.id,
          moduleId: module.id,
          optionKind: opt.providerType ?? 'course',
          courseId: opt.courseId,
          title: opt.title,
          credits: opt.credits,
          costUsd: opt.cost_usd ?? 0,
          durationWeeks: opt.duration_weeks ?? 8,
          criScore: opt.cri_score,
          providerType: opt.providerType ?? undefined,
          level: opt.level && opt.level >= 300 ? 'upper' : 'lower',
        })),
      });
    }
  }

  return result;
}

/**
 * Extract all marketplace options from modules into a single flat array
 * with stable IDs for ReactFlow nodes
 */
export function extractAllOptions(
  modules: FlattenedModule[]
): FlatMarketplaceOption[] {
  return modules.flatMap(m => m.marketplaceOptions);
}

/**
 * Get unique requirement IDs covered by options
 */
export function getCoveredRequirements(options: FlatMarketplaceOption[]): Set<string> {
  return new Set(options.map(o => o.requirementId));
}

/**
 * Calculate coverage percentage
 */
export function calculateCoverage(
  modules: FlattenedModule[],
  options: FlatMarketplaceOption[]
): number {
  if (modules.length === 0) return 0;
  const covered = getCoveredRequirements(options);
  const total = modules.length;
  const coverCount = modules.filter(m => covered.has(m.id)).length;
  return (coverCount / total) * 100;
}

/**
 * Validate data shape before template generation
 * Returns null if valid, or an error message if invalid
 */
export function validateTemplateInputs(data: {
  modules: FlattenedModule[];
  blocks: unknown[];
  allOptions: FlatMarketplaceOption[];
}): string | null {
  const issues: string[] = [];

  if (!data.modules || data.modules.length === 0) {
    issues.push('modules empty');
  }

  if (!data.blocks || data.blocks.length === 0) {
    issues.push('blocks empty');
  }

  if (!data.allOptions || data.allOptions.length === 0) {
    issues.push('allOptions empty');
  }

  // Check for stable IDs
  const moduleIds = data.modules.map(m => m.id);
  const uniqueModuleIds = new Set(moduleIds);
  if (moduleIds.length !== uniqueModuleIds.size) {
    issues.push('duplicate module IDs detected');
  }

  const optionIds = data.allOptions.map(o => o.id);
  const uniqueOptionIds = new Set(optionIds);
  if (optionIds.length !== uniqueOptionIds.size) {
    issues.push('duplicate option IDs detected');
  }

  return issues.length > 0 ? issues.join(', ') : null;
}

/**
 * Build full context from modulesByYear for generateDegreeTemplate
 */
export function buildFlatContextFromModules(
  modulesByYear: Record<number, ModuleData[]>,
  blocks: unknown[],
  anchorPolicy: unknown
) {
  const modules = flattenModules(modulesByYear);
  const allOptions = extractAllOptions(modules);
  const coverage = calculateCoverage(modules, allOptions);
  const totalCredits = modules.reduce((sum, m) => sum + m.credits_required, 0);

  return {
    modules,
    blocks,
    allOptions,
    anchorPolicy,
    diagnostics: {
      totalCredits,
      hasBlocks: blocks.length > 0,
      coverage,
      moduleCount: modules.length,
      optionCount: allOptions.length,
    },
  };
}
