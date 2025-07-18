-- Create career_paths table for foundational career information
CREATE TABLE public.career_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  industry TEXT,
  level TEXT,
  average_salary INTEGER,
  growth_outlook TEXT,
  key_skills TEXT[],
  education_required TEXT,
  certifications TEXT[],
  common_entry_roles TEXT[],
  advanced_roles TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;

-- Create policies - allow read access to authenticated users, full access to service role
CREATE POLICY "Authenticated users can view career paths" 
ON public.career_paths 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow service role access to career_paths" 
ON public.career_paths 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_career_paths_updated_at
  BEFORE UPDATE ON public.career_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();