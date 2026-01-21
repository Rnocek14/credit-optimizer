/**
 * Phase 1c: Convenience re-exports for engine and test files
 * 
 * CANONICAL SOURCE OF TRUTH: usePlanBasket.ts defines BasketItem
 * This file re-exports to prevent type drift.
 */

// Re-export canonical BasketItem from state (SINGLE SOURCE OF TRUTH)
export type { BasketItem } from '../state/usePlanBasket';

// Re-export Constraints - kept here for backward compatibility
// TODO: Consider moving to usePlanBasket.ts for full consolidation
export interface Constraints {
  max_budget_usd?: number;
  target_graduation_date?: Date;
  max_weekly_hours?: number;
  min_cri_score?: number;
  max_ace_credits?: number;
  max_concurrent_courses?: number;
  target_school?: string; // Anchor school for transfer policy tracking
  degree_program?: string; // e.g., "B.S. in Computer Science"
  catalog_year?: string; // e.g., "2024-2025"
}

export interface ScoringWeights {
  cost: number;
  time: number;
  cri: number;
}

// Re-export from v5 for convenience
export type { MarketplaceOption, ModuleData, PlanScenario, ProviderType } from './v5';
