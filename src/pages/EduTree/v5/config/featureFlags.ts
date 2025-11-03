/**
 * V5 Feature Flags - Simplified for Phase 0
 * Core features are always on; experimental features use localStorage
 */

export const FEATURE_FLAGS = {
  // Core V5 features (always on)
  v5_decision_dock: true,
  v5_templates_module: true,
  v5_cross_scope_details: true,
  
  // Phase 0: Simplified cards (default on)
  V5_SIMPLIFIED_CARDS: true, // Full-card click, dock-only actions, simple progress
  
  // Week 1: Year Scope Card (enabled by default, disable via localStorage)
  v5_year_scope_v1: typeof window !== 'undefined' ? localStorage.getItem('v5_year_scope_v1') !== 'false' : true,
  
  // Experimental features (dark launch via localStorage)
  v5_autofill_enabled: typeof window !== 'undefined' && localStorage.getItem('v5_autofill_enabled') === 'true',
  v5_pivot_mode: typeof window !== 'undefined' && localStorage.getItem('v5_pivot_mode') === 'true',
  
  // Rollback flags (always on, can disable via localStorage for testing)
  SMART_EMPTY_STATES: typeof window !== 'undefined' ? localStorage.getItem('v5_smart_empty_states') !== 'false' : true,
};
