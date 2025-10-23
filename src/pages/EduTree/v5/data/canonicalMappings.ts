import type { CanonicalId } from '../types/templates';

/**
 * Provider course → canonical requirement mapping
 * Maps specific provider courses to canonical degree requirements
 */
export interface ProviderCourseMapping {
  providerCode: string;
  courseCode: string;
  canonicalIds: CanonicalId[];
  level?: 100 | 200 | 300 | 400; // Course level
  credits: number;
}

/**
 * Canonical mappings registry
 * Bootstrap from known equivalencies - expand incrementally
 */
export const CANONICAL_MAPPINGS: ProviderCourseMapping[] = [
  // Mathematics (maps to RequirementBlock slug: 'mathematics')
  { providerCode: 'SOPHIA', courseCode: 'MAT101', canonicalIds: ['mathematics'], level: 100, credits: 3 },
  { providerCode: 'STRAIGHTERLINE', courseCode: 'MAT201', canonicalIds: ['mathematics'], level: 100, credits: 3 },
  { providerCode: 'WGU', courseCode: 'C958', canonicalIds: ['mathematics'], level: 100, credits: 4 },
  { providerCode: 'STUDY', courseCode: 'MATH101', canonicalIds: ['mathematics'], level: 100, credits: 3 },
  
  // General Education (maps to 'general-education')
  { providerCode: 'SOPHIA', courseCode: 'ENG101', canonicalIds: ['general-education'], level: 100, credits: 3 },
  { providerCode: 'SOPHIA', courseCode: 'ENG102', canonicalIds: ['general-education'], level: 100, credits: 3 },
  { providerCode: 'CLEP', courseCode: 'ENGLISH_COMP', canonicalIds: ['general-education'], level: 100, credits: 6 },
  { providerCode: 'WGU', courseCode: 'C455', canonicalIds: ['general-education'], level: 100, credits: 3 },
  
  // Foundations (maps to 'foundations')
  { providerCode: 'SOPHIA', courseCode: 'CS101', canonicalIds: ['foundations'], level: 100, credits: 3 },
  { providerCode: 'WGU', courseCode: 'C949', canonicalIds: ['foundations'], level: 100, credits: 3 },
  { providerCode: 'STRAIGHTERLINE', courseCode: 'CS101', canonicalIds: ['foundations'], level: 100, credits: 3 },
  
  // Core-I - CS Program Core (maps to 'core-i')
  { providerCode: 'WGU', courseCode: 'C950', canonicalIds: ['core-i'], level: 200, credits: 4 },
  { providerCode: 'WGU', courseCode: 'C955', canonicalIds: ['core-i'], level: 200, credits: 4 },
  { providerCode: 'SNHU', courseCode: 'CS201', canonicalIds: ['core-i'], level: 200, credits: 3 },
  
  // Add more mappings as needed...
];

/**
 * Get canonical IDs for a specific course
 */
export function getCanonicalIds(providerCode: string, courseCode: string): CanonicalId[] {
  const mapping = CANONICAL_MAPPINGS.find(
    m => m.providerCode.toUpperCase() === providerCode.toUpperCase() 
      && m.courseCode.toUpperCase() === courseCode.toUpperCase()
  );
  return mapping?.canonicalIds ?? [];
}

/**
 * Check if course satisfies canonical requirement
 */
export function satisfiesCanonical(
  providerCode: string,
  courseCode: string,
  targetCanonicalId: CanonicalId
): boolean {
  const ids = getCanonicalIds(providerCode, courseCode);
  return ids.includes(targetCanonicalId);
}

/**
 * Get all courses that satisfy a canonical requirement
 */
export function getCoursesForCanonical(canonicalId: CanonicalId): ProviderCourseMapping[] {
  return CANONICAL_MAPPINGS.filter(m => m.canonicalIds.includes(canonicalId));
}

/**
 * Get course level (for upper-division tracking)
 */
export function getCourseLevel(providerCode: string, courseCode: string): number | undefined {
  const mapping = CANONICAL_MAPPINGS.find(
    m => m.providerCode.toUpperCase() === providerCode.toUpperCase() 
      && m.courseCode.toUpperCase() === courseCode.toUpperCase()
  );
  return mapping?.level;
}
