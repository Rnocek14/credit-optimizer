-- Simplified Phase 1: Core Multi-Track Schema Enhancement

-- Add track_id FK to existing tables
ALTER TABLE ai_resume_drafts 
ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES career_tracks(id) ON DELETE CASCADE;

ALTER TABLE career_goals 
ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES career_tracks(id) ON DELETE SET NULL;

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

-- Create course intelligence pipeline (simplified)
CREATE TABLE IF NOT EXISTS course_intelligence_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
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

-- Create instructor ratings (simplified)
CREATE TABLE IF NOT EXISTS instructor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating numeric NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(instructor_id, course_id, user_id)
);

-- Enable RLS
ALTER TABLE track_course_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_intelligence_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_ratings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can manage their own track course usage" ON track_course_usage
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view course intelligence" ON course_intelligence_pipeline
FOR SELECT USING (true);

CREATE POLICY "Users can view instructor ratings" ON instructor_ratings
FOR SELECT USING (true);

CREATE POLICY "Users can create their own ratings" ON instructor_ratings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role policies
CREATE POLICY "Service role can manage track usage" ON track_course_usage
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage course intelligence" ON course_intelligence_pipeline
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage instructor ratings" ON instructor_ratings
FOR ALL USING (true) WITH CHECK (true);