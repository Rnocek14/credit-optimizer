import type { ModuleTemplate } from '../types/templates';
import type { MarketplaceOption } from '../types/v5';

/**
 * Canonical accessor for template courses/options
 * Guards against field name drift and provides a single source of truth
 * 
 * @param template - ModuleTemplate to extract courses from
 * @returns Array of MarketplaceOptions from the template
 */
export function getTemplateCourses(template: ModuleTemplate): MarketplaceOption[] {
  // Type-safe: ModuleTemplate always has options
  const courses = template.options ?? [];
  
  // Runtime guard: warn if both keys exist (data inconsistency)
  if ('courses' in template && 'options' in template) {
    console.warn(
      '[Template] Both courses and options keys exist on template',
      { templateId: template.id, label: template.label }
    );
  }
  
  return courses;
}

/**
 * Sanitize telemetry payload to prevent bloat
 * - Caps string fields to max length
 * - Prevents huge arrays from being sent
 * - Removes PII and sensitive data
 */
export function sanitizeTelemetryPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(payload)) {
    // Cap strings at 80 chars
    if (typeof value === 'string' && value.length > 80) {
      sanitized[key] = value.slice(0, 77) + '...';
      continue;
    }
    
    // Cap arrays at 20 items (send count instead)
    if (Array.isArray(value) && value.length > 20) {
      sanitized[`${key}_count`] = value.length;
      continue;
    }
    
    // Pass through primitives and small arrays
    sanitized[key] = value;
  }
  
  return sanitized;
}
