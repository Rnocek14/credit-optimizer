-- Create tables for mentor path management functionality

-- Table for tracking mentor path integrations
CREATE TABLE public.mentor_path_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  course_id UUID NOT NULL,
  integration_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking mentor path curations
CREATE TABLE public.mentor_path_curations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  path_id UUID NOT NULL,
  curation_type TEXT NOT NULL,
  changes_made JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_path_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_path_curations ENABLE ROW LEVEL SECURITY;

-- Create policies for mentor_path_integrations
CREATE POLICY "Mentors can view their own path integrations" 
ON public.mentor_path_integrations 
FOR SELECT 
USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can create their own path integrations" 
ON public.mentor_path_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Service role can manage all path integrations" 
ON public.mentor_path_integrations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for mentor_path_curations
CREATE POLICY "Mentors can view their own path curations" 
ON public.mentor_path_curations 
FOR SELECT 
USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can create their own path curations" 
ON public.mentor_path_curations 
FOR INSERT 
WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Service role can manage all path curations" 
ON public.mentor_path_curations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add mentor_validation_status to maya_learning_paths if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'maya_learning_paths' 
                   AND column_name = 'mentor_validation_status') THEN
        ALTER TABLE public.maya_learning_paths 
        ADD COLUMN mentor_validation_status TEXT DEFAULT NULL;
    END IF;
END $$;