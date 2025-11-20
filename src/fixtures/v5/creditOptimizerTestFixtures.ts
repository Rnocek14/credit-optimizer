/**
 * Credit Optimizer Test Fixtures
 * Pre-configured expensive courses to quickly verify Credit Optimizer functionality
 */

import type { BasketItem } from '@/pages/EduTree/v5/state/usePlanBasket';

/**
 * Test Scenario: High-cost plan with many cheaper alternatives
 * Coverage: All 4 years (24 courses, 75 credits)
 * Expected savings: ~$15,000+ and 30+ weeks faster
 * 
 * Year 1-2: Gen Ed + Math (strong MOOC alternatives)
 * Year 3-4: CS Core + Science + Electives (moderate alternatives)
 */
export const EXPENSIVE_TEST_PLAN: BasketItem[] = [
  // General Education - All expensive university courses with cheap alternatives
  {
    moduleId: 'y1-fall-gened-humanities',
    courseId: 'ENG-101',
    title: 'Composition I',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 75,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y1-fall-gened-humanities',
    courseId: 'COMM-110',
    title: 'Public Speaking',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 72,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y1-spring-gened-social',
    courseId: 'HUM-201',
    title: 'Ethics',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 78,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 200,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y1-spring-gened-social',
    courseId: 'PSY-101',
    title: 'Introduction to Psychology',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 73,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y2-fall-gened-history',
    courseId: 'HIST-101',
    title: 'US History I',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 71,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y2-spring-gened-arts',
    courseId: 'ART-105',
    title: 'Art Appreciation',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 68,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  // Math courses - expensive with cheaper alternatives
  {
    moduleId: 'y1-fall-math-prereqs',
    courseId: 'MATH-ALGEBRA',
    title: 'College Algebra',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 76,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y1-spring-math-calc',
    courseId: 'MATH-151',
    title: 'Calculus I',
    credits: 4,
    cost_usd: 1500,
    duration_weeks: 8,
    workload_weekly_hours: 12,
    cri_score: 82,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  
  // ============ Year 3 Courses (8 courses) ============
  {
    moduleId: 'y3-fall-cs-core-c',
    courseId: 'CS-301',
    title: 'Algorithms',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 88,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y3-fall-science-c',
    courseId: 'PHY-111',
    title: 'Physics I',
    credits: 4,
    cost_usd: 1500,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 80,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y3-fall-elective-a',
    courseId: 'ELEC-BUS-201',
    title: 'Business Management',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 72,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 200,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y3-spring-cs-core-d',
    courseId: 'CS-310',
    title: 'Operating Systems',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 86,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y3-spring-cs-core-d',
    courseId: 'CS-315',
    title: 'Computer Networks',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 83,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y3-spring-science-d',
    courseId: 'PHY-112',
    title: 'Physics II',
    credits: 4,
    cost_usd: 1500,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 81,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 100,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y3-spring-elective-a',
    courseId: 'ELEC-ECON-201',
    title: 'Microeconomics',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 74,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 200,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y3-spring-cs-core-d',
    courseId: 'CS-305',
    title: 'Database Systems',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 84,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  
  // ============ Year 4 Courses (8 courses) ============
  {
    moduleId: 'y4-fall-cs-core-e',
    courseId: 'CS-320',
    title: 'Software Engineering',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 87,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y4-fall-cs-core-e',
    courseId: 'CS-401',
    title: 'Theory of Computation',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 90,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 400,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y4-fall-elective-b',
    courseId: 'ELEC-MGT-301',
    title: 'Project Management',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 76,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y4-fall-elective-b',
    courseId: 'ELEC-CS-360',
    title: 'Mobile App Development',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 85,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y4-spring-cs-core-capstone',
    courseId: 'CS-490',
    title: 'Senior Capstone',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 16,
    workload_weekly_hours: 12,
    cri_score: 85,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 400,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y4-spring-cs-core-capstone',
    courseId: 'CS-405',
    title: 'Compiler Design',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 89,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 400,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y4-spring-cs-core-capstone',
    courseId: 'CS-410',
    title: 'Artificial Intelligence',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 10,
    cri_score: 92,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 400,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
  {
    moduleId: 'y4-spring-elective-c',
    courseId: 'ELEC-STAT-301',
    title: 'Statistics',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 77,
    status: 'pinned',
    providerType: 'university',
    providerCode: 'SU',
    level: 300,
    source: {
      type: 'manual',
      templateLabel: 'Test Data',
    },
  },
];

/**
 * Expected optimization results for EXPENSIVE_TEST_PLAN:
 * 
 * Sample swaps (first 8 shown):
 * Year 1-2 Gen Ed:
 * 1. ENG-101 ($1125) → ENG-ACE ($150) = save $975
 * 2. COMM-110 ($1125) → COMM-ACE ($99) = save $1026
 * 3. PSY-101 ($1125) → PSY-ACE ($150) = save $975
 * 4. MATH-ALGEBRA ($1125) → MATH-ACE ($150) = save $975
 * 5. MATH-151 ($1500) → MATH-CALC-ACE ($199) = save $1301
 * 
 * Year 3-4 CS Core:
 * 6. CS-301 ($1125) → CS-ACE-ALGORITHMS ($199) = save $926
 * 7. CS-305 ($1125) → CS-ACE-DATABASES ($199) = save $926
 * 8. PHY-111 ($1500) → PHY-ACE-I ($400) = save $1100
 * 
 * Total potential savings: $15,000+ and 30+ weeks faster
 * Total courses: 24 across 4 years
 */

/**
 * Test Scenario: Mixed plan with some optimization potential
 * Expected: Moderate savings (~$2000)
 */
export const MIXED_TEST_PLAN: BasketItem[] = [
  // Some expensive courses
  {
    moduleId: 'y1-fall-gened-humanities',
    courseId: 'ENG-101',
    title: 'Composition I',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 75,
    status: 'pinned',
    providerType: 'university',
    level: 100,
  },
  {
    moduleId: 'y1-fall-gened-humanities',
    courseId: 'COMM-110',
    title: 'Public Speaking',
    credits: 3,
    cost_usd: 1125,
    duration_weeks: 8,
    workload_weekly_hours: 9,
    cri_score: 72,
    status: 'pinned',
    providerType: 'university',
    level: 100,
  },
  // Some already optimized courses
  {
    moduleId: 'y1-spring-gened-social',
    courseId: 'PSY-ACE',
    title: 'Psychology (ACE)',
    credits: 3,
    cost_usd: 150,
    duration_weeks: 4,
    workload_weekly_hours: 8,
    cri_score: 62,
    status: 'auto-filled',
    providerType: 'mooc',
    level: 100,
  },
];

/**
 * Test Scenario: Already optimized plan
 * Expected: No suggestions (all courses are cheapest options)
 */
export const OPTIMIZED_TEST_PLAN: BasketItem[] = [
  {
    moduleId: 'y1-fall-gened-humanities',
    courseId: 'ENG-ACE',
    title: 'English Composition (ACE)',
    credits: 3,
    cost_usd: 150,
    duration_weeks: 4,
    workload_weekly_hours: 8,
    cri_score: 65,
    status: 'auto-filled',
    providerType: 'mooc',
    level: 100,
  },
  {
    moduleId: 'y1-fall-gened-humanities',
    courseId: 'COMM-ACE',
    title: 'Communication (Sophia)',
    credits: 3,
    cost_usd: 99,
    duration_weeks: 2,
    workload_weekly_hours: 10,
    cri_score: 60,
    status: 'auto-filled',
    providerType: 'mooc',
    level: 100,
  },
  {
    moduleId: 'y1-spring-gened-social',
    courseId: 'PSY-ACE',
    title: 'Psychology (ACE)',
    credits: 3,
    cost_usd: 150,
    duration_weeks: 4,
    workload_weekly_hours: 8,
    cri_score: 62,
    status: 'auto-filled',
    providerType: 'mooc',
    level: 100,
  },
];

export type TestPlanType = 'expensive' | 'mixed' | 'optimized';

export function getTestPlan(type: TestPlanType): BasketItem[] {
  switch (type) {
    case 'expensive':
      return EXPENSIVE_TEST_PLAN;
    case 'mixed':
      return MIXED_TEST_PLAN;
    case 'optimized':
      return OPTIMIZED_TEST_PLAN;
    default:
      return EXPENSIVE_TEST_PLAN;
  }
}
