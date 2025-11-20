/**
 * Credit Optimizer Test Fixtures
 * Pre-configured expensive courses to quickly verify Credit Optimizer functionality
 */

import type { BasketItem } from '@/pages/EduTree/v5/state/usePlanBasket';

/**
 * Test Scenario: High-cost plan with many cheaper alternatives
 * Expected savings: ~$6,000+ and faster completion
 */
export const EXPENSIVE_TEST_PLAN: BasketItem[] = [
  // General Education - All expensive university courses with cheap alternatives
  {
    moduleId: 'y1-fall-gen-ed-english',
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
    moduleId: 'y1-fall-gen-ed-comm',
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
    moduleId: 'y1-spring-gen-ed-humanities-1',
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
    moduleId: 'y1-spring-gen-ed-social-science-1',
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
    moduleId: 'y2-fall-gen-ed-history-1',
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
    moduleId: 'y2-spring-gen-ed-arts',
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
    moduleId: 'y1-spring-math-core',
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
];

/**
 * Expected optimization results for EXPENSIVE_TEST_PLAN:
 * 
 * Potential swaps (first 5 shown):
 * 1. ENG-101 ($1125) → ENG-ACE ($150) = save $975
 * 2. COMM-110 ($1125) → COMM-ACE ($99) = save $1026
 * 3. PSY-101 ($1125) → PSY-ACE ($150) = save $975
 * 4. MATH-ALGEBRA ($1125) → MATH-ACE ($150) = save $975
 * 5. MATH-151 ($1500) → MATH-CALC-ACE ($199) = save $1301
 * 
 * Total potential savings: $5,000+ and 20+ weeks faster
 */

/**
 * Test Scenario: Mixed plan with some optimization potential
 * Expected: Moderate savings (~$2000)
 */
export const MIXED_TEST_PLAN: BasketItem[] = [
  // Some expensive courses
  {
    moduleId: 'y1-fall-gen-ed-english',
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
    moduleId: 'y1-fall-gen-ed-comm',
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
    moduleId: 'y1-spring-gen-ed-social-science-1',
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
    moduleId: 'y1-fall-gen-ed-english',
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
    moduleId: 'y1-fall-gen-ed-comm',
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
    moduleId: 'y1-spring-gen-ed-social-science-1',
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
