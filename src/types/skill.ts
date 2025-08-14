/**
 * Production-ready skill gap detection types and constants
 */

export type SkillPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SkillGap {
  skill: string;
  currentLevel: number;      // 0..n
  targetLevel: number;       // default 3
  priority: SkillPriority;
  estimatedTimeToClose?: string;
  suggestedActions: string[];
  criImpact?: number;        // optional % boost
}

export const FALLBACK_SKILLS: Array<{ skill: string; priority: SkillPriority; criImpact?: number }> = [
  { skill: 'SQL', priority: 'critical', criImpact: 15 },
  { skill: 'Python', priority: 'high', criImpact: 12 },
  { skill: 'Machine Learning', priority: 'medium', criImpact: 8 },
  { skill: 'Data Analysis', priority: 'high', criImpact: 10 },
  { skill: 'Docker', priority: 'medium', criImpact: 6 },
  { skill: 'JavaScript', priority: 'high', criImpact: 9 },
  { skill: 'React', priority: 'medium', criImpact: 7 },
  { skill: 'TypeScript', priority: 'medium', criImpact: 8 },
];

export const QUERY_KEYS = {
  SKILL_GAPS: (userId?: string) => ['skill-gaps', userId] as const,
};