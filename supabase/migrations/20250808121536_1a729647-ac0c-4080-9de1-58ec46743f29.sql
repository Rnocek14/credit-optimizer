-- Performance indexes for the Course Intelligence & Educator Reputation Engine

-- Core course table indexes
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_platform ON public.courses(platform);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON public.courses(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_courses_verification ON public.courses(verification_status);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);

-- Course intelligence mappings and scores
CREATE INDEX IF NOT EXISTS idx_course_skill_mappings_course ON public.course_skill_mappings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_cri_scores_course ON public.course_cri_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_course_difficulty_ratings_course ON public.course_difficulty_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_prestige ON public.instructor_profiles(prestige_tier);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_verification ON public.instructor_profiles(verification_status);

-- User course ratings for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_course_ratings_course ON public.user_course_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_ratings_user ON public.user_course_ratings(user_id);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_courses_active_platform ON public.courses(is_active, platform);
CREATE INDEX IF NOT EXISTS idx_courses_active_difficulty ON public.courses(is_active, difficulty_level);
CREATE INDEX IF NOT EXISTS idx_courses_active_verification ON public.courses(is_active, verification_status);

-- CRI score filtering
CREATE INDEX IF NOT EXISTS idx_course_cri_overall_score ON public.course_cri_scores(overall_cri_score);

-- Instructor prestige for enhanced filtering
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_prestige_rating ON public.instructor_profiles(prestige_tier, average_rating);

-- Performance comments
COMMENT ON INDEX idx_courses_active IS 'Primary filter for active courses';
COMMENT ON INDEX idx_course_cri_scores_course IS 'Fast lookup for CRI scores by course';
COMMENT ON INDEX idx_instructor_profiles_prestige IS 'Enhanced filtering by instructor prestige tier';