-- Create course submissions table for educator uploads
CREATE TABLE public.course_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  duration_hours INTEGER,
  difficulty TEXT,
  cost NUMERIC DEFAULT 0,
  skill_tags TEXT[] DEFAULT '{}',
  instructor_name TEXT,
  instructor_rating NUMERIC,
  has_projects BOOLEAN DEFAULT false,
  cri_score NUMERIC,
  cri_breakdown JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own course submissions" 
ON public.course_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own course submissions" 
ON public.course_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending submissions" 
ON public.course_submissions 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Service role can manage all submissions" 
ON public.course_submissions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create educator profiles table
CREATE TABLE public.educator_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  expertise_areas TEXT[] DEFAULT '{}',
  average_cri_score NUMERIC DEFAULT 0,
  total_courses INTEGER DEFAULT 0,
  verified_educator BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for educator profiles
ALTER TABLE public.educator_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for educator profiles
CREATE POLICY "Anyone can view educator profiles" 
ON public.educator_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own educator profile" 
ON public.educator_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own educator profile" 
ON public.educator_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all educator profiles" 
ON public.educator_profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_course_submissions_updated_at
BEFORE UPDATE ON public.course_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_educator_profiles_updated_at
BEFORE UPDATE ON public.educator_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();