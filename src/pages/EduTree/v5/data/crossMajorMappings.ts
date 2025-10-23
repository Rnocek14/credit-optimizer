import type { CanonicalId } from '../types/templates';

/**
 * Phase 1d: Cross-Major Mapping System (Stub)
 * Maps prior degree courses from non-CS majors to CS canonical requirements
 */

export type CrossMajorMapping = {
  sourceMajor: 'ENGLISH' | 'BUSINESS' | 'PSYCHOLOGY' | 'HISTORY' | 'MATH' | 'SCIENCE' | 'OTHER';
  sourceCourse: string; // e.g., "ENG-101", "BUS-210"
  targetCanonicalId: CanonicalId;
  credits: number;
  notes?: string;
};

/**
 * Seed mappings (Phase 1d - to be populated)
 * Priority: Top 10 most common BA/BS → CS transfers
 * 
 * TODO: Populate with:
 * 1. English → CS (Technical Writing, Composition)
 * 2. Business → CS (Statistics, Economics)
 * 3. Math → CS (Calc I/II, Linear Algebra, Discrete Math)
 * 4. Science → CS (Physics, Chemistry for STEM requirement)
 * 5. Any → CS (Free electives, up to 20 credits depending on school)
 */
export const CROSS_MAJOR_MAPPINGS: CrossMajorMapping[] = [
  // Phase 1d: To be seeded
  // Example:
  // {
  //   sourceMajor: 'ENGLISH',
  //   sourceCourse: 'ENG-101',
  //   targetCanonicalId: 'gen-ed-english-comp',
  //   credits: 3,
  //   notes: 'Universal acceptance for Composition I requirement'
  // },
];

/**
 * Find cross-major mappings for a given source course
 */
export function findCrossMajorMappings(
  sourceMajor: string,
  sourceCourse: string
): CrossMajorMapping[] {
  return CROSS_MAJOR_MAPPINGS.filter(
    m => m.sourceMajor === sourceMajor && m.sourceCourse.toUpperCase() === sourceCourse.toUpperCase()
  );
}

/**
 * Estimate elective absorption capacity for target school
 * (How many "free electives" they accept from unrelated majors)
 */
export function estimateElectiveAbsorption(priorCredits: number, targetSchool: string): number {
  // Phase 1d: To be implemented with school-specific rules
  // WGU: 90 max transfer (75% of 120)
  // TESU: 113 max transfer (94% of 120)
  // UMPI: 90 max transfer (75% of 120)
  
  const schoolCapacity: Record<string, number> = {
    'WGU': 90,
    'TESU': 113,
    'UMPI': 90,
  };
  
  return Math.min(priorCredits, schoolCapacity[targetSchool] ?? 60);
}

/**
 * Calculate credit utilization percentage
 */
export function calculateCreditUtilization(
  priorCredits: number,
  targetRequirementCredits: number
): number {
  if (targetRequirementCredits === 0) return 0;
  return Math.round((priorCredits / targetRequirementCredits) * 100);
}
