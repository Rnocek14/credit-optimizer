/**
 * V5 Feature Flags - Local Development Toggles
 * Use localStorage to enable/disable features during development
 * 
 * Usage:
 * localStorage.setItem('v5_autofill_enabled', 'true');
 * localStorage.setItem('v5_design_v2', 'true');
 */

export const FEATURE_FLAGS = {
  v5_autofill_enabled: typeof window !== 'undefined' && localStorage.getItem('v5_autofill_enabled') === 'true',
  v5_design_v2: typeof window !== 'undefined' && localStorage.getItem('v5_design_v2') === 'true',
  v5_decision_dock: true,
  v5_templates_module: typeof window !== 'undefined' && localStorage.getItem('v5_templates_module') === 'true',
};
