// Enhanced mock data for Phase 1 - Corrected types and semantics

import { LifePathGraph } from '@/hooks/useLifePathGraph';
import { GraphNode, GraphEdge } from '@/types/lifePathGraph';

export function generateEnhancedMockGraph(): LifePathGraph {
  const nodes: GraphNode[] = [
    // Skills (foundational)
    {
      id: 'skill-math-fundamentals',
      type: 'skill',
      title: 'Mathematics Fundamentals',
      description: 'Basic algebra and precalculus concepts',
      estimatedHours: 80,
      cost: 0,
      difficulty: 2,
      modality: 'self-paced',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['mathematics', 'foundational'],
      prerequisiteIds: [],
      skillOutcomes: ['algebra', 'functions', 'trigonometry'],
      attributes: { depth: 0 },
      metadata: {}
    },
    {
      id: 'skill-programming-basics',
      type: 'skill',
      title: 'Programming Fundamentals',
      description: 'Basic programming concepts and computational thinking',
      estimatedHours: 60,
      cost: 0,
      difficulty: 2,
      modality: 'self-paced',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['programming', 'foundational'],
      prerequisiteIds: [],
      skillOutcomes: ['variables', 'loops', 'functions', 'debugging'],
      attributes: { depth: 0 },
      metadata: {}
    },

    // Community College Courses
    {
      id: 'course-cc-algebra',
      type: 'course',
      title: 'College Algebra',
      description: 'MAC 1105 - Algebraic functions, equations, and graphing',
      estimatedHours: 150,
      cost: 1200,
      credits: 3,
      difficulty: 2,
      institution: 'Florida Community College',
      institutionId: 'fcc',
      modality: 'hybrid',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['mathematics', 'general-education'],
      prerequisiteIds: ['skill-math-fundamentals'],
      skillOutcomes: ['algebra', 'functions', 'graphing'],
      attributes: { depth: 1 },
      metadata: { commonCourseNumber: 'MAC1105', transferable: true }
    },
    {
      id: 'course-cc-intro-cs',
      type: 'course',
      title: 'Introduction to Computer Science',
      description: 'COP 1000 - Programming fundamentals and problem solving',
      estimatedHours: 180,
      cost: 1200,
      credits: 3,
      difficulty: 3,
      institution: 'Florida Community College',
      institutionId: 'fcc',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['computer-science', 'programming'],
      prerequisiteIds: ['skill-programming-basics'],
      skillOutcomes: ['programming', 'problem-solving', 'algorithms-intro'],
      attributes: { depth: 1 },
      metadata: { commonCourseNumber: 'COP1000', transferable: true }
    },

    // CLEP Alternative
    {
      id: 'exam-clep-algebra',
      type: 'exam',
      title: 'CLEP College Mathematics',
      description: 'Credit by examination covering college algebra and basic statistics',
      estimatedHours: 40,
      cost: 93,
      credits: 6,
      difficulty: 3,
      provider: 'College Board',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['clep', 'mathematics', 'alternative'],
      prerequisiteIds: ['skill-math-fundamentals'],
      skillOutcomes: ['algebra', 'statistics', 'problem-solving'],
      attributes: { depth: 1 },
      metadata: { examCode: 'CLEP-MATH', examType: 'CLEP' }
    },

    // University Courses
    {
      id: 'course-univ-calculus',
      type: 'course',
      title: 'Calculus I',
      description: 'MAC 2311 - Limits, derivatives, and applications',
      estimatedHours: 180,
      cost: 1800,
      credits: 4,
      difficulty: 4,
      institution: 'Florida State University',
      institutionId: 'fsu',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['calculus', 'mathematics', 'university'],
      prerequisiteIds: ['course-cc-algebra'],
      skillOutcomes: ['calculus', 'derivatives', 'limits', 'applications'],
      attributes: { depth: 2 },
      metadata: { commonCourseNumber: 'MAC2311' }
    },
    {
      id: 'course-univ-data-structures',
      type: 'course',
      title: 'Data Structures & Algorithms',
      description: 'COP 3530 - Advanced data structures and algorithm design',
      estimatedHours: 220,
      cost: 1800,
      credits: 4,
      difficulty: 5,
      institution: 'Florida State University',
      institutionId: 'fsu',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['algorithms', 'data-structures', 'computer-science'],
      prerequisiteIds: ['course-cc-intro-cs', 'course-univ-calculus'],
      skillOutcomes: ['algorithms', 'data-structures', 'complexity-analysis', 'optimization'],
      attributes: { depth: 3 },
      metadata: { commonCourseNumber: 'COP3530' }
    },

    // General Education Credit Block
    {
      id: 'creditblock-gen-ed',
      type: 'creditBlock',
      title: 'General Education Requirements',
      description: 'Core curriculum requirements (36 credits)',
      estimatedHours: 1080,
      cost: 12000,
      credits: 36,
      difficulty: 2,
      modality: 'hybrid',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['general-education', 'requirements'],
      prerequisiteIds: [],
      skillOutcomes: ['critical-thinking', 'communication', 'quantitative-reasoning'],
      attributes: { depth: 1 },
      metadata: { rule: 'GE', categories: ['humanities', 'social-sciences', 'natural-sciences'] }
    },

    // Credentials (Fixed from job type)
    {
      id: 'credential-bachelor-cs',
      type: 'credential',
      level: 'bachelor',
      title: "Bachelor's in Computer Science",
      description: 'Bachelor of Science in Computer Science (120 credits)',
      estimatedHours: 4800,
      cost: 60000,
      credits: 120,
      difficulty: 4,
      institution: 'Florida State University',
      institutionId: 'fsu',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['degree', 'computer-science', 'bachelor'],
      prerequisiteIds: ['course-univ-data-structures', 'creditblock-gen-ed'],
      skillOutcomes: ['cs-degree', 'software-engineering', 'systems-design'],
      policy: {
        residencyCredits: 30,
        maxTransferCredits: 60,
        examCap: 30
      },
      attributes: { depth: 4 },
      metadata: { degreeType: 'Bachelor of Science', totalCredits: 120 }
    },
    {
      id: 'credential-associate-nursing',
      type: 'credential',
      level: 'associate',
      title: 'Associate Degree in Nursing',
      description: 'Associate of Science in Nursing (64 credits)',
      estimatedHours: 2560,
      cost: 25000,
      credits: 64,
      difficulty: 5,
      institution: 'Florida Community College',
      institutionId: 'fcc',
      modality: 'hybrid',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['nursing', 'healthcare', 'associate'],
      prerequisiteIds: ['skill-math-fundamentals'],
      skillOutcomes: ['nursing', 'patient-care', 'medical-knowledge'],
      policy: {
        residencyCredits: 32,
        maxTransferCredits: 32
      },
      attributes: { depth: 2 },
      metadata: { degreeType: 'Associate of Science', clinicalHours: 800 }
    },

    // Jobs (separate from credentials)
    {
      id: 'job-software-engineer',
      type: 'job',
      title: 'Software Engineer',
      description: 'Design and develop software applications',
      estimatedHours: 0,
      cost: 0,
      difficulty: 4,
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['software', 'engineering', 'technology'],
      prerequisiteIds: ['credential-bachelor-cs'],
      skillOutcomes: ['software-development', 'system-architecture'],
      attributes: { depth: 5 },
      metadata: { socCode: '15-1252', medianSalary: 110000 }
    },
    {
      id: 'job-registered-nurse',
      type: 'job',
      title: 'Registered Nurse',
      description: 'Provide and coordinate patient care',
      estimatedHours: 0,
      cost: 0,
      difficulty: 4,
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['nursing', 'healthcare', 'patient-care'],
      prerequisiteIds: ['credential-associate-nursing'],
      skillOutcomes: ['patient-care', 'medical-procedures', 'healthcare-systems'],
      attributes: { depth: 3 },
      metadata: { socCode: '29-1141', medianSalary: 77600 }
    }
  ];

  const edges: GraphEdge[] = [
    // Skill to course enablement
    {
      id: 'skill-math-enables-algebra',
      sourceId: 'skill-math-fundamentals',
      targetId: 'course-cc-algebra',
      type: 'enables',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.2 },
      confidence: 0.9,
      source: 'curriculum_analysis',
      validated: true,
      metadata: {}
    },
    {
      id: 'skill-prog-enables-cs',
      sourceId: 'skill-programming-basics',
      targetId: 'course-cc-intro-cs',
      type: 'enables',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.3 },
      confidence: 0.9,
      source: 'curriculum_analysis',
      validated: true,
      metadata: {}
    },

    // Prerequisites within institution
    {
      id: 'algebra-requires-for-calculus',
      sourceId: 'course-cc-algebra',
      targetId: 'course-univ-calculus',
      type: 'requires',
      weights: { time: 1, cost: 1800, creditLoss: 0, difficulty: 1.3, roi: 1.1 },
      confidence: 1.0,
      source: 'institutional_policy',
      validated: true,
      metadata: {}
    },
    {
      id: 'cs-and-calc-require-ds',
      sourceId: 'course-cc-intro-cs',
      targetId: 'course-univ-data-structures',
      type: 'requires',
      weights: { time: 1, cost: 1800, creditLoss: 0, difficulty: 1.4, roi: 1.2 },
      confidence: 1.0,
      source: 'institutional_policy',
      validated: true,
      metadata: {}
    },
    {
      id: 'calculus-requires-for-ds',
      sourceId: 'course-univ-calculus',
      targetId: 'course-univ-data-structures',
      type: 'requires',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0.2, roi: 1.0 },
      confidence: 1.0,
      source: 'institutional_policy',
      validated: true,
      metadata: {}
    },

    // Credit transfer between institutions
    {
      id: 'cc-algebra-transfers-to-calc-prereq',
      sourceId: 'course-cc-algebra',
      targetId: 'course-univ-calculus',
      type: 'creditTransfersTo',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.0 },
      creditTransferRate: 1.0,
      policy: {
        region: 'US-FL',
        institutionFrom: 'fcc',
        institutionTo: 'fsu',
        cap: 60,
        capCategory: 'total'
      },
      confidence: 0.95,
      source: 'florida_articulation',
      validated: true,
      metadata: { articulationAgreement: 'florida-state-system' }
    },

    // CLEP equivalency
    {
      id: 'clep-equivalent-to-algebra',
      sourceId: 'exam-clep-algebra',
      targetId: 'course-cc-algebra',
      type: 'equivalentTo',
      weights: { time: -110, cost: -1107, creditLoss: 0, difficulty: 0.5, roi: 2.0 },
      creditTransferRate: 1.0,
      policy: {
        capCategory: 'exam'
      },
      confidence: 0.8,
      source: 'ace_recommendation',
      validated: true,
      metadata: { aceId: 'CLEP-MATH-001', examType: 'CLEP' }
    },

    // Stacking into credit blocks and credentials
    {
      id: 'algebra-stacks-into-gen-ed',
      sourceId: 'course-cc-algebra',
      targetId: 'creditblock-gen-ed',
      type: 'stacksInto',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.0 },
      confidence: 1.0,
      source: 'curriculum_analysis',
      validated: true,
      metadata: {}
    },
    {
      id: 'gen-ed-stacks-into-bachelor',
      sourceId: 'creditblock-gen-ed',
      targetId: 'credential-bachelor-cs',
      type: 'stacksInto',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.0 },
      confidence: 1.0,
      source: 'degree_requirements',
      validated: true,
      metadata: {}
    },
    {
      id: 'data-structures-stacks-into-bachelor',
      sourceId: 'course-univ-data-structures',
      targetId: 'credential-bachelor-cs',
      type: 'stacksInto',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.0 },
      confidence: 1.0,
      source: 'degree_requirements',
      validated: true,
      metadata: {}
    },

    // BuildsSkill edges from courses to skills
    {
      id: 'algebra-builds-math-skills',
      sourceId: 'course-cc-algebra',
      targetId: 'skill-math-fundamentals',
      type: 'buildsSkill',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.1 },
      confidence: 0.9,
      source: 'curriculum_analysis',
      validated: true,
      metadata: {}
    },
    {
      id: 'intro-cs-builds-programming',
      sourceId: 'course-cc-intro-cs',
      targetId: 'skill-programming-basics',
      type: 'buildsSkill',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 1.2 },
      confidence: 0.9,
      source: 'curriculum_analysis',
      validated: true,
      metadata: {}
    },

    // Credential to job qualification
    {
      id: 'bachelor-qualifies-for-swe',
      sourceId: 'credential-bachelor-cs',
      targetId: 'job-software-engineer',
      type: 'qualifiesFor',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 3.0 },
      confidence: 0.9,
      source: 'labor_market_analysis',
      validated: true,
      metadata: {}
    },
    {
      id: 'nursing-qualifies-for-rn',
      sourceId: 'credential-associate-nursing',
      targetId: 'job-registered-nurse',
      type: 'qualifiesFor',
      weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 2.5 },
      confidence: 0.95,
      source: 'licensing_requirements',
      validated: true,
      metadata: {}
    }
  ];

  return { nodes, edges };
}