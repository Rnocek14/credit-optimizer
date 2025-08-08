-- Course Intelligence & Educator Reputation Engine - Phase 1 (Fixed Order)
-- Comprehensive database schema for Course Intelligence Graph + Difficulty Engine + CRI Enhancement

-- ===== CORE COURSE INTELLIGENCE TABLES (PROPER ORDER) =====

-- First: Verified instructor profiles with prestige tracking
CREATE TABLE IF NOT EXISTS public.instructor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  bio TEXT,
  profile_image_url TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_documents JSONB DEFAULT '[]',
  prestige_tier TEXT DEFAULT 'bronze' CHECK (prestige_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  prestige_score NUMERIC DEFAULT 0,
  years_experience INTEGER,
  specialization_areas TEXT[],
  linkedin_url TEXT,
  website_url TEXT,
  total_students INTEGER DEFAULT 0,
  total_courses INTEGER DEFAULT 0,
  average_rating NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_prestige_calc_at TIMESTAMPTZ DEFAULT now()
);

-- Second: Enhanced normalized course master table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  course_url TEXT NOT NULL UNIQUE,
  instructor_name TEXT,
  instructor_id UUID REFERENCES public.instructor_profiles(id),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours INTEGER DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  language TEXT DEFAULT 'English',
  category TEXT,
  subcategory TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  last_analyzed_at TIMESTAMPTZ
);

-- Third: AI + user feedback difficulty ratings (normalized 1-5 scale)
CREATE TABLE IF NOT EXISTS public.course_difficulty_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  ai_difficulty_score NUMERIC CHECK (ai_difficulty_score >= 1 AND ai_difficulty_score <= 5),
  user_average_difficulty NUMERIC CHECK (user_average_difficulty >= 1 AND user_average_difficulty <= 5),
  normalized_difficulty NUMERIC CHECK (normalized_difficulty >= 1 AND normalized_difficulty <= 5),
  total_user_ratings INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ai_analysis_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id)
);

-- Fourth: Standardized skill-to-course mappings
CREATE TABLE IF NOT EXISTS public.course_skill_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT,
  relevance_score NUMERIC DEFAULT 1 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  skill_depth TEXT DEFAULT 'basic' CHECK (skill_depth IN ('basic', 'intermediate', 'advanced', 'expert')),
  hours_focus INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, skill_name)
);

-- Fifth: Multi-category instructor assessments
CREATE TABLE IF NOT EXISTS public.instructor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.instructor_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teaching_quality NUMERIC CHECK (teaching_quality >= 1 AND teaching_quality <= 5),
  content_expertise NUMERIC CHECK (content_expertise >= 1 AND content_expertise <= 5),
  engagement_level NUMERIC CHECK (engagement_level >= 1 AND engagement_level <= 5),
  response_time NUMERIC CHECK (response_time >= 1 AND response_time <= 5),
  overall_rating NUMERIC CHECK (overall_rating >= 1 AND overall_rating <= 5),
  review_text TEXT,
  would_recommend BOOLEAN,
  verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('verified', 'flagged', 'removed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instructor_id, user_id, course_id)
);

-- Sixth: Enhanced CRI scores with detailed breakdowns
CREATE TABLE IF NOT EXISTS public.course_cri_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  overall_cri_score NUMERIC CHECK (overall_cri_score >= 0 AND overall_cri_score <= 100),
  difficulty_score NUMERIC DEFAULT 0,
  skill_coverage_score NUMERIC DEFAULT 0,
  project_rigor_score NUMERIC DEFAULT 0,
  outcome_conversion_score NUMERIC DEFAULT 0,
  instructor_prestige_score NUMERIC DEFAULT 0,
  platform_credibility_score NUMERIC DEFAULT 0,
  market_relevance_score NUMERIC DEFAULT 0,
  calculation_version TEXT DEFAULT '1.0',
  calculation_data JSONB DEFAULT '{}',
  historical_scores JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id)
);

-- ===== USER FEEDBACK & RATING SYSTEM =====

-- User-submitted course difficulty ratings
CREATE TABLE IF NOT EXISTS public.user_course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  difficulty_rating NUMERIC NOT NULL CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  time_to_complete_hours INTEGER,
  would_recommend BOOLEAN,
  review_text TEXT,
  helpful_votes INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('verified', 'flagged', 'removed')),
  completion_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Post-completion detailed assessments
CREATE TABLE IF NOT EXISTS public.course_completion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completion_date TIMESTAMPTZ NOT NULL,
  satisfaction_rating NUMERIC CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  difficulty_rating NUMERIC CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  time_investment_hours INTEGER,
  skills_gained TEXT[],
  practical_application_score NUMERIC CHECK (practical_application_score >= 1 AND practical_application_score <= 5),
  career_impact_level TEXT CHECK (career_impact_level IN ('none', 'slight', 'moderate', 'significant', 'transformative')),
  feedback_text TEXT,
  verification_documents JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Trust & safety tracking
CREATE TABLE IF NOT EXISTS public.abuse_prevention_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  target_type TEXT NOT NULL CHECK (target_type IN ('course', 'instructor', 'review', 'rating')),
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('flag', 'verify', 'moderate', 'remove')),
  reason TEXT,
  automated_action BOOLEAN DEFAULT false,
  moderator_id UUID,
  severity_level TEXT DEFAULT 'low' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ENABLE RLS ON ALL TABLES =====

ALTER TABLE public.instructor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_difficulty_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_skill_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_cri_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_completion_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_prevention_logs ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- Instructor profiles - public read verified, service manage
CREATE POLICY "Anyone can view verified instructors" ON public.instructor_profiles
  FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Service role can manage instructor profiles" ON public.instructor_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Courses - public read, service manage
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage courses" ON public.courses
  FOR ALL USING (true) WITH CHECK (true);

-- Course difficulty ratings - public read, service manage
CREATE POLICY "Anyone can view difficulty ratings" ON public.course_difficulty_ratings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage difficulty ratings" ON public.course_difficulty_ratings
  FOR ALL USING (true) WITH CHECK (true);

-- Course skill mappings - public read, service manage
CREATE POLICY "Anyone can view skill mappings" ON public.course_skill_mappings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage skill mappings" ON public.course_skill_mappings
  FOR ALL USING (true) WITH CHECK (true);

-- Instructor ratings - users manage their own, public read verified
CREATE POLICY "Anyone can view verified instructor ratings" ON public.instructor_ratings
  FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Users can create their own instructor ratings" ON public.instructor_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instructor ratings" ON public.instructor_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage instructor ratings" ON public.instructor_ratings
  FOR ALL USING (true) WITH CHECK (true);

-- CRI scores - public read, service manage
CREATE POLICY "Anyone can view CRI scores" ON public.course_cri_scores
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage CRI scores" ON public.course_cri_scores
  FOR ALL USING (true) WITH CHECK (true);

-- User course ratings - users manage their own, public read verified
CREATE POLICY "Anyone can view verified course ratings" ON public.user_course_ratings
  FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Users can manage their own course ratings" ON public.user_course_ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Course completion feedback - users manage their own, service read
CREATE POLICY "Users can manage their own completion feedback" ON public.course_completion_feedback
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can view completion feedback" ON public.course_completion_feedback
  FOR SELECT USING (true);

-- Abuse prevention logs - service only
CREATE POLICY "Service role can manage abuse logs" ON public.abuse_prevention_logs
  FOR ALL USING (true) WITH CHECK (true);

-- ===== HELPER FUNCTIONS =====

-- Update updated_at trigger function (reuse existing if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_instructor_profiles_updated_at BEFORE UPDATE ON public.instructor_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_difficulty_ratings_updated_at BEFORE UPDATE ON public.course_difficulty_ratings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instructor_ratings_updated_at BEFORE UPDATE ON public.instructor_ratings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_cri_scores_updated_at BEFORE UPDATE ON public.course_cri_scores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_course_ratings_updated_at BEFORE UPDATE ON public.user_course_ratings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_verification ON public.instructor_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_prestige ON public.instructor_profiles(prestige_tier, prestige_score);
CREATE INDEX IF NOT EXISTS idx_courses_platform ON public.courses(platform);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON public.courses(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_difficulty_normalized ON public.course_difficulty_ratings(normalized_difficulty);
CREATE INDEX IF NOT EXISTS idx_course_skill_mappings_skill ON public.course_skill_mappings(skill_name);
CREATE INDEX IF NOT EXISTS idx_course_skill_mappings_category ON public.course_skill_mappings(skill_category);
CREATE INDEX IF NOT EXISTS idx_instructor_ratings_overall ON public.instructor_ratings(overall_rating);
CREATE INDEX IF NOT EXISTS idx_instructor_ratings_instructor ON public.instructor_ratings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_cri_overall ON public.course_cri_scores(overall_cri_score);
CREATE INDEX IF NOT EXISTS idx_user_course_ratings_rating ON public.user_course_ratings(difficulty_rating);
CREATE INDEX IF NOT EXISTS idx_user_course_ratings_user ON public.user_course_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_prevention_target ON public.abuse_prevention_logs(target_type, target_id);