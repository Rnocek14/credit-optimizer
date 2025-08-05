-- Create maya_learning_paths table
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

-- Create mentor_course_curations table
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

-- Enable RLS
ALTER TABLE public.maya_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_course_curations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view learning paths" ON public.maya_learning_paths FOR SELECT USING (true);
CREATE POLICY "Service role can manage learning paths" ON public.maya_learning_paths FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view mentor curations" ON public.mentor_course_curations FOR SELECT USING (true);
CREATE POLICY "Service role can manage mentor curations" ON public.mentor_course_curations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Mentors can manage their own curations" ON public.mentor_course_curations FOR ALL 
  USING (auth.uid() = mentor_id) WITH CHECK (auth.uid() = mentor_id);