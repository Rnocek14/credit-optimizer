import { applyTemplate, type ApplyTemplateParams } from './applyTemplate';
import type { ModuleTemplate } from '../types/templates';
import type { BasketItem, Constraints } from '../state/usePlanBasket';

export interface TemplatePreview {
  added: BasketItem[];
  removed: BasketItem[];
  removedPinned: BasketItem[];
  costDelta: number;
  weeksDelta: number;
  creditsDelta: number;
  touchesOtherScopes: boolean;
  wouldExceedCredits: boolean;
  exceedsBy: number;
}

/**
 * Dry-run preview of template application without mutating basket
 * Uses same applyTemplate engine to ensure diff matches reality
 */
export function previewTemplate({
  template,
  moduleId,
  currentBasket,
  constraints,
  allOptions,
  keepPinned = false
}: {
  template: ModuleTemplate;
  moduleId: string;
  currentBasket: BasketItem[];
  constraints: Constraints;
  allOptions: any[];
  keepPinned?: boolean;
}): TemplatePreview {
  // Compute full apply result
  const params: Omit<ApplyTemplateParams, 'currentBasket' | 'constraints'> = {
    scope: 'module',
    scopeId: moduleId,
    templateId: template.id,
    options: template.options,
    allOptions,
  };

  const result = applyTemplate({
    ...params,
    currentBasket,
    constraints,
  });

  // Identify pinned items that would be removed
  const removedPinned = result.removed.filter(item => item.status === 'pinned');

  // If keepPinned is enabled, exclude pinned items from removal and adjust added
  let finalAdded = result.added;
  let finalRemoved = result.removed;
  
  if (keepPinned && removedPinned.length > 0) {
    // Filter out pinned from removal
    finalRemoved = result.removed.filter(item => item.status !== 'pinned');
    
    // Recalculate deltas excluding pinned
    const pinnedCourseIds = new Set(removedPinned.map(i => i.courseId));
    finalAdded = result.added.filter(item => !pinnedCourseIds.has(item.courseId));
  }

  // Check for cross-scope impacts (prereqs)
  const touchesOtherScopes = finalAdded.some(item => item.moduleId !== moduleId);

  // Check if result would exceed module credits
  const currentModuleCredits = currentBasket
    .filter(i => i.moduleId === moduleId)
    .reduce((sum, i) => sum + i.credits, 0);
  
  const removedCredits = finalRemoved
    .filter(i => i.moduleId === moduleId)
    .reduce((sum, i) => sum + i.credits, 0);
  
  const addedCredits = finalAdded
    .filter(i => i.moduleId === moduleId)
    .reduce((sum, i) => sum + i.credits, 0);
  
  const projectedCredits = currentModuleCredits - removedCredits + addedCredits;
  // Use total template credits as requirement
  const moduleCreditsRequired = template.options.reduce((sum, o) => sum + o.credits, 0);
  
  const wouldExceedCredits = projectedCredits > moduleCreditsRequired;
  const exceedsBy = Math.max(0, projectedCredits - moduleCreditsRequired);

  return {
    added: finalAdded,
    removed: finalRemoved,
    removedPinned,
    costDelta: result.diff.costDelta,
    weeksDelta: result.diff.weeksDelta,
    creditsDelta: result.diff.creditsDelta,
    touchesOtherScopes,
    wouldExceedCredits,
    exceedsBy,
  };
}
