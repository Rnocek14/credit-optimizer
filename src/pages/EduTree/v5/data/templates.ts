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
  // Year 3-4 Track-specific modules
  'y3-se-core': '',   // TODO: Copy from URL when opening SE Core module
  'y3-ds-core': '',   // TODO: Copy from URL when opening DS Core module
  'y4-se-cap': '',    // TODO: Copy from URL when opening SE Capstone module
  'y4-ds-cap': '',    // TODO: Copy from URL when opening DS Capstone module
};

/**
 * Static template seeds (pre-generated for common modules)
 * Phase 1: Bootstrap with 9 templates (3 modules × 3 variants)
 */
export const MODULE_TEMPLATES: ModuleTemplate[] = [
  // Mathematics module - 3 variants
  {
    id: 'math-cheapest',
    kind: 'module',
    moduleId: 'y1-math',
    label: 'Mathematics: Budget-Optimized',
    summary: '$99 • 4w • 3cr • CRI 78',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-mat101',
        courseId: 'MAT101',
        title: 'College Algebra',
        credits: 3,
        subject: 'Mathematics',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 100,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 8,
        cri_score: 78,
        satisfies_requirements: ['mathematics']
      }
    ],
    recommendedCourseId: 'MAT101',
    targetCanonicalIds: ['mathematics'],
    semesterPlacement: 'any',
    est: { costUsd: 99, weeks: 4, credits: 3, cri: 78, workloadHours: 8 },
    generatedFrom: 'manual'
  },
  {
    id: 'math-fastest',
    kind: 'module',
    moduleId: 'y1-math',
    label: 'Mathematics: Fast-Track',
    summary: '$149 • 2w • 3cr • CRI 82',
    badge: 'Fastest',
    options: [
      {
        id: 'straighterline-mat201',
        courseId: 'MAT201',
        title: 'College Algebra',
        credits: 3,
        subject: 'Mathematics',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 100,
        cost_usd: 149,
        duration_weeks: 2,
        workload_weekly_hours: 15,
        cri_score: 82,
        satisfies_requirements: ['mathematics']
      }
    ],
    recommendedCourseId: 'MAT201',
    targetCanonicalIds: ['mathematics'],
    semesterPlacement: 'any',
    est: { costUsd: 149, weeks: 2, credits: 3, cri: 82, workloadHours: 15 },
    generatedFrom: 'manual'
  },
  {
    id: 'math-prestige',
    kind: 'module',
    moduleId: 'y1-math',
    label: 'Mathematics: Premium Quality',
    summary: '$1200 • 8w • 4cr • CRI 92',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c958',
        courseId: 'C958',
        title: 'Calculus I',
        credits: 4,
        subject: 'Mathematics',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 100,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 12,
        cri_score: 92,
        satisfies_requirements: ['mathematics']
      }
    ],
    recommendedCourseId: 'C958',
    targetCanonicalIds: ['mathematics'],
    semesterPlacement: 'fall',
    est: { costUsd: 1200, weeks: 8, credits: 4, cri: 92, workloadHours: 12 },
    generatedFrom: 'manual'
  },
  
  // General Education - 3 variants
  {
    id: 'gened-cheapest',
    kind: 'module',
    moduleId: 'y1-genedAB',
    label: 'General Education: Budget-Optimized',
    summary: '$99 • 4w • 3cr • CRI 75',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-eng101',
        courseId: 'ENG101',
        title: 'English Composition I',
        credits: 3,
        subject: 'English',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 100,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 10,
        cri_score: 75,
        satisfies_requirements: ['general-education']
      }
    ],
    recommendedCourseId: 'ENG101',
    targetCanonicalIds: ['general-education'],
    semesterPlacement: 'any',
    est: { costUsd: 99, weeks: 4, credits: 3, cri: 75, workloadHours: 10 },
    generatedFrom: 'manual'
  },
  {
    id: 'gened-fastest',
    kind: 'module',
    moduleId: 'y1-genedAB',
    label: 'General Education: Fast-Track',
    summary: '$89 • 1w • 6cr • CRI 80',
    badge: 'Fastest',
    options: [
      {
        id: 'clep-english-comp',
        courseId: 'ENGLISH_COMP',
        title: 'College Composition',
        credits: 6,
        subject: 'English',
        provider: 'CLEP',
        providerType: 'testing_center',
        providerCode: 'CLEP',
        level: 100,
        cost_usd: 89,
        duration_weeks: 1,
        workload_weekly_hours: 20,
        cri_score: 80,
        satisfies_requirements: ['general-education']
      }
    ],
    recommendedCourseId: 'ENGLISH_COMP',
    targetCanonicalIds: ['general-education'],
    semesterPlacement: 'any',
    est: { costUsd: 89, weeks: 1, credits: 6, cri: 80, workloadHours: 20 },
    generatedFrom: 'manual'
  },
  {
    id: 'gened-prestige',
    kind: 'module',
    moduleId: 'y1-genedAB',
    label: 'General Education: Premium Quality',
    summary: '$1200 • 8w • 3cr • CRI 90',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c455',
        courseId: 'C455',
        title: 'English Composition I',
        credits: 3,
        subject: 'English',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 100,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 10,
        cri_score: 90,
        satisfies_requirements: ['general-education']
      }
    ],
    recommendedCourseId: 'C455',
    targetCanonicalIds: ['general-education'],
    semesterPlacement: 'fall',
    est: { costUsd: 1200, weeks: 8, credits: 3, cri: 90, workloadHours: 10 },
    generatedFrom: 'manual'
  },
  
  // Foundations - 3 variants
  {
    id: 'found-cheapest',
    kind: 'module',
    moduleId: 'c4258b6d-0422-4b8e-9a44-e9d4a7d83167',
    label: 'Foundations: Budget-Optimized',
    summary: '$99 • 4w • 3cr • CRI 76',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-cs101',
        courseId: 'CS101',
        title: 'Introduction to Programming',
        credits: 3,
        subject: 'Computer Science',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 100,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 12,
        cri_score: 76,
        satisfies_requirements: ['foundations']
      }
    ],
    recommendedCourseId: 'CS101',
    targetCanonicalIds: ['foundations'],
    semesterPlacement: 'any',
    est: { costUsd: 99, weeks: 4, credits: 3, cri: 76, workloadHours: 12 },
    generatedFrom: 'manual'
  },
  {
    id: 'found-fastest',
    kind: 'module',
    moduleId: 'c4258b6d-0422-4b8e-9a44-e9d4a7d83167',
    label: 'Foundations: Fast-Track',
    summary: '$159 • 2w • 3cr • CRI 79',
    badge: 'Fastest',
    options: [
      {
        id: 'straighterline-cs101',
        courseId: 'CS101',
        title: 'Introduction to IT',
        credits: 3,
        subject: 'Computer Science',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 100,
        cost_usd: 159,
        duration_weeks: 2,
        workload_weekly_hours: 18,
        cri_score: 79,
        satisfies_requirements: ['foundations']
      }
    ],
    recommendedCourseId: 'CS101',
    targetCanonicalIds: ['foundations'],
    semesterPlacement: 'any',
    est: { costUsd: 159, weeks: 2, credits: 3, cri: 79, workloadHours: 18 },
    generatedFrom: 'manual'
  },
  {
    id: 'found-prestige',
    kind: 'module',
    moduleId: 'c4258b6d-0422-4b8e-9a44-e9d4a7d83167',
    label: 'Foundations: Premium Quality',
    summary: '$1200 • 8w • 3cr • CRI 91',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c949',
        courseId: 'C949',
        title: 'Data Structures and Algorithms I',
        credits: 3,
        subject: 'Computer Science',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 100,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 91,
        satisfies_requirements: ['foundations']
      }
    ],
    recommendedCourseId: 'C949',
    targetCanonicalIds: ['foundations'],
    semesterPlacement: 'fall',
    est: { costUsd: 1200, weeks: 8, credits: 3, cri: 91, workloadHours: 15 },
    generatedFrom: 'manual'
  },
  
  // Core I (Year 2) - 3 variants
  {
    id: 'core1-cheapest',
    kind: 'module',
    moduleId: '15b68444-6e24-43a4-acfc-0a4bf13a60b2',
    label: 'Core I: Budget-Optimized',
    summary: '$198 • 8w • 6cr • CRI 77',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-ds101',
        courseId: 'DS101',
        title: 'Data Structures',
        credits: 3,
        subject: 'Computer Science',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 200,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 12,
        cri_score: 75,
        satisfies_requirements: ['core-i']
      },
      {
        id: 'sophia-alg101',
        courseId: 'ALG101',
        title: 'Algorithms',
        credits: 3,
        subject: 'Computer Science',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 200,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 12,
        cri_score: 79,
        satisfies_requirements: ['core-i']
      }
    ],
    recommendedCourseId: 'DS101',
    targetCanonicalIds: ['core-i'],
    semesterPlacement: 'any',
    est: { costUsd: 198, weeks: 8, credits: 6, cri: 77, workloadHours: 24 },
    generatedFrom: 'manual'
  },
  {
    id: 'core1-fastest',
    kind: 'module',
    moduleId: '15b68444-6e24-43a4-acfc-0a4bf13a60b2',
    label: 'Core I: Fast-Track',
    summary: '$318 • 4w • 6cr • CRI 81',
    badge: 'Fastest',
    options: [
      {
        id: 'straighterline-ds201',
        courseId: 'DS201',
        title: 'Data Structures',
        credits: 3,
        subject: 'Computer Science',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 200,
        cost_usd: 159,
        duration_weeks: 2,
        workload_weekly_hours: 18,
        cri_score: 80,
        satisfies_requirements: ['core-i']
      },
      {
        id: 'straighterline-alg201',
        courseId: 'ALG201',
        title: 'Algorithms & Complexity',
        credits: 3,
        subject: 'Computer Science',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 200,
        cost_usd: 159,
        duration_weeks: 2,
        workload_weekly_hours: 18,
        cri_score: 82,
        satisfies_requirements: ['core-i']
      }
    ],
    recommendedCourseId: 'DS201',
    targetCanonicalIds: ['core-i'],
    semesterPlacement: 'any',
    est: { costUsd: 318, weeks: 4, credits: 6, cri: 81, workloadHours: 36 },
    generatedFrom: 'manual'
  },
  {
    id: 'core1-prestige',
    kind: 'module',
    moduleId: '15b68444-6e24-43a4-acfc-0a4bf13a60b2',
    label: 'Core I: Premium Quality',
    summary: '$2400 • 16w • 6cr • CRI 93',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c950',
        courseId: 'C950',
        title: 'Data Structures and Algorithms II',
        credits: 3,
        subject: 'Computer Science',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 200,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 92,
        satisfies_requirements: ['core-i']
      },
      {
        id: 'wgu-c951',
        courseId: 'C951',
        title: 'Introduction to Artificial Intelligence',
        credits: 3,
        subject: 'Computer Science',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 200,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 94,
        satisfies_requirements: ['core-i']
      }
    ],
    recommendedCourseId: 'C950',
    targetCanonicalIds: ['core-i'],
    semesterPlacement: 'fall',
    est: { costUsd: 2400, weeks: 16, credits: 6, cri: 93, workloadHours: 30 },
    generatedFrom: 'manual'
  },
  
  // Software Engineering Core (Year 3) - 3 variants
  {
    id: 'se-core-cheapest',
    kind: 'module',
    moduleId: 'y3-se-core',
    label: 'SE Core: Budget-Optimized',
    summary: '$198 • 8w • 6cr • CRI 78',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-softeng301',
        courseId: 'SE301',
        title: 'Software Engineering Principles',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 300,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 12,
        cri_score: 76,
        satisfies_requirements: ['core-ii']
      },
      {
        id: 'sophia-design301',
        courseId: 'SD301',
        title: 'Software Design Patterns',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 300,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 12,
        cri_score: 80,
        satisfies_requirements: ['core-ii']
      }
    ],
    recommendedCourseId: 'SE301',
    targetCanonicalIds: ['core-ii'],
    semesterPlacement: 'any',
    est: { costUsd: 198, weeks: 8, credits: 6, cri: 78, workloadHours: 24 },
    generatedFrom: 'manual'
  },
  {
    id: 'se-core-fastest',
    kind: 'module',
    moduleId: 'y3-se-core',
    label: 'SE Core: Fast-Track',
    summary: '$318 • 4w • 6cr • CRI 82',
    badge: 'Fastest',
    options: [
      {
        id: 'straighterline-se301',
        courseId: 'SE301',
        title: 'Software Engineering',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 300,
        cost_usd: 159,
        duration_weeks: 2,
        workload_weekly_hours: 18,
        cri_score: 81,
        satisfies_requirements: ['core-ii']
      },
      {
        id: 'straighterline-design301',
        courseId: 'SD301',
        title: 'Software Design & Architecture',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 300,
        cost_usd: 159,
        duration_weeks: 2,
        workload_weekly_hours: 18,
        cri_score: 83,
        satisfies_requirements: ['core-ii']
      }
    ],
    recommendedCourseId: 'SE301',
    targetCanonicalIds: ['core-ii'],
    semesterPlacement: 'any',
    est: { costUsd: 318, weeks: 4, credits: 6, cri: 82, workloadHours: 36 },
    generatedFrom: 'manual'
  },
  {
    id: 'se-core-prestige',
    kind: 'module',
    moduleId: 'y3-se-core',
    label: 'SE Core: Premium Quality',
    summary: '$2400 • 16w • 6cr • CRI 94',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c964',
        courseId: 'C964',
        title: 'Computer Science Capstone',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 300,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 93,
        satisfies_requirements: ['core-ii']
      },
      {
        id: 'wgu-c960',
        courseId: 'C960',
        title: 'Discrete Mathematics II',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 300,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 95,
        satisfies_requirements: ['core-ii']
      }
    ],
    recommendedCourseId: 'C964',
    targetCanonicalIds: ['core-ii'],
    semesterPlacement: 'fall',
    est: { costUsd: 2400, weeks: 16, credits: 6, cri: 94, workloadHours: 30 },
    generatedFrom: 'manual'
  },
  
  // Data Science Core (Year 3) - 3 variants
  {
    id: 'ds-core-cheapest',
    kind: 'module',
    moduleId: 'y3-ds-core',
    label: 'DS Core: Budget-Optimized',
    summary: '$198 • 8w • 6cr • CRI 79',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-stats301',
        courseId: 'STAT301',
        title: 'Applied Statistics',
        credits: 3,
        subject: 'Data Science',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 300,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 12,
        cri_score: 77,
        satisfies_requirements: ['core-ii']
      },
      {
        id: 'sophia-ml301',
        courseId: 'ML301',
        title: 'Machine Learning Fundamentals',
        credits: 3,
        subject: 'Data Science',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 300,
        cost_usd: 99,
        duration_weeks: 4,
        workload_weekly_hours: 12,
        cri_score: 81,
        satisfies_requirements: ['core-ii']
      }
    ],
    recommendedCourseId: 'STAT301',
    targetCanonicalIds: ['core-ii'],
    semesterPlacement: 'any',
    est: { costUsd: 198, weeks: 8, credits: 6, cri: 79, workloadHours: 24 },
    generatedFrom: 'manual'
  },
  {
    id: 'ds-core-fastest',
    kind: 'module',
    moduleId: 'y3-ds-core',
    label: 'DS Core: Fast-Track',
    summary: '$318 • 4w • 6cr • CRI 83',
    badge: 'Fastest',
    options: [
      {
        id: 'straighterline-stats301',
        courseId: 'STAT301',
        title: 'Statistics for Data Science',
        credits: 3,
        subject: 'Data Science',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 300,
        cost_usd: 159,
        duration_weeks: 2,
        workload_weekly_hours: 18,
        cri_score: 82,
        satisfies_requirements: ['core-ii']
      },
      {
        id: 'straighterline-ml301',
        courseId: 'ML301',
        title: 'Machine Learning',
        credits: 3,
        subject: 'Data Science',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 300,
        cost_usd: 159,
        duration_weeks: 2,
        workload_weekly_hours: 18,
        cri_score: 84,
        satisfies_requirements: ['core-ii']
      }
    ],
    recommendedCourseId: 'STAT301',
    targetCanonicalIds: ['core-ii'],
    semesterPlacement: 'any',
    est: { costUsd: 318, weeks: 4, credits: 6, cri: 83, workloadHours: 36 },
    generatedFrom: 'manual'
  },
  {
    id: 'ds-core-prestige',
    kind: 'module',
    moduleId: 'y3-ds-core',
    label: 'DS Core: Premium Quality',
    summary: '$2400 • 16w • 6cr • CRI 95',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c749',
        courseId: 'C749',
        title: 'Data Mining I',
        credits: 3,
        subject: 'Data Science',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 300,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 94,
        satisfies_requirements: ['core-ii']
      },
      {
        id: 'wgu-c750',
        courseId: 'C750',
        title: 'Data Mining II',
        credits: 3,
        subject: 'Data Science',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 300,
        cost_usd: 1200,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 96,
        satisfies_requirements: ['core-ii']
      }
    ],
    recommendedCourseId: 'C749',
    targetCanonicalIds: ['core-ii'],
    semesterPlacement: 'fall',
    est: { costUsd: 2400, weeks: 16, credits: 6, cri: 95, workloadHours: 30 },
    generatedFrom: 'manual'
  },
  
  // Software Engineering Capstone (Year 4) - 3 variants
  {
    id: 'se-cap-cheapest',
    kind: 'module',
    moduleId: 'y4-se-cap',
    label: 'SE Capstone: Budget-Optimized',
    summary: '$99 • 6w • 3cr • CRI 80',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-capstone',
        courseId: 'CAP401',
        title: 'Software Engineering Capstone',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 400,
        cost_usd: 99,
        duration_weeks: 6,
        workload_weekly_hours: 15,
        cri_score: 80,
        satisfies_requirements: ['capstone']
      }
    ],
    recommendedCourseId: 'CAP401',
    targetCanonicalIds: ['capstone'],
    semesterPlacement: 'any',
    est: { costUsd: 99, weeks: 6, credits: 3, cri: 80, workloadHours: 15 },
    generatedFrom: 'manual'
  },
  {
    id: 'se-cap-fastest',
    kind: 'module',
    moduleId: 'y4-se-cap',
    label: 'SE Capstone: Fast-Track',
    summary: '$159 • 4w • 3cr • CRI 84',
    badge: 'Fastest',
    options: [
      {
        id: 'straighterline-capstone',
        courseId: 'CAP401',
        title: 'Software Engineering Capstone Project',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 400,
        cost_usd: 159,
        duration_weeks: 4,
        workload_weekly_hours: 20,
        cri_score: 84,
        satisfies_requirements: ['capstone']
      }
    ],
    recommendedCourseId: 'CAP401',
    targetCanonicalIds: ['capstone'],
    semesterPlacement: 'any',
    est: { costUsd: 159, weeks: 4, credits: 3, cri: 84, workloadHours: 20 },
    generatedFrom: 'manual'
  },
  {
    id: 'se-cap-prestige',
    kind: 'module',
    moduleId: 'y4-se-cap',
    label: 'SE Capstone: Premium Quality',
    summary: '$1200 • 12w • 3cr • CRI 96',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c964-cap',
        courseId: 'C964',
        title: 'Computer Science Capstone',
        credits: 3,
        subject: 'Software Engineering',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 400,
        cost_usd: 1200,
        duration_weeks: 12,
        workload_weekly_hours: 18,
        cri_score: 96,
        satisfies_requirements: ['capstone']
      }
    ],
    recommendedCourseId: 'C964',
    targetCanonicalIds: ['capstone'],
    semesterPlacement: 'fall',
    est: { costUsd: 1200, weeks: 12, credits: 3, cri: 96, workloadHours: 18 },
    generatedFrom: 'manual'
  },
  
  // Data Science Capstone (Year 4) - 3 variants
  {
    id: 'ds-cap-cheapest',
    kind: 'module',
    moduleId: 'y4-ds-cap',
    label: 'DS Capstone: Budget-Optimized',
    summary: '$99 • 6w • 3cr • CRI 81',
    badge: 'Cheapest',
    options: [
      {
        id: 'sophia-ds-capstone',
        courseId: 'DSCAP401',
        title: 'Data Science Capstone',
        credits: 3,
        subject: 'Data Science',
        provider: 'Sophia Learning',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        level: 400,
        cost_usd: 99,
        duration_weeks: 6,
        workload_weekly_hours: 15,
        cri_score: 81,
        satisfies_requirements: ['capstone']
      }
    ],
    recommendedCourseId: 'DSCAP401',
    targetCanonicalIds: ['capstone'],
    semesterPlacement: 'any',
    est: { costUsd: 99, weeks: 6, credits: 3, cri: 81, workloadHours: 15 },
    generatedFrom: 'manual'
  },
  {
    id: 'ds-cap-fastest',
    kind: 'module',
    moduleId: 'y4-ds-cap',
    label: 'DS Capstone: Fast-Track',
    summary: '$159 • 4w • 3cr • CRI 85',
    badge: 'Fastest',
    options: [
      {
        id: 'straighterline-ds-capstone',
        courseId: 'DSCAP401',
        title: 'Data Science Capstone Project',
        credits: 3,
        subject: 'Data Science',
        provider: 'StraighterLine',
        providerType: 'mooc',
        providerCode: 'STRAIGHTERLINE',
        level: 400,
        cost_usd: 159,
        duration_weeks: 4,
        workload_weekly_hours: 20,
        cri_score: 85,
        satisfies_requirements: ['capstone']
      }
    ],
    recommendedCourseId: 'DSCAP401',
    targetCanonicalIds: ['capstone'],
    semesterPlacement: 'any',
    est: { costUsd: 159, weeks: 4, credits: 3, cri: 85, workloadHours: 20 },
    generatedFrom: 'manual'
  },
  {
    id: 'ds-cap-prestige',
    kind: 'module',
    moduleId: 'y4-ds-cap',
    label: 'DS Capstone: Premium Quality',
    summary: '$1200 • 12w • 3cr • CRI 97',
    badge: 'Prestige',
    options: [
      {
        id: 'wgu-c769',
        courseId: 'C769',
        title: 'IT Capstone Written Project',
        credits: 3,
        subject: 'Data Science',
        provider: 'Western Governors University',
        providerType: 'university',
        providerCode: 'WGU',
        level: 400,
        cost_usd: 1200,
        duration_weeks: 12,
        workload_weekly_hours: 18,
        cri_score: 97,
        satisfies_requirements: ['capstone']
      }
    ],
    recommendedCourseId: 'C769',
    targetCanonicalIds: ['capstone'],
    semesterPlacement: 'fall',
    est: { costUsd: 1200, weeks: 12, credits: 3, cri: 97, workloadHours: 18 },
    generatedFrom: 'manual'
  }
];

/**
 * Get templates for specific module
 * Resolves alias slugs (e.g., 'y1-found') to actual database UUIDs
 */
export function getTemplatesForModule(moduleId: string): ModuleTemplate[] {
  console.log('[Templates] 🔍 getTemplatesForModule called with:', moduleId);
  
  const resolved = MODULE_ALIAS[moduleId] ?? moduleId;
  console.log('[Templates] 🎯 Alias resolved to:', resolved);
  console.log('[Templates] 📋 Available template moduleIds:', [...new Set(MODULE_TEMPLATES.map(t => t.moduleId))]);
  
  const filtered = MODULE_TEMPLATES.filter(t => t.moduleId === resolved);
  console.log('[Templates] ✅ Filtered templates count:', filtered.length);
  
  if (filtered.length > 0) {
    console.log('[Templates] 📦 Template IDs:', filtered.map(t => t.id));
  }
  
  return filtered;
}

/**
 * Get all templates
 */
export function getAllModuleTemplates(): ModuleTemplate[] {
  return MODULE_TEMPLATES;
}
