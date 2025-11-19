/**
 * Career path and program mapping types
 */

export interface CareerPathProgram {
  id: string;
  career_path_id: string;
  program_id: string;
  anchor_school: string;
  strength: number;
  path_type: 'degree' | 'bootcamp' | 'cert' | 'apprenticeship';
  region_code: string | null;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerPath {
  id: string;
  title: string;
  slug: string | null;
  description?: string;
  summary?: string;
  industry?: string;
  level?: string;
  average_salary?: number | null;
  baseline_salary?: number | null;
  created_at: string;
  updated_at: string;
}
