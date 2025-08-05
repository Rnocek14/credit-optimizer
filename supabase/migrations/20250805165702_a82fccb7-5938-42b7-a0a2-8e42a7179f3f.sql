-- Create maya_learning_paths table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.maya_learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_name TEXT NOT NULL,
  path_description TEXT,
  target_career TEXT NOT NULL,
  skill_level TEXT NOT NULL DEFAULT 'beginner',
  estimated_duration_weeks INTEGER DEFAULT 12,
  average_outcome_score NUMERIC DEFAULT 0.0,
  completion_rate NUMERIC DEFAULT 0.0,
  market_demand_score NUMERIC DEFAULT 0.0,
  ai_confidence NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentor_course_curations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mentor_course_curations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  course_id UUID NOT NULL,
  endorsement_level TEXT NOT NULL DEFAULT 'recommended',
  expertise_score NUMERIC DEFAULT 0.0,
  mentor_notes TEXT,
  skill_tags_added TEXT[] DEFAULT '{}',
  roi_assessment NUMERIC DEFAULT 0.0,
  outcome_prediction TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'maya_learning_paths' AND rowsecurity = true) THEN
    ALTER TABLE public.maya_learning_paths ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'mentor_course_curations' AND rowsecurity = true) THEN
    ALTER TABLE public.mentor_course_curations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;