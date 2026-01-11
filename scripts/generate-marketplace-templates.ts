/**
 * Marketplace Template Generator
 * Generates degree path templates for all institutions × programs × variants
 * Run with: npx tsx scripts/generate-marketplace-templates.ts
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const INSTITUTIONS = [
  { code: 'TESU', name: 'Thomas Edison State University', tier: 'primary' },
  { code: 'WGU', name: 'Western Governors University', tier: 'primary' },
  { code: 'EXCEL', name: 'Excelsior University', tier: 'primary' },
  { code: 'UMGC', name: 'University of Maryland Global Campus', tier: 'primary' },
  { code: 'SNHU', name: 'Southern New Hampshire University', tier: 'secondary' },
  { code: 'PURDUEG', name: 'Purdue Global', tier: 'secondary' },
  { code: 'COSC', name: 'Charter Oak State College', tier: 'secondary' },
  { code: 'EMPIRE', name: 'SUNY Empire State College', tier: 'secondary' },
  { code: 'ASUO', name: 'Arizona State University Online', tier: 'secondary' },
  { code: 'PHOENIX', name: 'University of Phoenix', tier: 'tertiary' },
  { code: 'WALDEN', name: 'Walden University', tier: 'tertiary' },
  { code: 'CAPELLA', name: 'Capella University', tier: 'tertiary' },
  { code: 'LIBERTY', name: 'Liberty University Online', tier: 'tertiary' },
  { code: 'STRAYER', name: 'Strayer University', tier: 'tertiary' },
  { code: 'GCU', name: 'Grand Canyon University', tier: 'tertiary' },
  { code: 'CSUG', name: 'Colorado State University Global', tier: 'secondary' },
  { code: 'UWFO', name: 'University of Wisconsin Flexible Option', tier: 'secondary' },
  { code: 'PSUWC', name: 'Penn State World Campus', tier: 'secondary' },
  { code: 'FRANKLIN', name: 'Franklin University', tier: 'tertiary' },
  { code: 'NU', name: 'National University', tier: 'tertiary' },
  { code: 'WCU', name: 'Western Carolina University', tier: 'tertiary' },
  { code: 'UPEOPLE', name: 'University of the People', tier: 'tertiary' },
] as const;

const PROGRAMS = [
  // Tech/CS
  { id: 'cs-bachelor', title: 'Computer Science', category: 'tech', careers: ['software-engineer', 'web-developer', 'full-stack-developer'] },
  { id: 'it-bachelor', title: 'Information Technology', category: 'tech', careers: ['it-manager', 'systems-admin', 'network-engineer'] },
  { id: 'cybersecurity-bachelor', title: 'Cybersecurity', category: 'tech', careers: ['security-analyst', 'penetration-tester', 'security-engineer'] },
  { id: 'data-science-bachelor', title: 'Data Science', category: 'tech', careers: ['data-scientist', 'data-analyst', 'ml-engineer'] },
  { id: 'software-dev-bachelor', title: 'Software Development', category: 'tech', careers: ['software-engineer', 'backend-developer', 'devops-engineer'] },
  
  // Business
  { id: 'business-admin-bachelor', title: 'Business Administration', category: 'business', careers: ['business-analyst', 'operations-manager', 'consultant'] },
  { id: 'accounting-bachelor', title: 'Accounting', category: 'business', careers: ['accountant', 'auditor', 'cpa'] },
  { id: 'marketing-bachelor', title: 'Marketing', category: 'business', careers: ['marketing-manager', 'brand-manager', 'digital-marketer'] },
  { id: 'finance-bachelor', title: 'Finance', category: 'business', careers: ['financial-analyst', 'investment-banker', 'portfolio-manager'] },
  { id: 'hr-management-bachelor', title: 'Human Resource Management', category: 'business', careers: ['hr-manager', 'recruiter', 'training-specialist'] },
  
  // Healthcare
  { id: 'nursing-rn-bsn', title: 'Nursing (RN-to-BSN)', category: 'healthcare', careers: ['registered-nurse', 'nurse-manager', 'clinical-nurse'] },
  { id: 'health-admin-bachelor', title: 'Healthcare Administration', category: 'healthcare', careers: ['health-admin', 'practice-manager', 'health-services-mgr'] },
  { id: 'public-health-bachelor', title: 'Public Health', category: 'healthcare', careers: ['public-health-specialist', 'epidemiologist', 'health-educator'] },
  { id: 'health-info-bachelor', title: 'Health Information Management', category: 'healthcare', careers: ['him-director', 'medical-coder', 'health-data-analyst'] },
  
  // Liberal Arts
  { id: 'psychology-bachelor', title: 'Psychology', category: 'liberal-arts', careers: ['counselor', 'hr-specialist', 'social-worker'] },
  { id: 'communications-bachelor', title: 'Communications', category: 'liberal-arts', careers: ['pr-specialist', 'media-planner', 'content-strategist'] },
  { id: 'liberal-studies-bachelor', title: 'Liberal Studies', category: 'liberal-arts', careers: ['educator', 'writer', 'nonprofit-manager'] },
  { id: 'criminal-justice-bachelor', title: 'Criminal Justice', category: 'liberal-arts', careers: ['law-enforcement', 'paralegal', 'corrections-officer'] },
] as const;

const OPTIMIZATIONS = [
  { id: 'cheapest', badge: 'Cheapest', costMod: 0.7, weeksMod: 1.3, criMod: 0.95 },
  { id: 'fastest', badge: 'Fastest', costMod: 1.2, weeksMod: 0.7, criMod: 1.0 },
  { id: 'balanced', badge: 'Balanced', costMod: 1.0, weeksMod: 1.0, criMod: 1.05 },
] as const;

// ============================================================================
// COURSE OPTIONS LIBRARY
// ============================================================================

interface CourseOption {
  id: string;
  courseId: string;
  title: string;
  credits: number;
  cost_usd: number;
  duration_weeks: number;
  provider: string;
  providerType: string;
  providerCode: string;
  level: number;
  cri_score: number;
  workload_weekly_hours: number;
  subject: string;
}

const COURSE_LIBRARY: Record<string, CourseOption[]> = {
  'WRITTEN_COMM': [
    { id: 'sophia-eng-comp', courseId: 'SOPHIA-ENG-COMP-I-II', title: 'English Composition I & II', credits: 6, cost_usd: 99, duration_weeks: 8, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 72, workload_weekly_hours: 8, subject: 'English' },
    { id: 'sdc-eng-comp', courseId: 'SDC-ENG-COMP', title: 'English Composition Bundle', credits: 6, cost_usd: 158, duration_weeks: 6, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 100, cri_score: 75, workload_weekly_hours: 10, subject: 'English' },
    { id: 'clep-composition', courseId: 'CLEP-COMP-MOD', title: 'CLEP College Composition Modular', credits: 6, cost_usd: 92, duration_weeks: 4, provider: 'CLEP', providerType: 'exam', providerCode: 'CLEP', level: 100, cri_score: 78, workload_weekly_hours: 15, subject: 'English' },
  ],
  'ORAL_COMM': [
    { id: 'sophia-public-speaking', courseId: 'SOPHIA-PUBLIC-SPEAK', title: 'Public Speaking', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 75, workload_weekly_hours: 7.5, subject: 'Communication' },
    { id: 'sdc-public-speaking', courseId: 'SDC-PUBLIC-SPEAK', title: 'Public Speaking', credits: 3, cost_usd: 79, duration_weeks: 3, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 100, cri_score: 74, workload_weekly_hours: 8, subject: 'Communication' },
  ],
  'QUANTITATIVE': [
    { id: 'sophia-college-algebra', courseId: 'SOPHIA-COLLEGE-ALG', title: 'College Algebra', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 78, workload_weekly_hours: 7.5, subject: 'Mathematics' },
    { id: 'clep-college-algebra', courseId: 'CLEP-COLLEGE-ALG', title: 'CLEP College Algebra', credits: 3, cost_usd: 92, duration_weeks: 3, provider: 'CLEP', providerType: 'exam', providerCode: 'CLEP', level: 100, cri_score: 82, workload_weekly_hours: 12, subject: 'Mathematics' },
    { id: 'sdc-college-algebra', courseId: 'SDC-COLLEGE-ALG', title: 'College Algebra', credits: 3, cost_usd: 79, duration_weeks: 3, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 100, cri_score: 76, workload_weekly_hours: 8, subject: 'Mathematics' },
  ],
  'HUMANITIES': [
    { id: 'sophia-intro-ethics', courseId: 'SOPHIA-INTRO-ETHICS', title: 'Introduction to Ethics', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 70, workload_weekly_hours: 7.5, subject: 'Philosophy' },
    { id: 'sophia-art-history', courseId: 'SOPHIA-ART-HIST', title: 'Art History', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 69, workload_weekly_hours: 7.5, subject: 'Art' },
    { id: 'clep-humanities', courseId: 'CLEP-HUMANITIES', title: 'CLEP Humanities', credits: 6, cost_usd: 92, duration_weeks: 4, provider: 'CLEP', providerType: 'exam', providerCode: 'CLEP', level: 100, cri_score: 74, workload_weekly_hours: 12, subject: 'Humanities' },
  ],
  'SOCIAL_SCIENCE': [
    { id: 'sophia-intro-psychology', courseId: 'SOPHIA-INTRO-PSYCH', title: 'Introduction to Psychology', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 73, workload_weekly_hours: 7.5, subject: 'Psychology' },
    { id: 'sophia-intro-sociology', courseId: 'SOPHIA-INTRO-SOC', title: 'Introduction to Sociology', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 71, workload_weekly_hours: 7.5, subject: 'Sociology' },
    { id: 'clep-intro-sociology', courseId: 'CLEP-INTRO-SOC', title: 'CLEP Introductory Sociology', credits: 3, cost_usd: 92, duration_weeks: 3, provider: 'CLEP', providerType: 'exam', providerCode: 'CLEP', level: 100, cri_score: 76, workload_weekly_hours: 12, subject: 'Sociology' },
  ],
  'NATURAL_SCIENCE': [
    { id: 'sophia-human-biology', courseId: 'SOPHIA-HUMAN-BIO', title: 'Human Biology', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 68, workload_weekly_hours: 7.5, subject: 'Biology' },
    { id: 'sophia-env-science', courseId: 'SOPHIA-ENV-SCI', title: 'Environmental Science', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 70, workload_weekly_hours: 7.5, subject: 'Science' },
    { id: 'clep-biology', courseId: 'CLEP-BIOLOGY', title: 'CLEP Biology', credits: 6, cost_usd: 92, duration_weeks: 4, provider: 'CLEP', providerType: 'exam', providerCode: 'CLEP', level: 100, cri_score: 75, workload_weekly_hours: 15, subject: 'Biology' },
  ],
  'MATH_CORE': [
    { id: 'sdc-calculus-1', courseId: 'SDC-CALC-I', title: 'Calculus I', credits: 4, cost_usd: 79, duration_weeks: 6, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 100, cri_score: 82, workload_weekly_hours: 10, subject: 'Mathematics' },
    { id: 'sdc-calculus-2', courseId: 'SDC-CALC-II', title: 'Calculus II', credits: 4, cost_usd: 79, duration_weeks: 6, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 200, cri_score: 80, workload_weekly_hours: 10, subject: 'Mathematics' },
    { id: 'sdc-discrete-math', courseId: 'SDC-DISCRETE-MATH', title: 'Discrete Mathematics', credits: 4, cost_usd: 79, duration_weeks: 5, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 200, cri_score: 80, workload_weekly_hours: 8, subject: 'Mathematics' },
    { id: 'sophia-statistics', courseId: 'SOPHIA-STATS', title: 'Introduction to Statistics', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 74, workload_weekly_hours: 8, subject: 'Mathematics' },
  ],
  'CS_CORE': [
    { id: 'sdc-intro-cs', courseId: 'SDC-INTRO-CS', title: 'Introduction to Computer Science', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 100, cri_score: 80, workload_weekly_hours: 8, subject: 'Computer Science' },
    { id: 'sdc-python', courseId: 'SDC-PYTHON', title: 'Introduction to Python', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 100, cri_score: 85, workload_weekly_hours: 8, subject: 'Computer Science' },
    { id: 'sophia-java', courseId: 'SOPHIA-JAVA', title: 'Introduction to Java', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 80, workload_weekly_hours: 9, subject: 'Computer Science' },
    { id: 'sdc-data-structures', courseId: 'SDC-DATA-STRUCT', title: 'Data Structures', credits: 3, cost_usd: 79, duration_weeks: 5, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 82, workload_weekly_hours: 9, subject: 'Computer Science' },
    { id: 'sdc-algorithms', courseId: 'SDC-ALGORITHMS', title: 'Algorithms', credits: 3, cost_usd: 79, duration_weeks: 5, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 84, workload_weekly_hours: 10, subject: 'Computer Science' },
    { id: 'sdc-os', courseId: 'SDC-OS', title: 'Operating Systems', credits: 3, cost_usd: 79, duration_weeks: 5, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 81, workload_weekly_hours: 9, subject: 'Computer Science' },
    { id: 'sdc-databases', courseId: 'SDC-DATABASES', title: 'Database Systems', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 83, workload_weekly_hours: 8, subject: 'Computer Science' },
    { id: 'sdc-networks', courseId: 'SDC-NETWORKS', title: 'Computer Networks', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 80, workload_weekly_hours: 8, subject: 'Computer Science' },
  ],
  'BUSINESS_CORE': [
    { id: 'sophia-intro-business', courseId: 'SOPHIA-INTRO-BUS', title: 'Introduction to Business', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 100, cri_score: 72, workload_weekly_hours: 7.5, subject: 'Business' },
    { id: 'sophia-principles-mgmt', courseId: 'SOPHIA-PRIN-MGMT', title: 'Principles of Management', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 74, workload_weekly_hours: 7.5, subject: 'Management' },
    { id: 'sophia-micro-econ', courseId: 'SOPHIA-MICRO-ECON', title: 'Microeconomics', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 74, workload_weekly_hours: 8, subject: 'Economics' },
    { id: 'sophia-macro-econ', courseId: 'SOPHIA-MACRO-ECON', title: 'Macroeconomics', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 72, workload_weekly_hours: 8, subject: 'Economics' },
    { id: 'sophia-financial-acct', courseId: 'SOPHIA-FIN-ACCT', title: 'Financial Accounting', credits: 3, cost_usd: 99, duration_weeks: 5, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 76, workload_weekly_hours: 9, subject: 'Accounting' },
    { id: 'sophia-managerial-acct', courseId: 'SOPHIA-MGR-ACCT', title: 'Managerial Accounting', credits: 3, cost_usd: 99, duration_weeks: 5, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 300, cri_score: 75, workload_weekly_hours: 9, subject: 'Accounting' },
    { id: 'sophia-business-law', courseId: 'SOPHIA-BUS-LAW', title: 'Business Law', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 300, cri_score: 73, workload_weekly_hours: 8, subject: 'Business' },
    { id: 'sophia-marketing', courseId: 'SOPHIA-MARKETING', title: 'Principles of Marketing', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 74, workload_weekly_hours: 7.5, subject: 'Marketing' },
    { id: 'sdc-business-ethics', courseId: 'SDC-BUS-ETHICS', title: 'Business Ethics', credits: 3, cost_usd: 79, duration_weeks: 3, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 72, workload_weekly_hours: 8, subject: 'Business' },
  ],
  'HEALTHCARE_CORE': [
    { id: 'sophia-anatomy-1', courseId: 'SOPHIA-ANAT-1', title: 'Anatomy & Physiology I', credits: 4, cost_usd: 99, duration_weeks: 6, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 78, workload_weekly_hours: 10, subject: 'Anatomy' },
    { id: 'sophia-anatomy-2', courseId: 'SOPHIA-ANAT-2', title: 'Anatomy & Physiology II', credits: 4, cost_usd: 99, duration_weeks: 6, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 78, workload_weekly_hours: 10, subject: 'Anatomy' },
    { id: 'sophia-microbiology', courseId: 'SOPHIA-MICRO', title: 'Microbiology', credits: 4, cost_usd: 99, duration_weeks: 5, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 76, workload_weekly_hours: 10, subject: 'Biology' },
    { id: 'sdc-health-admin', courseId: 'SDC-HEALTH-ADMIN', title: 'Healthcare Administration', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 74, workload_weekly_hours: 8, subject: 'Healthcare' },
    { id: 'sdc-health-info', courseId: 'SDC-HEALTH-INFO', title: 'Health Information Systems', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 75, workload_weekly_hours: 8, subject: 'Healthcare' },
    { id: 'sdc-epidemiology', courseId: 'SDC-EPIDEMIOLOGY', title: 'Epidemiology', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 77, workload_weekly_hours: 9, subject: 'Public Health' },
  ],
  'PSYCHOLOGY_CORE': [
    { id: 'sophia-dev-psych', courseId: 'SOPHIA-DEV-PSYCH', title: 'Developmental Psychology', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 73, workload_weekly_hours: 7.5, subject: 'Psychology' },
    { id: 'sophia-abnormal-psych', courseId: 'SOPHIA-ABN-PSYCH', title: 'Abnormal Psychology', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 300, cri_score: 74, workload_weekly_hours: 8, subject: 'Psychology' },
    { id: 'sdc-social-psych', courseId: 'SDC-SOC-PSYCH', title: 'Social Psychology', credits: 3, cost_usd: 79, duration_weeks: 3, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 75, workload_weekly_hours: 8, subject: 'Psychology' },
    { id: 'sdc-research-methods', courseId: 'SDC-RESEARCH-METH', title: 'Research Methods', credits: 3, cost_usd: 79, duration_weeks: 4, provider: 'Study.com', providerType: 'mooc', providerCode: 'STUDYCOM', level: 300, cri_score: 76, workload_weekly_hours: 9, subject: 'Psychology' },
  ],
  'FREE_ELECTIVE': [
    { id: 'sophia-business-comm', courseId: 'SOPHIA-BUS-COMM', title: 'Business Communication', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 73, workload_weekly_hours: 8, subject: 'Business' },
    { id: 'sophia-project-mgmt', courseId: 'SOPHIA-PROJ-MGMT', title: 'Project Management', credits: 3, cost_usd: 99, duration_weeks: 4, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 300, cri_score: 75, workload_weekly_hours: 8, subject: 'Management' },
    { id: 'sophia-conflict-mgmt', courseId: 'SOPHIA-CONFLICT', title: 'Conflict Management', credits: 3, cost_usd: 99, duration_weeks: 3, provider: 'Sophia Learning', providerType: 'mooc', providerCode: 'SOPHIA', level: 200, cri_score: 72, workload_weekly_hours: 7, subject: 'Management' },
  ],
};

// ============================================================================
// PROGRAM-SPECIFIC MODULE REQUIREMENTS
// ============================================================================

interface ModuleRequirement {
  moduleId: string;
  label: string;
  creditsRequired: number;
  requirementArea: string;
  courseLibraryKey: string;
}

const GEN_ED_MODULES: ModuleRequirement[] = [
  { moduleId: 'WRITTEN_COMM', label: 'Written Communication (6cr)', creditsRequired: 6, requirementArea: 'WRITTEN_COMM', courseLibraryKey: 'WRITTEN_COMM' },
  { moduleId: 'ORAL_COMM', label: 'Oral Communication (3cr)', creditsRequired: 3, requirementArea: 'ORAL_COMM', courseLibraryKey: 'ORAL_COMM' },
  { moduleId: 'QUANTITATIVE', label: 'College Algebra (3cr)', creditsRequired: 3, requirementArea: 'QUANTITATIVE', courseLibraryKey: 'QUANTITATIVE' },
  { moduleId: 'HUMANITIES_1', label: 'Humanities I (3cr)', creditsRequired: 3, requirementArea: 'HUMANITIES', courseLibraryKey: 'HUMANITIES' },
  { moduleId: 'HUMANITIES_2', label: 'Humanities II (3cr)', creditsRequired: 3, requirementArea: 'HUMANITIES', courseLibraryKey: 'HUMANITIES' },
  { moduleId: 'SOCIAL_SCIENCE_1', label: 'Social Science I (3cr)', creditsRequired: 3, requirementArea: 'SOCIAL_SCIENCE', courseLibraryKey: 'SOCIAL_SCIENCE' },
  { moduleId: 'SOCIAL_SCIENCE_2', label: 'Social Science II (3cr)', creditsRequired: 3, requirementArea: 'SOCIAL_SCIENCE', courseLibraryKey: 'SOCIAL_SCIENCE' },
  { moduleId: 'NATURAL_SCIENCE_1', label: 'Natural Science I (3cr)', creditsRequired: 3, requirementArea: 'NATURAL_SCIENCE', courseLibraryKey: 'NATURAL_SCIENCE' },
  { moduleId: 'NATURAL_SCIENCE_2', label: 'Natural Science II (3cr)', creditsRequired: 3, requirementArea: 'NATURAL_SCIENCE', courseLibraryKey: 'NATURAL_SCIENCE' },
];

const PROGRAM_MAJOR_MODULES: Record<string, ModuleRequirement[]> = {
  'tech': [
    { moduleId: 'CS_INTRO', label: 'Intro to Computer Science (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'PROGRAMMING_I', label: 'Programming I (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'PROGRAMMING_II', label: 'Programming II (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'DATA_STRUCTURES', label: 'Data Structures (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'ALGORITHMS', label: 'Algorithms (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'OS', label: 'Operating Systems (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'DATABASES', label: 'Database Systems (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'NETWORKS', label: 'Computer Networks (3cr)', creditsRequired: 3, requirementArea: 'CS_CORE', courseLibraryKey: 'CS_CORE' },
    { moduleId: 'CALCULUS_I', label: 'Calculus I (4cr)', creditsRequired: 4, requirementArea: 'MATH_CORE', courseLibraryKey: 'MATH_CORE' },
    { moduleId: 'CALCULUS_II', label: 'Calculus II (4cr)', creditsRequired: 4, requirementArea: 'MATH_CORE', courseLibraryKey: 'MATH_CORE' },
    { moduleId: 'DISCRETE_MATH', label: 'Discrete Mathematics (4cr)', creditsRequired: 4, requirementArea: 'MATH_CORE', courseLibraryKey: 'MATH_CORE' },
    { moduleId: 'STATISTICS', label: 'Statistics (3cr)', creditsRequired: 3, requirementArea: 'MATH_CORE', courseLibraryKey: 'MATH_CORE' },
  ],
  'business': [
    { moduleId: 'INTRO_BUSINESS', label: 'Introduction to Business (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'PRINCIPLES_MGMT', label: 'Principles of Management (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'MICROECONOMICS', label: 'Microeconomics (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'MACROECONOMICS', label: 'Macroeconomics (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'FINANCIAL_ACCT', label: 'Financial Accounting (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'MANAGERIAL_ACCT', label: 'Managerial Accounting (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'BUSINESS_LAW', label: 'Business Law (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'MARKETING', label: 'Principles of Marketing (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'BUSINESS_ETHICS', label: 'Business Ethics (3cr)', creditsRequired: 3, requirementArea: 'BUSINESS_CORE', courseLibraryKey: 'BUSINESS_CORE' },
    { moduleId: 'STATISTICS', label: 'Business Statistics (3cr)', creditsRequired: 3, requirementArea: 'MATH_CORE', courseLibraryKey: 'MATH_CORE' },
  ],
  'healthcare': [
    { moduleId: 'ANATOMY_1', label: 'Anatomy & Physiology I (4cr)', creditsRequired: 4, requirementArea: 'HEALTHCARE_CORE', courseLibraryKey: 'HEALTHCARE_CORE' },
    { moduleId: 'ANATOMY_2', label: 'Anatomy & Physiology II (4cr)', creditsRequired: 4, requirementArea: 'HEALTHCARE_CORE', courseLibraryKey: 'HEALTHCARE_CORE' },
    { moduleId: 'MICROBIOLOGY', label: 'Microbiology (4cr)', creditsRequired: 4, requirementArea: 'HEALTHCARE_CORE', courseLibraryKey: 'HEALTHCARE_CORE' },
    { moduleId: 'HEALTH_ADMIN', label: 'Healthcare Administration (3cr)', creditsRequired: 3, requirementArea: 'HEALTHCARE_CORE', courseLibraryKey: 'HEALTHCARE_CORE' },
    { moduleId: 'HEALTH_INFO', label: 'Health Information Systems (3cr)', creditsRequired: 3, requirementArea: 'HEALTHCARE_CORE', courseLibraryKey: 'HEALTHCARE_CORE' },
    { moduleId: 'EPIDEMIOLOGY', label: 'Epidemiology (3cr)', creditsRequired: 3, requirementArea: 'HEALTHCARE_CORE', courseLibraryKey: 'HEALTHCARE_CORE' },
    { moduleId: 'STATISTICS', label: 'Biostatistics (3cr)', creditsRequired: 3, requirementArea: 'MATH_CORE', courseLibraryKey: 'MATH_CORE' },
  ],
  'liberal-arts': [
    { moduleId: 'INTRO_PSYCH', label: 'Introduction to Psychology (3cr)', creditsRequired: 3, requirementArea: 'PSYCHOLOGY_CORE', courseLibraryKey: 'SOCIAL_SCIENCE' },
    { moduleId: 'DEV_PSYCH', label: 'Developmental Psychology (3cr)', creditsRequired: 3, requirementArea: 'PSYCHOLOGY_CORE', courseLibraryKey: 'PSYCHOLOGY_CORE' },
    { moduleId: 'ABNORMAL_PSYCH', label: 'Abnormal Psychology (3cr)', creditsRequired: 3, requirementArea: 'PSYCHOLOGY_CORE', courseLibraryKey: 'PSYCHOLOGY_CORE' },
    { moduleId: 'SOCIAL_PSYCH', label: 'Social Psychology (3cr)', creditsRequired: 3, requirementArea: 'PSYCHOLOGY_CORE', courseLibraryKey: 'PSYCHOLOGY_CORE' },
    { moduleId: 'RESEARCH_METHODS', label: 'Research Methods (3cr)', creditsRequired: 3, requirementArea: 'PSYCHOLOGY_CORE', courseLibraryKey: 'PSYCHOLOGY_CORE' },
    { moduleId: 'STATISTICS', label: 'Statistics for Social Sciences (3cr)', creditsRequired: 3, requirementArea: 'MATH_CORE', courseLibraryKey: 'MATH_CORE' },
  ],
};

// ============================================================================
// TEMPLATE GENERATION
// ============================================================================

function selectCourseForOptimization(courses: CourseOption[], optimization: string): CourseOption {
  const sorted = [...courses].sort((a, b) => {
    if (optimization === 'cheapest') return a.cost_usd - b.cost_usd;
    if (optimization === 'fastest') return a.duration_weeks - b.duration_weeks;
    // balanced: sort by CRI score
    return b.cri_score - a.cri_score;
  });
  return sorted[0];
}

function buildModuleTemplate(
  requirement: ModuleRequirement,
  optimization: typeof OPTIMIZATIONS[number],
  uniqueIndex: number
) {
  const courses = COURSE_LIBRARY[requirement.courseLibraryKey] || COURSE_LIBRARY['FREE_ELECTIVE'];
  const primary = selectCourseForOptimization(courses, optimization.id);
  
  return {
    moduleId: `${requirement.moduleId}_${uniqueIndex}`,
    label: requirement.label,
    creditsRequired: requirement.creditsRequired,
    requirementArea: requirement.requirementArea,
    options: courses.slice(0, 3).map(c => ({
      ...c,
      cost_usd: Math.round(c.cost_usd * optimization.costMod),
      duration_weeks: Math.round(c.duration_weeks * optimization.weeksMod),
      cri_score: Math.round(c.cri_score * optimization.criMod),
    })),
    recommendedCourseId: primary.courseId,
  };
}

function buildYearTemplate(
  year: number,
  modules: ModuleRequirement[],
  optimization: typeof OPTIMIZATIONS[number],
  programCategory: string
) {
  const yearLabels: Record<number, string> = {
    1: 'Year 1 – Foundation',
    2: 'Year 2 – Core Development',
    3: 'Year 3 – Advanced Studies',
    4: 'Year 4 – Capstone & Specialization',
  };
  
  const paces: Record<number, string> = {
    1: 'part_time',
    2: 'part_time',
    3: 'full_time',
    4: 'full_time',
  };
  
  return {
    year,
    label: `${yearLabels[year] || `Year ${year}`} (${modules.reduce((s, m) => s + m.creditsRequired, 0)}cr)`,
    recommendedPace: paces[year] || 'part_time',
    moduleTemplates: modules.map((m, i) => buildModuleTemplate(m, optimization, year * 100 + i)),
  };
}

function generateTemplate(
  institution: typeof INSTITUTIONS[number],
  program: typeof PROGRAMS[number],
  optimization: typeof OPTIMIZATIONS[number]
) {
  const id = `${program.id}-${institution.code.toLowerCase()}-${optimization.id}-2025`;
  
  // Build year structures
  const year1Modules = GEN_ED_MODULES.slice(0, 9);
  const majorModules = PROGRAM_MAJOR_MODULES[program.category] || [];
  const year2Modules = majorModules.slice(0, 6);
  const year3Modules = majorModules.slice(6, 12);
  const year4Modules = [
    ...COURSE_LIBRARY['FREE_ELECTIVE'].slice(0, 3).map((_, i) => ({
      moduleId: `FREE_ELECTIVE_${i + 1}`,
      label: `Free Elective (3cr)`,
      creditsRequired: 3,
      requirementArea: 'FREE_ELECTIVE',
      courseLibraryKey: 'FREE_ELECTIVE',
    })),
    {
      moduleId: 'CAPSTONE',
      label: 'Senior Capstone (6cr)',
      creditsRequired: 6,
      requirementArea: 'CAPSTONE',
      courseLibraryKey: 'FREE_ELECTIVE',
    },
  ];
  
  const yearTemplates = [
    buildYearTemplate(1, year1Modules, optimization, program.category),
    buildYearTemplate(2, year2Modules.length > 0 ? year2Modules : year1Modules, optimization, program.category),
    buildYearTemplate(3, year3Modules.length > 0 ? year3Modules : year2Modules, optimization, program.category),
    buildYearTemplate(4, year4Modules, optimization, program.category),
  ];
  
  // Calculate totals
  const allModules = yearTemplates.flatMap(y => y.moduleTemplates);
  const totalCredits = allModules.reduce((s, m) => s + m.creditsRequired, 0);
  const totalCost = allModules.reduce((s, m) => s + (m.options[0]?.cost_usd || 0), 0);
  const totalWeeks = allModules.reduce((s, m) => s + (m.options[0]?.duration_weeks || 0), 0);
  const avgCri = allModules.reduce((s, m) => s + (m.options[0]?.cri_score || 0), 0) / allModules.length;
  
  // Institution-specific cost adjustments
  const institutionMultipliers: Record<string, number> = {
    'TESU': 0.9,
    'WGU': 1.0,
    'EXCEL': 0.95,
    'COSC': 0.85,
    'UMGC': 1.1,
    'SNHU': 1.15,
    'PURDUEG': 1.2,
    'ASUO': 1.3,
    'PHOENIX': 1.25,
    'WALDEN': 1.2,
  };
  
  const instMult = institutionMultipliers[institution.code] || 1.0;
  
  return {
    id,
    kind: 'degree',
    programId: program.id,
    anchorSchool: institution.code,
    optimization: optimization.id,
    label: `BS ${program.title} @ ${institution.code} • ${optimization.badge}`,
    summary: `Complete your ${program.title} degree at ${institution.name} with ${optimization.id === 'cheapest' ? 'maximum savings' : optimization.id === 'fastest' ? 'accelerated timeline' : 'balanced approach'}. ${totalCredits} credits total.`,
    badge: optimization.badge,
    catalogYear: '2025',
    policyVersion: `${institution.code}-2025-v1`,
    generatedAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    marketplace: {
      title: `${optimization.badge} ${program.title} Degree`,
      tagline: `${program.title} at ${institution.name}`,
      badge: optimization.badge,
      isPremium: institution.tier === 'secondary' || institution.tier === 'tertiary',
    },
    lifestyle: {
      avgWeeklyHours: optimization.id === 'fastest' ? 18 : optimization.id === 'cheapest' ? 10 : 14,
      paceType: optimization.id === 'fastest' ? 'intensive' : 'flexible',
      workCompatible: optimization.id !== 'fastest',
    },
    primaryCareerIds: program.careers as unknown as string[],
    deliveryMode: 'fully_online',
    inPersonWeeks: 0,
    socialProof: {
      popularityScore: 3.5 + Math.random() * 1.5,
      dataSource: 'generated',
    },
    yearTemplates,
    totals: {
      credits: totalCredits,
      costUsd: Math.round(totalCost * instMult),
      weeks: totalWeeks,
      avgCri: Math.round(avgCri * 10) / 10,
    },
  };
}

// ============================================================================
// MAIN GENERATION
// ============================================================================

function main() {
  const templates: ReturnType<typeof generateTemplate>[] = [];
  
  // Generate for primary tier institutions (all programs, all optimizations)
  const primaryInstitutions = INSTITUTIONS.filter(i => i.tier === 'primary');
  for (const inst of primaryInstitutions) {
    for (const program of PROGRAMS) {
      for (const opt of OPTIMIZATIONS) {
        templates.push(generateTemplate(inst, program, opt));
      }
    }
  }
  
  // Generate for secondary tier (select programs, all optimizations)
  const secondaryInstitutions = INSTITUTIONS.filter(i => i.tier === 'secondary');
  const popularPrograms = PROGRAMS.filter(p => 
    ['cs-bachelor', 'business-admin-bachelor', 'nursing-rn-bsn', 'psychology-bachelor'].includes(p.id)
  );
  for (const inst of secondaryInstitutions) {
    for (const program of popularPrograms) {
      for (const opt of OPTIMIZATIONS) {
        templates.push(generateTemplate(inst, program, opt));
      }
    }
  }
  
  // Generate for tertiary tier (2 programs, cheapest only)
  const tertiaryInstitutions = INSTITUTIONS.filter(i => i.tier === 'tertiary');
  const corePrograms = PROGRAMS.filter(p => 
    ['business-admin-bachelor', 'liberal-studies-bachelor'].includes(p.id)
  );
  for (const inst of tertiaryInstitutions) {
    for (const program of corePrograms) {
      templates.push(generateTemplate(inst, program, OPTIMIZATIONS[0])); // cheapest only
    }
  }
  
  console.log(`Generated ${templates.length} marketplace templates`);
  console.log(JSON.stringify(templates, null, 2));
}

main();
