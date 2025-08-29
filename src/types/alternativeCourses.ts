export type Provider = 'youtube' | 'udemy' | 'coursera' | 'edx' | 'masterclass' | 'other';

export interface SkillTag {
  name?: string; // for resolved skills
  slug?: string; // when coming from graph
  weight?: number;
}

export interface AlternativeCourse {
  id: string;
  provider: Provider;
  external_id: string;
  title: string;
  description: string | null;
  url: string;
  creator_name: string | null;
  published_at: string | null;
  estimated_hours: number | null;
  difficulty: number | null; // 1-5
  cri_score: number | null;  // 0-100
  skills: SkillTag[] | null; // jsonb
  created_at?: string;
}

export interface UserAltCourseUsage {
  id: string;
  user_id?: string; // Optional since we filter by this in queries
  track_id?: string; // Optional since we filter by this in queries
  alt_course_id: string;
  note: string | null;
  created_at: string;
}

export interface AltCourseResolveResponse {
  success: boolean;
  course?: AlternativeCourse;
  cached?: boolean;
  error?: string;
}

export interface PlaylistImportResponse {
  success: boolean;
  items?: AlternativeCourse[];
  total?: number;
  mock?: boolean;
  error?: string;
}