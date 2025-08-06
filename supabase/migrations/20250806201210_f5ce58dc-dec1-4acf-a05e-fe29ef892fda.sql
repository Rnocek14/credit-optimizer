-- Create enhanced user profiles table for Phase 2
CREATE TABLE IF NOT EXISTS public.enhanced_user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  learning_style JSONB DEFAULT '{"visual": 25, "auditory": 25, "kinesthetic": 25, "reading": 25}'::jsonb,
  available_hours_per_week INTEGER DEFAULT 10,
  preferred_learning_times TEXT[] DEFAULT '{}',
  career_goals TEXT[] DEFAULT '{}',
  skill_assessments JSONB DEFAULT '[]'::jsonb,
  motivational_factors TEXT[] DEFAULT '{}',
  learning_preferences JSONB DEFAULT '{"projectBased": true, "theoretical": false, "practical": true, "collaborative": false, "selfPaced": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enhanced_user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own enhanced profile" 
ON public.enhanced_user_profiles 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all enhanced profiles" 
ON public.enhanced_user_profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create learning sessions table for adaptive tracking
CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  node_id TEXT NOT NULL,
  node_title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0,
  difficulty_feedback INTEGER DEFAULT 3,
  engagement_score INTEGER DEFAULT 3,
  struggled_concepts TEXT[] DEFAULT '{}',
  mastered_concepts TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own learning sessions" 
ON public.learning_sessions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all learning sessions" 
ON public.learning_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create goal learning paths table
CREATE TABLE IF NOT EXISTS public.goal_learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  path_type TEXT DEFAULT 'primary',
  path_nodes JSONB DEFAULT '[]'::jsonb,
  estimated_completion_weeks INTEGER DEFAULT 12,
  cost_estimate NUMERIC DEFAULT 0,
  difficulty_level INTEGER DEFAULT 3,
  success_rate NUMERIC DEFAULT 0.8,
  personalization_score NUMERIC DEFAULT 0.8,
  market_alignment_score NUMERIC DEFAULT 0.8,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_learning_paths ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own goal learning paths" 
ON public.goal_learning_paths 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all goal learning paths" 
ON public.goal_learning_paths 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_user_profiles_user_id ON public.enhanced_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON public.learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_start_time ON public.learning_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_goal_learning_paths_user_id ON public.goal_learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_learning_paths_goal_id ON public.goal_learning_paths(goal_id);

-- Add updated_at trigger for enhanced_user_profiles
CREATE OR REPLACE FUNCTION update_enhanced_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enhanced_user_profiles_updated_at
BEFORE UPDATE ON public.enhanced_user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_enhanced_user_profiles_updated_at();

-- Add updated_at trigger for goal_learning_paths
CREATE OR REPLACE FUNCTION update_goal_learning_paths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_goal_learning_paths_updated_at
BEFORE UPDATE ON public.goal_learning_paths
FOR EACH ROW
EXECUTE FUNCTION update_goal_learning_paths_updated_at();