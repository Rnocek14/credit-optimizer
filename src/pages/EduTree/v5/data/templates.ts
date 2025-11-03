import type { ModuleTemplate } from '../types/templates';

/**
 * Temporary alias map: human-readable slugs → database UUIDs
 * Allows templates to use friendly IDs while resolving to actual DB IDs
 * Phase 1: Bootstrap mapping (extend as you discover real module UUIDs)
 */
const MODULE_ALIAS: Record<string, string> = {
  // Year 1 - Foundations
  'y1-found': 'c4258b6d-0422-4b8e-9a44-e9d4a7d83167',
  // Year 2 - Core I
  'y2-core1': '15b68444-6e24-43a4-acfc-0a4bf13a60b2',
  // TODO: Fill these after grabbing UUIDs from module URLs:
  'y1-math': '',      // TODO: Copy from URL when opening Math module
  'y1-genedAB': '',   // TODO: Copy from URL when opening GenEd module
};

/**
 * Static template seeds (pre-generated for common modules)
 * CLEARED: Now using dynamic generation from fixtures
 */
export const MODULE_TEMPLATES: ModuleTemplate[] = [];

/**
 * Get templates for specific module
 * Returns empty array - templates should be generated dynamically
 */
export function getTemplatesForModule(moduleId: string): ModuleTemplate[] {
  console.log('[Templates] 🔍 getTemplatesForModule called (returning empty - use dynamic generation)');
  return [];
}

/**
 * Get all templates
 */
export function getAllModuleTemplates(): ModuleTemplate[] {
  return MODULE_TEMPLATES;
}
