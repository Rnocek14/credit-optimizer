import { autoCompletePlan } from './autoCompletePlan';
import type { ModuleTemplate } from '../types/templates';
import type { ModuleData, ScoringWeights } from '../types/v5';
import type { BasketItem, Constraints } from '../state/usePlanBasket';

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

/**
 * Generate module templates using auto-fill engine
 * Phase 1: Manual seeds preferred, use this for future expansion
 */
export async function generateModuleTemplates(
  module: ModuleData,
  basket: BasketItem[],
  constraints: Constraints
): Promise<ModuleTemplate[]> {
  const templates: ModuleTemplate[] = [];
  
  for (const profile of GENERATION_PROFILES) {
    console.log('[TemplateGenerator] 🎯 Attempting profile:', {
      profile: profile.name,
      moduleId: module.id,
      moduleLabel: module.label,
      moduleOptionsCount: module.marketplaceOptions?.length ?? 0,
      basketSize: basket.length
    });
    
    // Run auto-fill with specific weight profile
    const result = autoCompletePlan(
      [module], // Only this module
      basket,
      constraints,
      profile.weights
    );
    
    console.log('[TemplateGenerator] 📊 Auto-fill result:', {
      profile: profile.name,
      suggestionsCount: result.suggestions.length,
      status: result.status,
      stoppedReason: result.stoppedReason,
      suggestions: result.suggestions.map(s => ({
        courseId: s.courseId,
        reason: s.autoFillReason
      }))
    });
    
    if (result.suggestions.length === 0) continue;
    
    // Extract options from suggestions
    const options = result.suggestions
      .map(s => {
        const opt = module.marketplaceOptions?.find(o => o.courseId === s.courseId);
        if (!opt) return null;
        return {
          ...opt,
          autoFillReason: s.autoFillReason
        };
      })
      .filter(Boolean) as any[];
    
    if (options.length === 0) continue;
    
    // Calculate estimated totals
    const est = {
      costUsd: options.reduce((sum, o) => sum + (o.cost_usd ?? 0), 0),
      weeks: options.reduce((sum, o) => sum + (o.duration_weeks ?? 8), 0),
      credits: options.reduce((sum, o) => sum + o.credits, 0),
      cri: Math.round(options.reduce((sum, o) => sum + (o.cri_score ?? 0), 0) / options.length),
      workloadHours: options.reduce((sum, o) => sum + (o.workload_weekly_hours ?? o.credits * 2.5), 0)
    };
    
    templates.push({
      id: `${module.id}-${profile.badge.toLowerCase()}`,
      kind: 'module',
      moduleId: module.id,
      label: `${module.label}: ${profile.name}`,
      summary: `$${est.costUsd} • ${est.weeks}w • ${est.credits}cr • CRI ${est.cri}`,
      badge: profile.badge,
      options,
      recommendedCourseId: options[0]?.courseId,
      targetCanonicalIds: module.requiredCanonicalIds ?? [],
      semesterPlacement: 'any',
      est,
      generatedFrom: 'auto-fill',
      weightProfile: profile.weights
    });
  }
  
  return templates;
}
