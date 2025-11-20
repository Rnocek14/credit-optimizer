/**
 * Complete marketplace course options for CS degree
 * Mix of university (residency) and alternative credit (ACE/MOOC) options
 */

import type { MarketplaceOption } from '@/pages/EduTree/v5/types/v5';

// Simplified interface for defining courses, will be mapped to MarketplaceOption
interface CourseDefinition {
  courseId: string;
  title: string;
  credits: number;
  providerType: 'university' | 'mooc' | 'testing_center';
  blockId: string; // Maps to requirement block
  level: number; // 100, 200, 300, 400
  cost_usd: number;
  duration_weeks: number;
  cri_score?: number;
  provider_name?: string;
  workload_weekly_hours?: number;
  subject?: string;
}

const COURSE_DEFINITIONS: CourseDefinition[] = [
  // ============ General Education (36 credits) ============
  { courseId: 'ENG-101', title: 'Composition I', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 75, provider_name: 'State University', subject: 'English' },
  { courseId: 'ENG-102', title: 'Composition II', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 75, provider_name: 'State University', subject: 'English' },
  { courseId: 'ENG-ACE', title: 'English Composition (ACE)', credits: 3, providerType: 'mooc', blockId: 'general-education', level: 100, cost_usd: 150, duration_weeks: 4, cri_score: 65, provider_name: 'ACE Credit', workload_weekly_hours: 8, subject: 'English' },
  
  { courseId: 'COMM-110', title: 'Public Speaking', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 72, provider_name: 'State University', subject: 'Communication' },
  { courseId: 'COMM-ACE', title: 'Communication (Sophia)', credits: 3, providerType: 'mooc', blockId: 'general-education', level: 100, cost_usd: 99, duration_weeks: 2, cri_score: 60, provider_name: 'Sophia Learning', workload_weekly_hours: 10, subject: 'Communication' },
  
  { courseId: 'HUM-201', title: 'Ethics', credits: 3, providerType: 'university', blockId: 'general-education', level: 200, cost_usd: 1125, duration_weeks: 8, cri_score: 78, provider_name: 'State University', subject: 'Humanities' },
  { courseId: 'HUM-202', title: 'World Religions', credits: 3, providerType: 'university', blockId: 'general-education', level: 200, cost_usd: 1125, duration_weeks: 8, cri_score: 74, provider_name: 'State University', subject: 'Humanities' },
  
  { courseId: 'SOC-101', title: 'Introduction to Sociology', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 70, provider_name: 'State University', subject: 'Sociology' },
  { courseId: 'PSY-101', title: 'Introduction to Psychology', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 73, provider_name: 'State University', subject: 'Psychology' },
  { courseId: 'PSY-ACE', title: 'Psychology (ACE)', credits: 3, providerType: 'mooc', blockId: 'general-education', level: 100, cost_usd: 150, duration_weeks: 4, cri_score: 62, provider_name: 'ACE Credit', workload_weekly_hours: 8, subject: 'Psychology' },
  
  { courseId: 'HIST-101', title: 'US History I', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 71, provider_name: 'State University', subject: 'History' },
  { courseId: 'HIST-102', title: 'US History II', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 71, provider_name: 'State University', subject: 'History' },
  
  { courseId: 'ART-105', title: 'Art Appreciation', credits: 3, providerType: 'university', blockId: 'general-education', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 68, provider_name: 'State University', subject: 'Arts' },
  
  // ============ CS Prerequisites (12 credits) ============
  { courseId: 'MATH-ALGEBRA', title: 'College Algebra', credits: 3, providerType: 'university', blockId: 'cs-prerequisites', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 76, provider_name: 'State University', subject: 'Mathematics' },
  { courseId: 'MATH-ACE', title: 'College Algebra (ACE)', credits: 3, providerType: 'mooc', blockId: 'cs-prerequisites', level: 100, cost_usd: 150, duration_weeks: 4, cri_score: 68, provider_name: 'ACE Credit', workload_weekly_hours: 8, subject: 'Mathematics' },
  { courseId: 'MATH-TRIG', title: 'Trigonometry', credits: 3, providerType: 'university', blockId: 'cs-prerequisites', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 77, provider_name: 'State University', subject: 'Mathematics' },
  { courseId: 'MATH-151', title: 'Calculus I', credits: 4, providerType: 'university', blockId: 'cs-prerequisites', level: 100, cost_usd: 1500, duration_weeks: 8, cri_score: 82, provider_name: 'State University', subject: 'Mathematics' },
  { courseId: 'MATH-CALC-ACE', title: 'Calculus I (Study.com)', credits: 4, providerType: 'mooc', blockId: 'cs-prerequisites', level: 100, cost_usd: 199, duration_weeks: 6, cri_score: 72, provider_name: 'Study.com', workload_weekly_hours: 10, subject: 'Mathematics' },
  { courseId: 'MATH-DISCRETE', title: 'Discrete Mathematics', credits: 3, providerType: 'university', blockId: 'cs-prerequisites', level: 200, cost_usd: 1125, duration_weeks: 8, cri_score: 80, provider_name: 'State University', subject: 'Mathematics' },
  { courseId: 'MATH-DISCRETE-ACE', title: 'Discrete Math (Coursera)', credits: 3, providerType: 'mooc', blockId: 'cs-prerequisites', level: 200, cost_usd: 175, duration_weeks: 6, cri_score: 70, provider_name: 'Coursera', workload_weekly_hours: 9, subject: 'Mathematics' },
  
  // ============ CS Core (42 credits) ============
  { courseId: 'CS-101', title: 'Intro to Computer Science', credits: 3, providerType: 'university', blockId: 'cs-core', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 78, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-110', title: 'Programming I (Python)', credits: 3, providerType: 'university', blockId: 'cs-core', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 80, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-111', title: 'Programming II (Java)', credits: 3, providerType: 'university', blockId: 'cs-core', level: 100, cost_usd: 1125, duration_weeks: 8, cri_score: 81, provider_name: 'State University', subject: 'Computer Science' },
  
  { courseId: 'CS-210', title: 'Computer Architecture', credits: 3, providerType: 'university', blockId: 'cs-core', level: 200, cost_usd: 1125, duration_weeks: 8, cri_score: 79, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-220', title: 'Data Structures', credits: 3, providerType: 'university', blockId: 'cs-core', level: 200, cost_usd: 1125, duration_weeks: 8, cri_score: 85, provider_name: 'State University', subject: 'Computer Science' },
  
  { courseId: 'CS-301', title: 'Algorithms', credits: 3, providerType: 'university', blockId: 'cs-core', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 88, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-305', title: 'Database Systems', credits: 3, providerType: 'university', blockId: 'cs-core', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 84, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-310', title: 'Operating Systems', credits: 3, providerType: 'university', blockId: 'cs-core', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 86, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-315', title: 'Computer Networks', credits: 3, providerType: 'university', blockId: 'cs-core', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 83, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-320', title: 'Software Engineering', credits: 3, providerType: 'university', blockId: 'cs-core', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 87, provider_name: 'State University', subject: 'Computer Science' },
  
  { courseId: 'CS-401', title: 'Theory of Computation', credits: 3, providerType: 'university', blockId: 'cs-core', level: 400, cost_usd: 1125, duration_weeks: 8, cri_score: 90, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-405', title: 'Compiler Design', credits: 3, providerType: 'university', blockId: 'cs-core', level: 400, cost_usd: 1125, duration_weeks: 8, cri_score: 89, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-410', title: 'Artificial Intelligence', credits: 3, providerType: 'university', blockId: 'cs-core', level: 400, cost_usd: 1125, duration_weeks: 8, cri_score: 92, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'CS-490', title: 'Senior Capstone', credits: 3, providerType: 'university', blockId: 'cs-core', level: 400, cost_usd: 1125, duration_weeks: 16, cri_score: 85, provider_name: 'State University', subject: 'Computer Science' },
  
  // CS Core - MOOC Alternatives
  { courseId: 'CS-ACE-ALGORITHMS', title: 'Algorithms (ASU Online)', credits: 3, providerType: 'mooc', blockId: 'cs-core', level: 300, cost_usd: 199, duration_weeks: 8, cri_score: 75, provider_name: 'ASU Online', workload_weekly_hours: 10, subject: 'Computer Science' },
  { courseId: 'CS-ACE-DATABASES', title: 'Database Systems (Study.com)', credits: 3, providerType: 'mooc', blockId: 'cs-core', level: 300, cost_usd: 199, duration_weeks: 8, cri_score: 74, provider_name: 'Study.com', workload_weekly_hours: 9, subject: 'Computer Science' },
  { courseId: 'CS-MOOC-WEB', title: 'Web Development (Coursera)', credits: 3, providerType: 'mooc', blockId: 'cs-core', level: 200, cost_usd: 99, duration_weeks: 6, cri_score: 68, provider_name: 'Coursera', workload_weekly_hours: 8, subject: 'Computer Science' },
  { courseId: 'CS-MOOC-NETWORKS', title: 'Computer Networks (edX)', credits: 3, providerType: 'mooc', blockId: 'cs-core', level: 300, cost_usd: 149, duration_weeks: 8, cri_score: 72, provider_name: 'edX', workload_weekly_hours: 9, subject: 'Computer Science' },
  
  // ============ Science Foundation (16 credits) ============
  { courseId: 'PHY-111', title: 'Physics I (w/ Lab)', credits: 4, providerType: 'university', blockId: 'science-foundation', level: 100, cost_usd: 1500, duration_weeks: 8, cri_score: 80, provider_name: 'State University', subject: 'Physics' },
  { courseId: 'PHY-112', title: 'Physics II (w/ Lab)', credits: 4, providerType: 'university', blockId: 'science-foundation', level: 100, cost_usd: 1500, duration_weeks: 8, cri_score: 81, provider_name: 'State University', subject: 'Physics' },
  { courseId: 'PHY-ACE-I', title: 'Physics I (ASU Online)', credits: 4, providerType: 'mooc', blockId: 'science-foundation', level: 100, cost_usd: 400, duration_weeks: 8, cri_score: 72, provider_name: 'ASU Online', workload_weekly_hours: 10, subject: 'Physics' },
  { courseId: 'PHY-ACE-II', title: 'Physics II (ASU Online)', credits: 4, providerType: 'mooc', blockId: 'science-foundation', level: 100, cost_usd: 400, duration_weeks: 8, cri_score: 72, provider_name: 'ASU Online', workload_weekly_hours: 10, subject: 'Physics' },
  
  { courseId: 'BIO-101', title: 'Biology I (w/ Lab)', credits: 4, providerType: 'university', blockId: 'science-foundation', level: 100, cost_usd: 1500, duration_weeks: 8, cri_score: 75, provider_name: 'State University', subject: 'Biology' },
  { courseId: 'BIO-102', title: 'Biology II (w/ Lab)', credits: 4, providerType: 'university', blockId: 'science-foundation', level: 100, cost_usd: 1500, duration_weeks: 8, cri_score: 75, provider_name: 'State University', subject: 'Biology' },
  
  { courseId: 'CHEM-111', title: 'Chemistry I (w/ Lab)', credits: 4, providerType: 'university', blockId: 'science-foundation', level: 100, cost_usd: 1500, duration_weeks: 8, cri_score: 78, provider_name: 'State University', subject: 'Chemistry' },
  { courseId: 'CHEM-112', title: 'Chemistry II (w/ Lab)', credits: 4, providerType: 'university', blockId: 'science-foundation', level: 100, cost_usd: 1500, duration_weeks: 8, cri_score: 78, provider_name: 'State University', subject: 'Chemistry' },
  
  // ============ Electives (18 credits) ============
  { courseId: 'ELEC-BUS-201', title: 'Business Management', credits: 3, providerType: 'university', blockId: 'electives', level: 200, cost_usd: 1125, duration_weeks: 8, cri_score: 72, provider_name: 'State University', subject: 'Business' },
  { courseId: 'ELEC-ECON-201', title: 'Microeconomics', credits: 3, providerType: 'university', blockId: 'electives', level: 200, cost_usd: 1125, duration_weeks: 8, cri_score: 74, provider_name: 'State University', subject: 'Economics' },
  { courseId: 'ELEC-MGT-301', title: 'Project Management', credits: 3, providerType: 'university', blockId: 'electives', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 76, provider_name: 'State University', subject: 'Management' },
  { courseId: 'ELEC-CS-360', title: 'Mobile App Development', credits: 3, providerType: 'university', blockId: 'electives', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 85, provider_name: 'State University', subject: 'Computer Science' },
  { courseId: 'ELEC-STAT-301', title: 'Statistics', credits: 3, providerType: 'university', blockId: 'electives', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 77, provider_name: 'State University', subject: 'Statistics' },
  { courseId: 'ELEC-CS-370', title: 'Machine Learning', credits: 3, providerType: 'university', blockId: 'electives', level: 300, cost_usd: 1125, duration_weeks: 8, cri_score: 88, provider_name: 'State University', subject: 'Computer Science' },
  
  // Electives - MOOC Alternatives
  { courseId: 'ELEC-ACE-BUS', title: 'Business Management (Sophia)', credits: 3, providerType: 'mooc', blockId: 'electives', level: 200, cost_usd: 125, duration_weeks: 4, cri_score: 65, provider_name: 'Sophia Learning', workload_weekly_hours: 8, subject: 'Business' },
  { courseId: 'ELEC-ACE-STATS', title: 'Statistics (Study.com)', credits: 3, providerType: 'mooc', blockId: 'electives', level: 300, cost_usd: 125, duration_weeks: 6, cri_score: 70, provider_name: 'Study.com', workload_weekly_hours: 9, subject: 'Statistics' },
  { courseId: 'ELEC-ACE-ECON', title: 'Microeconomics (Straighterline)', credits: 3, providerType: 'mooc', blockId: 'electives', level: 200, cost_usd: 99, duration_weeks: 4, cri_score: 68, provider_name: 'Straighterline', workload_weekly_hours: 8, subject: 'Economics' },
];

// Map definitions to MarketplaceOption format
export const COURSE_OPTIONS: MarketplaceOption[] = COURSE_DEFINITIONS.map((def, index) => ({
  id: `opt-${def.courseId}`,
  courseId: def.courseId,
  title: def.title,
  credits: def.credits,
  subject: def.subject || def.courseId.split('-')[0] || 'General',
  provider: def.provider_name || 'State University',
  providerType: def.providerType,
  cost_usd: def.cost_usd,
  duration_weeks: def.duration_weeks,
  cri_score: def.cri_score ?? 70,
  workload_weekly_hours: def.workload_weekly_hours ?? def.credits * 2.5,
  level: def.level,
  blockId: def.blockId, // Required for Credit Optimizer matching
}));

/**
 * Helper to get all options for a specific block
 */
export function getOptionsForBlock(blockId: string): MarketplaceOption[] {
  return COURSE_OPTIONS.filter((opt, index) => {
    const def = COURSE_DEFINITIONS[index];
    return def.blockId === blockId;
  });
}

/**
 * Helper to get university (residency) courses only
 */
export function getUniversityOptions(): MarketplaceOption[] {
  return COURSE_OPTIONS.filter(opt => opt.providerType === 'university');
}

/**
 * Helper to get alternative credit options (ACE/MOOC)
 */
export function getAlternativeCreditOptions(): MarketplaceOption[] {
  return COURSE_OPTIONS.filter(opt => opt.providerType === 'mooc' || opt.providerType === 'testing_center');
}
