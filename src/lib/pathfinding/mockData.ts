import { LifePathGraph } from '@/hooks/useLifePathGraph';
import { GraphNode, GraphEdge } from '@/types/lifePathGraph';

// Generate mock graph for Phase 0 testing - Community College to University transfer scenario
export function generateMockGraph(): LifePathGraph {
  const nodes: GraphNode[] = [
    // Skills (foundational)
    {
      id: 'skill-math-fundamentals',
      type: 'skill',
      title: 'Mathematics Fundamentals',
      description: 'Basic algebra and calculus concepts',
      estimatedHours: 120,
      cost: 0,
      difficulty: 2,
      modality: 'self-paced',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['mathematics', 'foundational'],
      prerequisiteIds: [],
      skillOutcomes: ['algebra', 'basic-calculus'],
      metadata: {}
    },
    {
      id: 'skill-programming-basics',
      type: 'skill',
      title: 'Programming Fundamentals',
      description: 'Basic programming concepts and logic',
      estimatedHours: 80,
      cost: 0,
      difficulty: 3,
      modality: 'self-paced',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['programming', 'foundational'],
      prerequisiteIds: [],
      skillOutcomes: ['variables', 'loops', 'functions'],
      metadata: {}
    },

    // Community College Courses
    {
      id: 'course-cc-math101',
      type: 'course',
      title: 'College Algebra',
      description: 'MAT 1105 - College level algebra course',
      estimatedHours: 150,
      cost: 1200,
      credits: 3,
      difficulty: 2,
      institution: 'Florida Community College',
      modality: 'hybrid',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['mathematics', 'transfer'],
      prerequisiteIds: ['skill-math-fundamentals'],
      skillOutcomes: ['algebra', 'functions'],
      articulationAgreements: ['florida-state-articulation'],
      metadata: { commonCourseNumber: 'MAC1105' }
    },
    {
      id: 'course-cc-cs101',
      type: 'course',
      title: 'Introduction to Computer Science',
      description: 'COP 1000 - Fundamental programming concepts',
      estimatedHours: 180,
      cost: 1200,
      credits: 3,
      difficulty: 3,
      institution: 'Florida Community College',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['computer-science', 'programming', 'transfer'],
      prerequisiteIds: ['skill-programming-basics'],
      skillOutcomes: ['programming', 'problem-solving'],
      articulationAgreements: ['florida-state-articulation'],
      metadata: { commonCourseNumber: 'COP1000' }
    },
    {
      id: 'course-cc-java',
      type: 'course',
      title: 'Java Programming',
      description: 'COP 2220 - Object-oriented programming in Java',
      estimatedHours: 200,
      cost: 1200,
      credits: 4,
      difficulty: 4,
      institution: 'Florida Community College',
      modality: 'hybrid',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['java', 'programming', 'transfer'],
      prerequisiteIds: ['course-cc-cs101'],
      skillOutcomes: ['java', 'oop', 'data-structures'],
      articulationAgreements: ['florida-state-articulation'],
      metadata: { commonCourseNumber: 'COP2220' }
    },

    // University Courses
    {
      id: 'course-univ-math201',
      type: 'course',
      title: 'Calculus I',
      description: 'MAC 2311 - Differential calculus',
      estimatedHours: 180,
      cost: 2400,
      credits: 4,
      difficulty: 4,
      institution: 'Florida State University',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['calculus', 'mathematics', 'university'],
      prerequisiteIds: ['course-cc-math101'],
      skillOutcomes: ['calculus', 'derivatives', 'limits'],
      metadata: { commonCourseNumber: 'MAC2311' }
    },
    {
      id: 'course-univ-cs301',
      type: 'course',
      title: 'Data Structures & Algorithms',
      description: 'COP 3530 - Advanced programming concepts',
      estimatedHours: 220,
      cost: 2400,
      credits: 4,
      difficulty: 5,
      institution: 'Florida State University',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['algorithms', 'data-structures', 'university'],
      prerequisiteIds: ['course-cc-java'],
      skillOutcomes: ['algorithms', 'data-structures', 'complexity-analysis'],
      metadata: { commonCourseNumber: 'COP3530' }
    },

    // Alternative paths - CLEP exams
    {
      id: 'exam-clep-math',
      type: 'exam',
      title: 'CLEP College Mathematics',
      description: 'Credit by examination for college mathematics',
      estimatedHours: 40,
      cost: 120,
      credits: 6,
      difficulty: 3,
      provider: 'College Board',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['clep', 'mathematics', 'alternative'],
      prerequisiteIds: ['skill-math-fundamentals'],
      skillOutcomes: ['algebra', 'statistics', 'geometry'],
      aceRecommended: true,
      metadata: { examCode: 'CLEP-MATH' }
    },

    // Certifications
    {
      id: 'cert-oracle-java',
      type: 'certification',
      title: 'Oracle Certified Associate Java',
      description: 'Industry certification for Java programming',
      estimatedHours: 100,
      cost: 300,
      difficulty: 4,
      provider: 'Oracle',
      modality: 'online',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['java', 'certification', 'oracle'],
      prerequisiteIds: ['course-cc-java'],
      skillOutcomes: ['java-advanced', 'certification'],
      metadata: { certificationBody: 'Oracle', validityYears: 3 }
    },

    // Projects
    {
      id: 'project-web-portfolio',
      type: 'project',
      title: 'Personal Web Portfolio',
      description: 'Build a professional portfolio website',
      estimatedHours: 60,
      cost: 50,
      difficulty: 3,
      modality: 'self-paced',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['project', 'web-development', 'portfolio'],
      prerequisiteIds: ['course-cc-cs101'],
      skillOutcomes: ['web-development', 'portfolio', 'github'],
      metadata: { deliverables: ['website', 'github-repo', 'deployment'] }
    },

    // Goal Jobs
    {
      id: 'bachelor-cs',
      type: 'job',
      title: "Bachelor's in Computer Science",
      description: 'Complete bachelor degree in computer science',
      estimatedHours: 3200,
      cost: 40000,
      credits: 120,
      difficulty: 4,
      institution: 'Florida State University',
      modality: 'in-person',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['degree', 'computer-science', 'bachelor'],
      prerequisiteIds: ['course-univ-cs301', 'course-univ-math201'],
      skillOutcomes: ['cs-degree', 'advanced-programming', 'software-engineering'],
      metadata: { degreeType: 'Bachelor of Science', totalCredits: 120 }
    },
    {
      id: 'associate-nursing',
      type: 'job',
      title: 'Associate Degree in Nursing',
      description: 'Two-year nursing program leading to RN licensure',
      estimatedHours: 2000,
      cost: 25000,
      credits: 64,
      difficulty: 5,
      institution: 'Florida Community College',
      modality: 'hybrid',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['nursing', 'healthcare', 'associate'],
      prerequisiteIds: ['skill-math-fundamentals'],
      skillOutcomes: ['nursing', 'patient-care', 'medical-knowledge'],
      metadata: { degreeType: 'Associate of Science', clinicalHours: 800 }
    },
    {
      id: 'certification-aws',
      type: 'certification',
      title: 'AWS Solutions Architect',
      description: 'Cloud architecture certification from Amazon',
      estimatedHours: 150,
      cost: 300,
      difficulty: 4,
      provider: 'Amazon Web Services',
      modality: 'online',
      active: true,
      validated: true,
      lastUpdated: new Date().toISOString(),
      tags: ['aws', 'cloud', 'architecture'],
      prerequisiteIds: ['course-cc-cs101'],
      skillOutcomes: ['cloud-architecture', 'aws', 'scalability'],
      metadata: { certificationBody: 'AWS', validityYears: 3 }
    }
  ];

  const edges: GraphEdge[] = [
    // Skill to course connections
    {
      id: 'edge-math-skill-to-cc-math',
      sourceId: 'skill-math-fundamentals',
      targetId: 'course-cc-math101',
      type: 'enables',
      weights: { time: 1.0, cost: 1200, creditLoss: 0, difficulty: 1.0, roi: 1.2 },
      confidence: 0.9,
      source: 'curriculum_analysis',
      validated: true,
      metadata: {}
    },
    {
      id: 'edge-prog-skill-to-cc-cs',
      sourceId: 'skill-programming-basics',
      targetId: 'course-cc-cs101',
      type: 'enables',
      weights: { time: 1.0, cost: 1200, creditLoss: 0, difficulty: 1.0, roi: 1.3 },
      confidence: 0.9,
      source: 'curriculum_analysis',
      validated: true,
      metadata: {}
    },

    // Course prerequisites
    {
      id: 'edge-cc-cs-to-java',
      sourceId: 'course-cc-cs101',
      targetId: 'course-cc-java',
      type: 'requires',
      weights: { time: 1.0, cost: 1200, creditLoss: 0, difficulty: 1.2, roi: 1.1 },
      confidence: 1.0,
      source: 'institutional_policy',
      validated: true,
      metadata: {}
    },

    // Transfer credit connections
    {
      id: 'edge-cc-math-to-univ-calc',
      sourceId: 'course-cc-math101',
      targetId: 'course-univ-math201',
      type: 'creditTransfersTo',
      weights: { time: 0.8, cost: 2400, creditLoss: 0, difficulty: 1.3, roi: 1.1 },
      creditTransferRate: 1.0,
      confidence: 0.95,
      source: 'florida_articulation',
      validated: true,
      metadata: { articulationAgreement: 'florida-state-system' }
    },
    {
      id: 'edge-java-to-univ-ds',
      sourceId: 'course-cc-java',
      targetId: 'course-univ-cs301',
      type: 'creditTransfersTo',
      weights: { time: 0.9, cost: 2400, creditLoss: 0, difficulty: 1.4, roi: 1.2 },
      creditTransferRate: 1.0,
      confidence: 0.9,
      source: 'florida_articulation',
      validated: true,
      metadata: { articulationAgreement: 'florida-state-system' }
    },

    // Alternative paths - CLEP substitutions
    {
      id: 'edge-clep-math-substitute',
      sourceId: 'exam-clep-math',
      targetId: 'course-cc-math101',
      type: 'substitutes',
      weights: { time: 0.3, cost: 120, creditLoss: 0, difficulty: 1.5, roi: 2.0 },
      creditTransferRate: 1.0,
      confidence: 0.8,
      source: 'ace_recommendation',
      validated: true,
      metadata: { aceId: 'CLEP-MATH-001' }
    },
    {
      id: 'edge-clep-to-univ-direct',
      sourceId: 'exam-clep-math',
      targetId: 'course-univ-math201',
      type: 'ghost',
      weights: { time: 0.5, cost: 120, creditLoss: 3, difficulty: 2.0, roi: 1.8 },
      creditTransferRate: 0.5,
      confidence: 0.6,
      source: 'institutional_policy',
      validated: false,
      metadata: { reason: 'may_require_additional_prerequisites' }
    },

    // Certification paths
    {
      id: 'edge-java-to-cert',
      sourceId: 'course-cc-java',
      targetId: 'cert-oracle-java',
      type: 'enables',
      weights: { time: 1.0, cost: 300, creditLoss: 0, difficulty: 1.1, roi: 1.4 },
      confidence: 0.8,
      source: 'certification_body',
      validated: true,
      metadata: {}
    },

    // Project connections
    {
      id: 'edge-cs-to-project',
      sourceId: 'course-cc-cs101',
      targetId: 'project-web-portfolio',
      type: 'enables',
      weights: { time: 1.0, cost: 50, creditLoss: 0, difficulty: 0.9, roi: 1.3 },
      confidence: 0.7,
      source: 'curriculum_recommendation',
      validated: true,
      metadata: {}
    },

    // Final degree requirements
    {
      id: 'edge-univ-courses-to-bachelor',
      sourceId: 'course-univ-cs301',
      targetId: 'bachelor-cs',
      type: 'requires',
      weights: { time: 1.0, cost: 35000, creditLoss: 0, difficulty: 1.0, roi: 1.5 },
      confidence: 1.0,
      source: 'degree_requirements',
      validated: true,
      metadata: { additionalCoursesRequired: 25 }
    },
    {
      id: 'edge-math-to-bachelor',
      sourceId: 'course-univ-math201',
      targetId: 'bachelor-cs',
      type: 'requires',
      weights: { time: 1.0, cost: 0, creditLoss: 0, difficulty: 1.0, roi: 1.0 },
      confidence: 1.0,
      source: 'degree_requirements',
      validated: true,
      metadata: {}
    },

    // AWS certification alternative path
    {
      id: 'edge-cs-to-aws',
      sourceId: 'course-cc-cs101',
      targetId: 'certification-aws',
      type: 'enables',
      weights: { time: 1.0, cost: 300, creditLoss: 0, difficulty: 1.3, roi: 1.6 },
      confidence: 0.7,
      source: 'industry_analysis',
      validated: true,
      metadata: {}
    }
  ];

  return { nodes, edges };
}