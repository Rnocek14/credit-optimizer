/**
 * Phase 1c: Convenience re-exports for engine and test files
 * Provides typed interfaces that match usePlanBasket state shape
 */

import type { ProviderType } from './v5';

export interface BasketItem {
  moduleId: string;
  requirementArea?: string; // NEW: For cross-compatibility between structured and template-based IDs
  courseId: string;
  title?: string;
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  workload_weekly_hours: number;
  cri_score: number;
  status: 'pinned' | 'auto-filled' | 'prereq';
  providerType?: ProviderType;
  
  // Structured provenance (replaces autoFillReason string parsing)
  source?: {
    type: 'template' | 'manual' | 'prereq';
    templateId?: string;
    templateVersion?: number;
    templateLabel?: string; // "Cheapest", "Fastest", etc.
  };
  
  /** @deprecated Keep for backward compatibility, but use source instead */
  autoFillReason?: string;
}

export interface Constraints {
  max_budget_usd?: number;
  target_graduation_date?: Date;
  max_weekly_hours?: number;
  min_cri_score?: number;
  max_ace_credits?: number;
  max_concurrent_courses?: number;
}

export interface ScoringWeights {
  cost: number;
  time: number;
  cri: number;
}

// Re-export from v5 for convenience
export type { MarketplaceOption, ModuleData, PlanScenario, ProviderType } from './v5';
