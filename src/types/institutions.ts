export interface Institution {
  id: string;
  name: string;
  type: 'university' | 'bootcamp' | 'online_platform' | 'employer' | 'certification_body';
  description?: string;
  website_url?: string;
  logo_url?: string;
  location?: string;
  accreditation_level?: string;
  established_year?: number;
  reputation_score: number;
  verification_status: 'pending' | 'verified' | 'premium';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  institution_id?: string;
  name: string;
  title?: string;
  bio?: string;
  specializations: string[];
  profile_image_url?: string;
  experience_years?: number;
  average_rating: number;
  total_reviews: number;
  outcome_score: number;
  response_rate: number;
  credentials: any[];
  social_links: Record<string, any>;
  verification_status: 'pending' | 'verified' | 'expert';
  created_at: string;
  updated_at: string;
  institution?: Institution;
}

export interface UserTeacherRating {
  id: string;
  user_id: string;
  teacher_id: string;
  rating: number;
  review?: string;
  course_id?: string;
  completion_status?: 'completed' | 'in_progress' | 'dropped';
  would_recommend?: boolean;
  tags: string[];
  helpful_votes: number;
  created_at: string;
  updated_at: string;
  teacher?: Teacher;
}

export interface EnhancedTranscript {
  id?: string;
  title: string;
  skill_tags?: string[];
  cri_score?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | string;
  instructor?: string;
  created_at: string;
  user_id?: string;
  use_in_resume?: boolean;
  grade?: string;
  description?: string;
  // Multi-institution extensions
  institution_id?: string;
  teacher_id?: string;
  track_ids: string[];
  verification_status: 'self_reported' | 'institution_verified' | 'mentor_verified';
  institution_grade?: string;
  credits_earned?: number;
  course_url?: string;
  institution?: Institution;
  teacher?: Teacher;
}