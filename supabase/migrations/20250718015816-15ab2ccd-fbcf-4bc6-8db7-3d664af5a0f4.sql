-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  experience_level TEXT,
  role_title TEXT,
  industry TEXT,
  skills TEXT[],
  education TEXT,
  years_experience INTEGER,
  career_goals TEXT,
  interests TEXT[],
  learning_style TEXT,
  availability TEXT,
  location TEXT,
  willing_to_relocate BOOLEAN DEFAULT false,
  salary_expectations INTEGER,
  work_preferences TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create career_tracks table
CREATE TABLE public.career_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  growth_potential TEXT,
  time_to_proficiency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roadmap_steps table
CREATE TABLE public.roadmap_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  timeline TEXT,
  priority TEXT,
  estimated_duration TEXT,
  prerequisites TEXT[],
  success_metrics TEXT,
  order_index INTEGER,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_steps ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles (allow service role for testing)
CREATE POLICY "Allow service role access to profiles" 
ON public.profiles 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create policies for career_tracks (allow service role)
CREATE POLICY "Allow service role access to career_tracks" 
ON public.career_tracks 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create policies for roadmap_steps (allow service role)
CREATE POLICY "Allow service role access to roadmap_steps" 
ON public.roadmap_steps 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();