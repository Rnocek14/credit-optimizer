export interface Course {
  courseId: string;
  title: string;
  credits: number;
  subject: string;
}

export interface ModuleData {
  id: string;
  label: string;
  icon: string;
  description: string;
  courses: Course[];
  creditsEarned: number;
  creditsRequired: number;
  isCollapsed: boolean;
}

export interface Requirement {
  id: string;
  label: string;
  level: string;
  icon: string;
  description: string;
  minCredits: number;
  courseIds: string[];
}

export type LoadHealth = 'balanced' | 'underloaded' | 'overloaded';

export interface CreditsSummary {
  planned: number;
  required: number;
}

export interface ModulesSummary {
  total: number;
  completed: number;
  inProgress: number;
}

export interface DegreeSummary {
  degreeTitle: string;
  degreeLevel: 'bachelor' | 'associate' | 'master';
  totalCreditsRequired: number;
  totalCreditsPlanned: number;
  totalCreditsEarned: number;
  estimatedMonths: number;
  estimatedCost: number;
  warnings: string[];
}

export type DegreeStatus = 'on-track' | 'ahead' | 'behind';
