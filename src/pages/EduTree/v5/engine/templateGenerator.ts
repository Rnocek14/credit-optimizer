import { autoCompletePlan } from './autoCompletePlan';
import type { ModuleTemplate } from '../types/templates';
import type { ModuleData, ScoringWeights } from '../types/v5';
import type { BasketItem, Constraints } from '../state/usePlanBasket';
import { checkTransferRule, deriveRequirementType } from './transferEngine';

export interface TemplateGenerationProfile {
  name: string;
  badge: 'Cheapest' | 'Fastest' | 'Balanced' | 'Prestige';
  weights: ScoringWeights;
}

export const GENERATION_PROFILES: TemplateGenerationProfile[] = [
  {
    name: 'Budget-Optimized',
    badge: 'Cheapest',
    weights: { cost: 100, time: 0, cri: 0 }
  },
  {
    name: 'Fast-Track',
    badge: 'Fastest',
    weights: { cost: 0, time: 100, cri: 0 }
  },
  {
    name: 'Balanced',
    badge: 'Balanced',
    weights: { cost: 33, time: 33, cri: 34 }
  },
  {
    name: 'Premium Quality',
    badge: 'Prestige',
    weights: { cost: 0, time: 0, cri: 100 }
  }
];

export interface TemplateGeneratorOptions {
  explorationMode?: boolean; // Allow generation for satisfied modules
}

/**
 * Generate module templates by directly ranking marketplace options
 * Uses profile weights to score and select best options for each strategy
 * 
 * @param explorationMode - When true, generates templates even for satisfied modules (for "what-if" comparison)
 */
export async function generateModuleTemplates(
  module: ModuleData,
  basket: BasketItem[],
  constraints: Constraints,
  options?: TemplateGeneratorOptions
): Promise<ModuleTemplate[]> {
  const templates: ModuleTemplate[] = [];
  
  // Guard: No options = no templates
  if (!module.marketplaceOptions || module.marketplaceOptions.length === 0) {
    console.warn('[TemplateGenerator] No marketplace options for module:', module.id);
    return [];
  }
  
  // Calculate remaining credits needed
  const creditsNeeded = (module.creditsRequired ?? 0) - (module.creditsEarned ?? 0);
  const isSatisfied = creditsNeeded <= 0;
  const explorationMode = options?.explorationMode ?? false;
  
  // Guard: satisfied without exploration = no templates
  if (isSatisfied && !explorationMode) {
    console.log('[TemplateGenerator] Module already satisfied (exploration disabled):', module.id);
    return [];
  }
  
  if (isSatisfied && explorationMode) {
    console.log('[TemplateGenerator] 🔍 Exploration mode: generating alternatives for satisfied module:', module.id);
  }
  
  console.log('[TemplateGenerator] 🎯 Generating templates:', {
    moduleId: module.id,
    moduleLabel: module.label,
    creditsNeeded: isSatisfied ? 0 : creditsNeeded,
    isSatisfied,
    explorationMode,
    optionsCount: module.marketplaceOptions.length
  });
  
  // ============ Transfer Filtering (Phase 3) ============
  // Filter marketplace options to transfer-safe courses only
  const targetSchool = constraints.target_school;
  let safeOptionsForModule = module.marketplaceOptions;
  
  if (targetSchool && typeof targetSchool === 'string') {
    const requirementType = deriveRequirementType(module);
    const safeOptions: typeof safeOptionsForModule = [];
    
    for (const opt of safeOptionsForModule) {
      const providerCode = opt.providerCode || opt.provider || '';
      
      // Institutional courses are always safe for this anchor
      if (providerCode.toUpperCase() === targetSchool.toUpperCase()) {
        safeOptions.push(opt);
        continue;
      }
      
      const rule = await checkTransferRule(
        providerCode,
        opt.courseId,
        targetSchool,
        { requirementType }
      );
      
      if (rule.accepted) {
        // Annotate for future UI use
        (opt as any).transferStatus = rule.electiveOnly ? 'elective' : 'accepted';
        (opt as any).transferConfidence = rule.confidence;
        (opt as any).targetEquivCode = rule.targetEquivCode;
        safeOptions.push(opt);
      }
    }
    
    if (safeOptions.length === 0) {
      console.warn(
        `[TemplateGenerator] No transfer-safe options for module ${module.id} at ${targetSchool}`
      );
      return []; // No safe options = no templates for this module
    }
    
    console.log(
      `[TemplateGenerator] 🔒 Filtered ${safeOptionsForModule.length} → ${safeOptions.length} safe options for module ${module.id}`
    );
    safeOptionsForModule = safeOptions;
  }
  
  for (const profile of GENERATION_PROFILES) {
    // Score options by profile weights (normalize to 0-100)
    const scored = safeOptionsForModule.map(opt => {
      const costScore = profile.weights.cost > 0 
        ? profile.weights.cost * (1 / ((opt.cost_usd ?? 1) + 1)) * 100
        : 0;
      const timeScore = profile.weights.time > 0
        ? profile.weights.time * (1 / ((opt.duration_weeks ?? 8) + 1)) * 100
        : 0;
      const criScore = profile.weights.cri > 0
        ? profile.weights.cri * (opt.cri_score ?? 0)
        : 0;
      
      return {
        ...opt,
        totalScore: costScore + timeScore + criScore
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
    
    // Pick best option(s) to satisfy credits (or match existing if exploration)
    // Cap at 10 candidates for performance on low-end devices
    const selected: any[] = [];
    let totalCredits = 0;
    const targetCredits = isSatisfied ? (module.creditsRequired ?? 0) : creditsNeeded;
    const MAX_CANDIDATES = 10;
    
    for (const opt of scored) {
      if (totalCredits >= targetCredits || selected.length >= MAX_CANDIDATES) break;
      selected.push(opt);
      totalCredits += opt.credits;
    }
    
    if (selected.length === 0) {
      console.warn('[TemplateGenerator] No options selected for profile:', profile.name);
      continue;
    }
    
    // Calculate estimated totals
    const est = {
      costUsd: selected.reduce((sum, o) => sum + (o.cost_usd ?? 0), 0),
      weeks: Math.max(...selected.map(o => o.duration_weeks ?? 8)),
      credits: selected.reduce((sum, o) => sum + o.credits, 0),
      cri: Math.round(selected.reduce((sum, o) => sum + (o.cri_score ?? 0), 0) / selected.length),
      workloadHours: selected.reduce((sum, o) => sum + (o.workload_weekly_hours ?? o.credits * 2.5), 0)
    };
    
    templates.push({
      id: `${module.id}-${profile.badge.toLowerCase()}`,
      kind: 'module',
      moduleId: module.id,
      label: `${profile.name}`,
      summary: `$${est.costUsd} • ${est.weeks}w • ${est.credits}cr • CRI ${est.cri}`,
      badge: profile.badge,
      options: selected,
      recommendedCourseId: selected[0]?.courseId,
      targetCanonicalIds: module.requiredCanonicalIds ?? [],
      semesterPlacement: 'any',
      est,
      generatedFrom: 'auto-fill',
      weightProfile: profile.weights,
      explorationMeta: isSatisfied ? {
        isExploratory: true,
        satisfiedAtGeneration: true,
        conflicts: [] // TODO: detect residency/cap violations in future
      } : undefined
    });
    
    console.log('[TemplateGenerator] ✅ Generated template:', {
      profile: profile.name,
      badge: profile.badge,
      coursesSelected: selected.length,
      totalCost: est.costUsd,
      totalWeeks: est.weeks,
      totalCredits: est.credits,
      avgCri: est.cri
    });
  }
  
  console.log('[TemplateGenerator] 📊 Final result:', {
    moduleId: module.id,
    templatesGenerated: templates.length
  });
  
  return templates;
}
