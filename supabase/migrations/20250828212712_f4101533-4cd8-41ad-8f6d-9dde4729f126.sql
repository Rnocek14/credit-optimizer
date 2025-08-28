-- Phase 1: Database Schema Enhancement for Multi-Track Career Planning Engine

-- Add track_id FK to tables that need track-scoped data
ALTER TABLE ai_resume_drafts 
ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES career_tracks(id) ON DELETE CASCADE;

ALTER TABLE career_goals 
ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES career_tracks(id) ON DELETE SET NULL;

ALTER TABLE course_progress 
ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES career_tracks(id) ON DELETE SET NULL;

ALTER TABLE learning_milestones 
ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES career_tracks(id) ON DELETE SET NULL;

-- Create course intelligence enhancement tables
CREATE TABLE IF NOT EXISTS course_intelligence_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  cri_score numeric DEFAULT 0,
  difficulty_rating numeric DEFAULT 0,
  instructor_rating numeric DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  drop_rate numeric DEFAULT 0,
  validated_at timestamp with time zone,
  validated_by uuid,
  mentor_validation_status text DEFAULT 'pending',
  intelligence_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create instructor ratings table
CREATE TABLE IF NOT EXISTS instructor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating numeric NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  verified_completion boolean DEFAULT false,
  instructor_rebuttal text,
  rebuttal_at timestamp with time zone,
  moderation_status text DEFAULT 'pending',
  moderation_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(instructor_id, course_id, user_id)
);

-- Create instructor prestige tiers table
CREATE TABLE IF NOT EXISTS instructor_prestige_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL UNIQUE,
  prestige_tier text NOT NULL DEFAULT 'bronze',
  avg_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  verified_courses integer DEFAULT 0,
  mentor_score numeric DEFAULT 0,
  tier_updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create mentor course feedback table
CREATE TABLE IF NOT EXISTS mentor_course_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  mentor_id uuid NOT NULL,
  student_id uuid NOT NULL,
  track_id uuid REFERENCES career_tracks(id) ON DELETE SET NULL,
  course_quality_rating integer CHECK (course_quality_rating >= 1 AND course_quality_rating <= 5),
  learning_outcome_rating integer CHECK (learning_outcome_rating >= 1 AND learning_outcome_rating <= 5),
  feedback_text text,
  completion_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create track course usage mapping for transcript functionality
CREATE TABLE IF NOT EXISTS track_course_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES career_tracks(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  progress_notes text,
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, track_id, course_id)
);

-- Add RLS policies for track-scoped data
ALTER TABLE ai_resume_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_intelligence_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_prestige_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_course_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_course_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course intelligence pipeline
CREATE POLICY "Users can view course intelligence for their courses" ON course_intelligence_pipeline
FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM course_progress WHERE course_progress.course_id = course_intelligence_pipeline.course_id AND course_progress.user_id = auth.uid())
);

CREATE POLICY "Service role can manage course intelligence" ON course_intelligence_pipeline
FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for instructor ratings
CREATE POLICY "Users can view instructor ratings" ON instructor_ratings
FOR SELECT USING (true);

CREATE POLICY "Users can create ratings for completed courses" ON instructor_ratings
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  verified_completion = true
);

CREATE POLICY "Users can update their own ratings" ON instructor_ratings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage instructor ratings" ON instructor_ratings
FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for instructor prestige tiers
CREATE POLICY "Anyone can view instructor prestige tiers" ON instructor_prestige_tiers
FOR SELECT USING (true);

CREATE POLICY "Service role can manage prestige tiers" ON instructor_prestige_tiers
FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for mentor course feedback
CREATE POLICY "Users can view their own mentor feedback" ON mentor_course_feedback
FOR SELECT USING (student_id = auth.uid() OR mentor_id = auth.uid());

CREATE POLICY "Mentors can create feedback for their students" ON mentor_course_feedback
FOR INSERT WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Users can update their own mentor feedback" ON mentor_course_feedback
FOR UPDATE USING (mentor_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Service role can manage mentor feedback" ON mentor_course_feedback
FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for track course usage
CREATE POLICY "Users can manage their own track course usage" ON track_course_usage
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage track course usage" ON track_course_usage
FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_intelligence_course_id ON course_intelligence_pipeline(course_id);
CREATE INDEX IF NOT EXISTS idx_course_intelligence_user_id ON course_intelligence_pipeline(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_ratings_instructor_id ON instructor_ratings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_ratings_course_id ON instructor_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_track_course_usage_track_id ON track_course_usage(track_id);
CREATE INDEX IF NOT EXISTS idx_track_course_usage_user_id ON track_course_usage(user_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_intelligence_updated_at
    BEFORE UPDATE ON course_intelligence_pipeline
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructor_ratings_updated_at
    BEFORE UPDATE ON instructor_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructor_prestige_updated_at
    BEFORE UPDATE ON instructor_prestige_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_feedback_updated_at
    BEFORE UPDATE ON mentor_course_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();