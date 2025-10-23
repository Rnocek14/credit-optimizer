import type { ModuleTemplate, TemplateValidation } from '../types/templates';
import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/exports';
import type { EvidenceSummary } from '@/pages/EduTree/hooks/useUserEvidence';

/**
 * Phase 1d: Career Pivot Template Validator (Stub)
 * 
 * This function will be implemented when v5_pivot_mode is enabled.
 * It extends template validation to:
 * 1. Accept priorDegree data from evidence
 * 2. Map prior courses to canonical IDs via crossMajorMappings
 * 3. Filter template options to exclude satisfied requirements
 * 4. Calculate creditUtilization score (% of prior credits that transfer)
 * 5. Rank templates by utilization descending
 * 
 * For now, it returns standard validation (no pivot-specific logic).
 */
export async function validateCareerPivotTemplate(
  template: ModuleTemplate,
  basket: BasketItem[],
  constraints: Constraints,
  allOptions: MarketplaceOption[],
  priorDegree?: EvidenceSummary['priorDegrees'][0] // Phase 1d: single prior degree
): Promise<TemplateValidation & { creditUtilization?: number }> {
  // Phase 1d: To be implemented
  // For now, return a stub validation
  
  return {
    isValid: false,
    blockedReasons: ['Career pivot validation not yet implemented'],
    warnings: ['Enable v5_pivot_mode to use this feature'],
    canonicalFit: {
      complete: false,
      satisfied: [],
      missing: template.targetCanonicalIds
    },
    impact: {
      costDelta: 0,
      aceDelta: 0,
      weeksDelta: 0,
      workloadDelta: 0,
      criDelta: 0
    }
  };
}
