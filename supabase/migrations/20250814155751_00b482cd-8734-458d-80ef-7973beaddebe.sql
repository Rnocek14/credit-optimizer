-- Create saved_plan_items table for cross-hub integration
CREATE TABLE public.saved_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'career_path', 'mentor', 'skill', 'project')),
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  estimated_time_to_complete TEXT,
  skill_tags TEXT[],
  added_from_hub TEXT NOT NULL DEFAULT 'discover',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_plan_items ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_plan_items
CREATE POLICY "Users can view their own saved plan items" 
ON public.saved_plan_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved plan items" 
ON public.saved_plan_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved plan items" 
ON public.saved_plan_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved plan items" 
ON public.saved_plan_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_saved_plan_items_user_status ON public.saved_plan_items(user_id, status);
CREATE INDEX idx_saved_plan_items_type ON public.saved_plan_items(item_type);
CREATE INDEX idx_saved_plan_items_priority ON public.saved_plan_items(priority, created_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_plan_items_updated_at
BEFORE UPDATE ON public.saved_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_achievements table for XP and milestone tracking
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  milestone_id UUID,
  goal_id UUID,
  course_id TEXT,
  xp_awarded INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for achievements
CREATE INDEX idx_user_achievements_user_type ON public.user_achievements(user_id, achievement_type);
CREATE INDEX idx_user_achievements_created ON public.user_achievements(created_at DESC);