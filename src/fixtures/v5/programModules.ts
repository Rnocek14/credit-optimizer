/**
 * Program module distribution across 4 years (8 terms)
 * Each module maps to a requirement block and has target credits
 */

export interface ProgramModule {
  id: string;
  year: number;
  term: 'fall' | 'spring';
  blockId: string; // Links to requirement block
  label: string;
  creditsRequired: number;
  courseIds: string[]; // Suggested courses for this module (from courseOptions)
  icon?: string;
  description?: string;
}

/**
 * Complete 120-credit CS degree distribution
 * 
 * Breakdown by block:
 * - General Education: 36 credits (distributed Y1-Y2)
 * - CS Prerequisites: 12 credits (Y1)
 * - CS Core: 42 credits (Y2-Y4)
 * - Science Foundation: 16 credits (Y2-Y3)
 * - Electives: 14 credits (Y3-Y4)
 * 
 * Target: ~30 credits/year, ~15 credits/term
 */
export const PROGRAM_MODULES: ProgramModule[] = [
  // ========== YEAR 1 (30 credits) ==========
  // Fall Semester (15 credits)
  {
    id: 'y1-fall-gened-humanities',
    year: 1,
    term: 'fall',
    blockId: 'general-education',
    label: 'Humanities Core',
    creditsRequired: 6,
    courseIds: ['ENG-101', 'COMM-110', 'ENG-ACE', 'COMM-ACE'],
    icon: '📚',
    description: 'Communication foundations'
  },
  {
    id: 'y1-fall-math-prereqs',
    year: 1,
    term: 'fall',
    blockId: 'cs-prerequisites',
    label: 'Math Foundations',
    creditsRequired: 6,
    courseIds: ['MATH-ALGEBRA', 'MATH-TRIG'],
    icon: '🧮',
    description: 'Mathematical foundations'
  },
  {
    id: 'y1-fall-cs-intro',
    year: 1,
    term: 'fall',
    blockId: 'cs-core',
    label: 'CS Introduction',
    creditsRequired: 3,
    courseIds: ['CS-101'],
    icon: '💻',
    description: 'First CS course'
  },
  
  // Spring Semester (15 credits)
  {
    id: 'y1-spring-gened-social',
    year: 1,
    term: 'spring',
    blockId: 'general-education',
    label: 'Social Sciences',
    creditsRequired: 6,
    courseIds: ['SOC-101', 'PSY-101', 'PSY-ACE'],
    icon: '📚',
    description: 'Understanding society'
  },
  {
    id: 'y1-spring-math-calc',
    year: 1,
    term: 'spring',
    blockId: 'cs-prerequisites',
    label: 'Calculus & Discrete',
    creditsRequired: 6,
    courseIds: ['MATH-CALC1', 'MATH-DISCRETE'],
    icon: '🧮',
    description: 'Advanced mathematics'
  },
  {
    id: 'y1-spring-cs-programming',
    year: 1,
    term: 'spring',
    blockId: 'cs-core',
    label: 'Programming I',
    creditsRequired: 3,
    courseIds: ['CS-110'],
    icon: '💻',
    description: 'Learn Python'
  },
  
  // ========== YEAR 2 (30 credits) ==========
  // Fall Semester (15 credits)
  {
    id: 'y2-fall-gened-humanities-advanced',
    year: 2,
    term: 'fall',
    blockId: 'general-education',
    label: 'Ethics & Philosophy',
    creditsRequired: 6,
    courseIds: ['HUM-201', 'HUM-202'],
    icon: '📚',
    description: 'Critical thinking'
  },
  {
    id: 'y2-fall-cs-core-a',
    year: 2,
    term: 'fall',
    blockId: 'cs-core',
    label: 'Programming II & Architecture',
    creditsRequired: 6,
    courseIds: ['CS-111', 'CS-210'],
    icon: '💻',
    description: 'Java and computer systems'
  },
  {
    id: 'y2-fall-science-a',
    year: 2,
    term: 'fall',
    blockId: 'science-foundation',
    label: 'Science I (with Lab)',
    creditsRequired: 4,
    courseIds: ['PHY-111', 'BIO-101', 'CHEM-111'],
    icon: '🔬',
    description: 'Choose one science sequence'
  },
  
  // Spring Semester (15 credits)
  {
    id: 'y2-spring-gened-history-arts',
    year: 2,
    term: 'spring',
    blockId: 'general-education',
    label: 'History & Arts',
    creditsRequired: 6,
    courseIds: ['HIST-101', 'ART-105'],
    icon: '📚',
    description: 'Cultural understanding'
  },
  {
    id: 'y2-spring-cs-core-b',
    year: 2,
    term: 'spring',
    blockId: 'cs-core',
    label: 'Data Structures',
    creditsRequired: 3,
    courseIds: ['CS-220'],
    icon: '💻',
    description: 'Core CS concepts'
  },
  {
    id: 'y2-spring-science-b',
    year: 2,
    term: 'spring',
    blockId: 'science-foundation',
    label: 'Science II (with Lab)',
    creditsRequired: 4,
    courseIds: ['PHY-112', 'BIO-102', 'CHEM-112'],
    icon: '🔬',
    description: 'Continue science sequence'
  },
  
  // ========== YEAR 3 (30 credits) ==========
  // Fall Semester (16 credits)
  {
    id: 'y3-fall-cs-core-c',
    year: 3,
    term: 'fall',
    blockId: 'cs-core',
    label: 'Algorithms & Databases',
    creditsRequired: 6,
    courseIds: ['CS-301', 'CS-305'],
    icon: '💻',
    description: 'Upper-division core'
  },
  {
    id: 'y3-fall-science-c',
    year: 3,
    term: 'fall',
    blockId: 'science-foundation',
    label: 'Science III (with Lab)',
    creditsRequired: 4,
    courseIds: ['PHY-111', 'BIO-101', 'CHEM-111'],
    icon: '🔬',
    description: 'Third science course'
  },
  {
    id: 'y3-fall-gened-completion',
    year: 3,
    term: 'fall',
    blockId: 'general-education',
    label: 'Gen Ed Completion',
    creditsRequired: 6,
    courseIds: ['ENG-102', 'HIST-102'],
    icon: '📚',
    description: 'Complete gen ed requirements'
  },
  
  // Spring Semester (14 credits)
  {
    id: 'y3-spring-cs-core-d',
    year: 3,
    term: 'spring',
    blockId: 'cs-core',
    label: 'OS & Networks',
    creditsRequired: 6,
    courseIds: ['CS-310', 'CS-315'],
    icon: '💻',
    description: 'Systems programming'
  },
  {
    id: 'y3-spring-science-d',
    year: 3,
    term: 'spring',
    blockId: 'science-foundation',
    label: 'Science IV (with Lab)',
    creditsRequired: 4,
    courseIds: ['PHY-112', 'BIO-102', 'CHEM-112'],
    icon: '🔬',
    description: 'Complete science sequence'
  },
  {
    id: 'y3-spring-elective-a',
    year: 3,
    term: 'spring',
    blockId: 'electives',
    label: 'Elective I',
    creditsRequired: 3,
    courseIds: ['ELEC-BUS-201', 'ELEC-CS-350', 'ELEC-ACE-BUS'],
    icon: '🎯',
    description: 'Free choice'
  },
  
  // ========== YEAR 4 (30 credits) ==========
  // Fall Semester (15 credits)
  {
    id: 'y4-fall-cs-core-e',
    year: 4,
    term: 'fall',
    blockId: 'cs-core',
    label: 'Software Engineering & Theory',
    creditsRequired: 6,
    courseIds: ['CS-320', 'CS-401'],
    icon: '💻',
    description: 'Advanced CS concepts'
  },
  {
    id: 'y4-fall-elective-b',
    year: 4,
    term: 'fall',
    blockId: 'electives',
    label: 'Electives II',
    creditsRequired: 6,
    courseIds: ['ELEC-MGT-301', 'ELEC-CS-360', 'ELEC-CS-370'],
    icon: '🎯',
    description: 'Specialization courses'
  },
  {
    id: 'y4-fall-gened-final',
    year: 4,
    term: 'fall',
    blockId: 'general-education',
    label: 'Gen Ed Final',
    creditsRequired: 3,
    courseIds: ['ENG-102', 'HIST-102', 'ART-105'],
    icon: '📚',
    description: 'Final gen ed if needed'
  },
  
  // Spring Semester (15 credits)
  {
    id: 'y4-spring-cs-core-capstone',
    year: 4,
    term: 'spring',
    blockId: 'cs-core',
    label: 'Capstone & Advanced Topics',
    creditsRequired: 9,
    courseIds: ['CS-490', 'CS-405', 'CS-410'],
    icon: '💻',
    description: 'Senior project and electives'
  },
  {
    id: 'y4-spring-elective-c',
    year: 4,
    term: 'spring',
    blockId: 'electives',
    label: 'Electives III',
    creditsRequired: 5,
    courseIds: ['ELEC-STAT-301', 'ELEC-CS-350', 'ELEC-ACE-BUS'],
    icon: '🎯',
    description: 'Final electives'
  },
  {
    id: 'y4-spring-gened-overflow',
    year: 4,
    term: 'spring',
    blockId: 'general-education',
    label: 'Gen Ed Overflow',
    creditsRequired: 3,
    courseIds: ['ENG-ACE', 'COMM-ACE', 'PSY-ACE'],
    icon: '📚',
    description: 'Buffer for gen ed completion'
  },
];

/**
 * Helper to get modules for a specific year
 */
export function getModulesByYear(year: number): ProgramModule[] {
  return PROGRAM_MODULES.filter(mod => mod.year === year);
}

/**
 * Helper to get modules for a specific year and term
 */
export function getModulesByYearAndTerm(year: number, term: 'fall' | 'spring'): ProgramModule[] {
  return PROGRAM_MODULES.filter(mod => mod.year === year && mod.term === term);
}

/**
 * Summary statistics
 */
export function getProgramSummary() {
  const totalCredits = PROGRAM_MODULES.reduce((sum, mod) => sum + mod.creditsRequired, 0);
  const creditsByYear = [1, 2, 3, 4].map(year => ({
    year,
    credits: PROGRAM_MODULES.filter(m => m.year === year).reduce((s, m) => s + m.creditsRequired, 0)
  }));
  
  return {
    totalCredits,
    totalModules: PROGRAM_MODULES.length,
    creditsByYear
  };
}
