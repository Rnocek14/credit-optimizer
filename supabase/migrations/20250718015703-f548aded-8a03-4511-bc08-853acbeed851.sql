-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  experience_level TEXT,
  current_role TEXT,
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

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for career_tracks
CREATE POLICY "Users can view their own career tracks" 
ON public.career_tracks 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.profiles WHERE auth.uid() = user_id));

CREATE POLICY "Service can create career tracks" 
ON public.career_tracks 
FOR INSERT 
WITH CHECK (true);

-- Create policies for roadmap_steps
CREATE POLICY "Users can view their own roadmap steps" 
ON public.roadmap_steps 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.profiles WHERE auth.uid() = user_id));

CREATE POLICY "Users can update their own roadmap steps" 
ON public.roadmap_steps 
FOR UPDATE 
USING (user_id IN (SELECT id FROM public.profiles WHERE auth.uid() = user_id));

CREATE POLICY "Service can create roadmap steps" 
ON public.roadmap_steps 
FOR INSERT 
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

-- Create trigger for profile creation automation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Call the signup automation edge function
  PERFORM
    net.http_post(
      url := 'https://vzpissitddpunkpythsb.supabase.co/functions/v1/signup-automation',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon_key' || '"}',
      body := json_build_object(
        'type', 'INSERT',
        'table', 'profiles',
        'record', row_to_json(NEW)
      )::text
    );
  RETURN NEW;
END;
$$;

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create trigger to call signup automation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();