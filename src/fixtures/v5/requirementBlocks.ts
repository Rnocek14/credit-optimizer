/**
 * Requirement blocks for CS degree
 * These define the academic requirements and their rules
 */

export interface RequirementBlockFixture {
  id: string;
  slug: string;
  title: string;
  program_id: string;
  rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
  credits_needed: number;
  level_year: number;
  area: string;
  description?: string;
}

export const REQUIREMENT_BLOCKS: RequirementBlockFixture[] = [
  {
    id: 'block-general-education',
    slug: 'general-education',
    title: 'General Education Core',
    program_id: 'bs_cs',
    rule_type: 'CREDITS',
    credits_needed: 36,
    level_year: 1,
    area: 'foundation',
    description: 'Breadth requirements across disciplines'
  },
  {
    id: 'block-cs-prerequisites',
    slug: 'cs-prerequisites',
    title: 'CS Prerequisites',
    program_id: 'bs_cs',
    rule_type: 'CREDITS',
    credits_needed: 12,
    level_year: 1,
    area: 'foundation',
    description: 'Mathematical foundations for computer science'
  },
  {
    id: 'block-cs-core',
    slug: 'cs-core',
    title: 'Computer Science Core',
    program_id: 'bs_cs',
    rule_type: 'CREDITS',
    credits_needed: 42,
    level_year: 2,
    area: 'core',
    description: 'Fundamental CS courses'
  },
  {
    id: 'block-science-foundation',
    slug: 'science-foundation',
    title: 'Foundation Science',
    program_id: 'bs_cs',
    rule_type: 'CREDITS',
    credits_needed: 16,
    level_year: 2,
    area: 'science',
    description: 'Natural science requirements'
  },
  {
    id: 'block-electives',
    slug: 'electives',
    title: 'Electives',
    program_id: 'bs_cs',
    rule_type: 'CREDITS',
    credits_needed: 14,
    level_year: 3,
    area: 'elective',
    description: 'Free choice courses'
  }
];

/**
 * Helper to get blocks by program
 */
export function getBlocksByProgram(programId: string): RequirementBlockFixture[] {
  return REQUIREMENT_BLOCKS.filter(block => block.program_id === programId);
}

/**
 * Helper to get block by slug
 */
export function getBlockBySlug(slug: string): RequirementBlockFixture | undefined {
  return REQUIREMENT_BLOCKS.find(block => block.slug === slug);
}
