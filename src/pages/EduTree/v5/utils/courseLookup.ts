import type { MarketplaceOption } from '../types/v5';

/**
 * Build a fast lookup index from marketplace options
 */
export function buildCourseIndex(options: MarketplaceOption[]): Map<string, MarketplaceOption> {
  const index = new Map<string, MarketplaceOption>();
  
  for (const option of options) {
    // Index by both option.id and option.courseId for flexible lookup
    index.set(option.id, option);
    if (option.courseId && option.courseId !== option.id) {
      index.set(option.courseId, option);
    }
  }
  
  return index;
}

/**
 * Lookup a course by ID from a marketplace index
 */
export function getCourseFromIndex(
  index: Map<string, MarketplaceOption> | undefined, 
  id: string
): MarketplaceOption | undefined {
  if (!index) return undefined;
  return index.get(id);
}
