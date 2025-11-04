/**
 * Smart Re-Ranker for Template Recommendations
 * Applies learned weights to template features for contextual ranking
 */

import type { SmartWeights } from './explorationApi';

export interface TemplateFeatures {
  validation: {
    score?: number;
    impact?: {
      costDelta?: number;
      weeksDelta?: number;
      criDelta?: number;
    };
    transferStatus?: {
      accepted?: boolean;
    };
  };
  template: {
    providerType?: string;
    explorationMeta?: {
      isExploratory?: boolean;
    };
  };
}

/**
 * Normalize a value to 0..1 range
 */
function normalize(x: number, min: number, max: number): number {
  return max > min ? (x - min) / (max - min) : 0.5;
}

/**
 * Re-rank templates using smart weights
 * @param templates Array of templates with validation and features
 * @param weights Active smart ranking weights from database
 * @returns Sorted templates with smartScore added
 */
export function reRankTemplates<T extends TemplateFeatures>(
  templates: T[],
  weights: SmartWeights
): (T & { smartScore: number })[] {
  const w = weights;

  // Precompute mins/maxes for normalization
  const costs = templates.map(t => t.validation.impact?.costDelta ?? 0);
  const weeks = templates.map(t => t.validation.impact?.weeksDelta ?? 0);
  const criDeltas = templates.map(t => t.validation.impact?.criDelta ?? 0);

  const minC = Math.min(...costs);
  const maxC = Math.max(...costs);
  const minW = Math.min(...weeks);
  const maxW = Math.max(...weeks);

  return templates
    .map(t => {
      const base = t.validation.score ?? 0; // Existing base score

      // Normalize features to 0..1
      const costNorm = normalize(t.validation.impact?.costDelta ?? 0, minC, maxC);
      const weeksNorm = normalize(t.validation.impact?.weeksDelta ?? 0, minW, maxW);
      
      // Convert criDelta (-100..100) to 0..1 where higher is better
      const criNorm = normalize(t.validation.impact?.criDelta ?? 0, -100, 100);

      const transferOK = t.validation.transferStatus?.accepted ? 1 : 0;

      // Provider type one-hot encoding
      const providerType = String(t.template.providerType || 'other').toLowerCase();
      const providerBump =
        providerType === 'ace' ? w.w_provider_ace :
        providerType === 'clep' ? w.w_provider_clep :
        providerType === 'nccrs' ? w.w_provider_nccrs :
        w.w_provider_other;

      // Exploratory bonus
      const exploratoryBump = t.template.explorationMeta?.isExploratory 
        ? w.w_exploratory_bonus 
        : 0;

      // Linear model: base + weighted features
      const modelScore =
        w.bias +
        w.w_cost * costNorm +
        w.w_weeks * weeksNorm +
        w.w_cri * criNorm +
        w.w_transfer_ok * transferOK +
        providerBump +
        exploratoryBump;

      return { 
        ...t, 
        smartScore: base + modelScore 
      };
    })
    .sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0));
}
