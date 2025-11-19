import type { DegreeOptimizationMode, GenerateDegreeTemplateOptions } from './degreeTemplateGenerator';

/**
 * Adapter: Convert useCareerV5Data output into generateDegreeTemplate input
 * 
 * This bridges the gap between how career exploration fetches data
 * and what the degree template engine expects
 */
export function buildDegreeTemplateContextForMapping(
  careerV5Data: {
    modules: any[];
    blocks: any[];
    allOptions: any[];
    constraints: Record<string, any>;
    anchorPolicy?: any;
    basket?: any[];
    years: number;
  },
  opts?: {
    years?: number;
    optimization?: DegreeOptimizationMode;
  }
): GenerateDegreeTemplateOptions & { years: number } {
  const {
    modules,
    blocks,
    allOptions,
    constraints,
    anchorPolicy,
    basket = [],
    years,
  } = careerV5Data;

  console.log('[buildDegreeTemplateContext] Building context:', {
    modulesCount: modules.length,
    blocksCount: blocks.length,
    optionsCount: allOptions.length,
    hasAnchorPolicy: !!anchorPolicy,
    targetYears: opts?.years ?? years,
  });

  return {
    modules,
    blocks,
    allOptions,
    basket,
    constraints,
    anchorPolicy,
    years: opts?.years ?? years,
  };
}
