-- Phase 3.3: Gamification & Social Learning Enhancement

-- Learning Streaks Table
CREATE TABLE public.learning_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  streak_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, session_based
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bonus_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own learning streaks" 
ON public.learning_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning streaks" 
ON public.learning_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning streaks" 
ON public.learning_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all learning streaks" 
ON public.learning_streaks 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Celebration Moments Table
CREATE TABLE public.celebration_moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  celebration_type TEXT NOT NULL, -- milestone, streak, badge, level_up, intervention_response
  trigger_data JSONB NOT NULL DEFAULT '{}',
  celebration_data JSONB NOT NULL DEFAULT '{}',
  displayed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.celebration_moments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own celebration moments" 
ON public.celebration_moments 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all celebration moments" 
ON public.celebration_moments 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Learning Social Actions Table (Optional Social Layer)
CREATE TABLE public.learning_social_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- like, encourage, share, comment
  target_type TEXT NOT NULL, -- achievement, milestone, streak, session
  target_id UUID NOT NULL,
  action_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_social_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own social actions" 
ON public.learning_social_actions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view social actions on their content" 
ON public.learning_social_actions 
FOR SELECT 
USING (auth.uid() = target_user_id OR auth.uid() = user_id);

CREATE POLICY "Service role can manage all social actions" 
ON public.learning_social_actions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Gamification Metrics Table for Analytics
CREATE TABLE public.gamification_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- daily_xp, streak_bonus, social_engagement, maya_collaboration
  metric_value NUMERIC NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gamification_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own gamification metrics" 
ON public.gamification_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all gamification metrics" 
ON public.gamification_metrics 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Enhanced XP System Functions

-- Calculate dynamic XP multiplier based on streaks, difficulty, and engagement
CREATE OR REPLACE FUNCTION public.calculate_xp_multiplier(
  user_id_param UUID,
  action_type_param TEXT,
  difficulty_level INTEGER DEFAULT 1,
  engagement_score NUMERIC DEFAULT 0.5
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_multiplier NUMERIC := 1.0;
  streak_bonus NUMERIC := 0.0;
  difficulty_bonus NUMERIC := 0.0;
  engagement_bonus NUMERIC := 0.0;
  current_streak INTEGER := 0;
BEGIN
  -- Get current daily streak
  SELECT COALESCE(ls.current_streak, 0) INTO current_streak
  FROM public.learning_streaks ls
  WHERE ls.user_id = user_id_param 
    AND ls.streak_type = 'daily'
    AND ls.last_activity_date >= CURRENT_DATE - INTERVAL '1 day';
  
  -- Streak bonus (max 50% bonus for 30+ day streak)
  IF current_streak > 0 THEN
    streak_bonus := LEAST(current_streak * 0.02, 0.5); -- 2% per day, cap at 50%
  END IF;
  
  -- Difficulty bonus (harder content = more XP)
  IF difficulty_level > 3 THEN
    difficulty_bonus := (difficulty_level - 3) * 0.25; -- 25% per difficulty level above 3
  END IF;
  
  -- Engagement bonus (high engagement = bonus XP)
  IF engagement_score > 0.7 THEN
    engagement_bonus := (engagement_score - 0.7) * 0.5; -- Up to 15% for perfect engagement
  END IF;
  
  -- Special action bonuses
  CASE action_type_param
    WHEN 'INTERVENTION_RESPONSE' THEN base_multiplier := base_multiplier + 0.5; -- 50% bonus for responding to Maya
    WHEN 'COURSE_COMPLETED' THEN base_multiplier := base_multiplier + 0.3; -- 30% bonus for completing courses
    WHEN 'STREAK_MILESTONE' THEN base_multiplier := base_multiplier + 1.0; -- 100% bonus for streak milestones
    ELSE -- No additional bonus
  END CASE;
  
  RETURN base_multiplier + streak_bonus + difficulty_bonus + engagement_bonus;
END;
$$;

-- Update learning streak
CREATE OR REPLACE FUNCTION public.update_learning_streak(
  user_id_param UUID,
  activity_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_streak_record RECORD;
  new_streak INTEGER := 1;
  is_streak_broken BOOLEAN := false;
  streak_milestone_reached BOOLEAN := false;
  result JSONB;
BEGIN
  -- Get current streak record
  SELECT * INTO current_streak_record
  FROM public.learning_streaks
  WHERE user_id = user_id_param AND streak_type = 'daily';
  
  IF current_streak_record IS NULL THEN
    -- Create new streak record
    INSERT INTO public.learning_streaks (user_id, current_streak, longest_streak, last_activity_date, streak_start_date)
    VALUES (user_id_param, 1, 1, activity_date, activity_date);
    new_streak := 1;
  ELSE
    -- Check if streak continues
    IF current_streak_record.last_activity_date = activity_date - INTERVAL '1 day' THEN
      -- Streak continues
      new_streak := current_streak_record.current_streak + 1;
      
      -- Check for milestones (every 7 days)
      IF new_streak % 7 = 0 THEN
        streak_milestone_reached := true;
      END IF;
      
    ELSIF current_streak_record.last_activity_date < activity_date - INTERVAL '1 day' THEN
      -- Streak broken
      is_streak_broken := true;
      new_streak := 1;
    ELSE
      -- Same day activity - no change
      new_streak := current_streak_record.current_streak;
    END IF;
    
    -- Update streak record
    UPDATE public.learning_streaks
    SET 
      current_streak = new_streak,
      longest_streak = GREATEST(longest_streak, new_streak),
      last_activity_date = activity_date,
      streak_start_date = CASE 
        WHEN is_streak_broken THEN activity_date
        ELSE streak_start_date
      END,
      updated_at = now()
    WHERE user_id = user_id_param AND streak_type = 'daily';
  END IF;
  
  -- Create celebration moment for milestones
  IF streak_milestone_reached THEN
    INSERT INTO public.celebration_moments (user_id, celebration_type, trigger_data, celebration_data)
    VALUES (
      user_id_param,
      'streak',
      jsonb_build_object('streak_days', new_streak, 'milestone_type', 'weekly'),
      jsonb_build_object(
        'title', 'Learning Streak!',
        'message', 'You''ve maintained a ' || new_streak || '-day learning streak!',
        'emoji', '🔥',
        'confetti', true,
        'sound', 'celebration'
      )
    );
    
    -- Award bonus XP for streak milestone
    PERFORM public.award_xp(
      user_id_param,
      new_streak * 5, -- 5 XP per day in streak
      'STREAK_MILESTONE',
      'Maintained ' || new_streak || '-day learning streak',
      NULL
    );
  END IF;
  
  result := jsonb_build_object(
    'current_streak', new_streak,
    'is_streak_broken', is_streak_broken,
    'milestone_reached', streak_milestone_reached,
    'longest_streak', GREATEST(COALESCE(current_streak_record.longest_streak, 0), new_streak)
  );
  
  RETURN result;
END;
$$;

-- Create celebration moment
CREATE OR REPLACE FUNCTION public.create_celebration_moment(
  user_id_param UUID,
  celebration_type_param TEXT,
  trigger_data_param JSONB,
  celebration_data_param JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  celebration_id UUID;
BEGIN
  INSERT INTO public.celebration_moments (user_id, celebration_type, trigger_data, celebration_data)
  VALUES (user_id_param, celebration_type_param, trigger_data_param, celebration_data_param)
  RETURNING id INTO celebration_id;
  
  RETURN celebration_id;
END;
$$;

-- Add triggers for automatic updates
CREATE TRIGGER update_learning_streaks_updated_at
  BEFORE UPDATE ON public.learning_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goal_updated_at();

-- Create indexes for performance
CREATE INDEX idx_learning_streaks_user_type ON public.learning_streaks(user_id, streak_type);
CREATE INDEX idx_celebration_moments_user_displayed ON public.celebration_moments(user_id, displayed_at);
CREATE INDEX idx_learning_social_actions_target ON public.learning_social_actions(target_user_id, target_type);
CREATE INDEX idx_gamification_metrics_user_period ON public.gamification_metrics(user_id, period_start, period_end);