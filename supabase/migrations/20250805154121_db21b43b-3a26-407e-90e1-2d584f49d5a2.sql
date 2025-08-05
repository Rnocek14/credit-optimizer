-- Create course curation tables for the Intelligent Learning Curation system

-- Course intelligence pipeline tracking
CREATE TABLE IF NOT EXISTS public.course_intelligence_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  pipeline_stage TEXT NOT NULL DEFAULT 'discovery', -- discovery, analysis, validation, curation
  ai_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  cri_predictions JSONB NOT NULL DEFAULT '{}'::jsonb,
  market_alignment_score NUMERIC DEFAULT 0,
  mentor_validation_status TEXT DEFAULT 'pending', -- pending, validated, rejected
  validated_by UUID REFERENCES auth.users(id),
  confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mentor course curations
CREATE TABLE IF NOT EXISTS public.mentor_course_curations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID NOT NULL,
  curation_type TEXT NOT NULL DEFAULT 'recommendation', -- recommendation, learning_path, validation
  expertise_score NUMERIC DEFAULT 0, -- Mentor's expertise in this domain
  endorsement_level TEXT DEFAULT 'neutral', -- strong, moderate, neutral, not_recommended
  mentor_notes TEXT,
  skill_tags_added TEXT[] DEFAULT '{}',
  career_path_mappings TEXT[] DEFAULT '{}',
  roi_assessment NUMERIC DEFAULT 0,
  outcome_prediction TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, course_id)
);

-- Maya-verified learning paths
CREATE TABLE IF NOT EXISTS public.maya_learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_name TEXT NOT NULL,
  path_description TEXT,
  target_career TEXT NOT NULL,
  skill_level TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced
  estimated_duration_weeks INTEGER DEFAULT 0,
  course_sequence JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of course IDs in order
  mentor_endorsements UUID[] DEFAULT '{}', -- Array of mentor IDs who endorse this path
  completion_rate NUMERIC DEFAULT 0,
  average_outcome_score NUMERIC DEFAULT 0,
  market_demand_score NUMERIC DEFAULT 0,
  ai_confidence NUMERIC DEFAULT 0,
  maya_reasoning TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course discovery queue for pipeline processing
CREATE TABLE IF NOT EXISTS public.course_discovery_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_platform TEXT NOT NULL,
  course_url TEXT NOT NULL,
  discovery_method TEXT NOT NULL DEFAULT 'api', -- api, scraping, manual
  processing_status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed
  discovery_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  priority_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.course_intelligence_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_course_curations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maya_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_discovery_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage course intelligence pipeline" 
ON public.course_intelligence_pipeline FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Mentors can manage their own curations" 
ON public.mentor_course_curations FOR ALL 
USING (auth.uid() = mentor_id) 
WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Anyone can view mentor curations" 
ON public.mentor_course_curations FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage learning paths" 
ON public.maya_learning_paths FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Users can view learning paths" 
ON public.maya_learning_paths FOR SELECT 
USING (true);

CREATE POLICY "Mentors can create learning paths" 
ON public.maya_learning_paths FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Service role can manage discovery queue" 
ON public.course_discovery_queue FOR ALL 
USING (true) 
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_intelligence_stage ON public.course_intelligence_pipeline(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_course_intelligence_course ON public.course_intelligence_pipeline(course_id);
CREATE INDEX IF NOT EXISTS idx_mentor_curations_mentor ON public.mentor_course_curations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_curations_course ON public.mentor_course_curations(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_career ON public.maya_learning_paths(target_career);
CREATE INDEX IF NOT EXISTS idx_discovery_queue_status ON public.course_discovery_queue(processing_status);