-- Create recommended_courses table for mentor course recommendations
CREATE TABLE public.recommended_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT,
  skill_tags TEXT[] DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  cost TEXT,
  description TEXT,
  reasoning TEXT,
  is_ai_recommended BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recommended_courses ENABLE ROW LEVEL SECURITY;

-- Create policies for mentor access
CREATE POLICY "Mentors can view all active course recommendations" 
ON public.recommended_courses 
FOR SELECT 
USING (active = true);

CREATE POLICY "Mentors can create their own course recommendations" 
ON public.recommended_courses 
FOR INSERT 
WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update their own course recommendations" 
ON public.recommended_courses 
FOR UPDATE 
USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can delete their own course recommendations" 
ON public.recommended_courses 
FOR DELETE 
USING (auth.uid() = mentor_id);

-- Service role can manage all course recommendations
CREATE POLICY "Service role can manage all course recommendations" 
ON public.recommended_courses 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recommended_courses_updated_at
BEFORE UPDATE ON public.recommended_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();