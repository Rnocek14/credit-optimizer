-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  trigger_type TEXT NOT NULL,
  threshold NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table (rename existing to avoid conflicts)
DROP TABLE IF EXISTS public.user_badges_old;
ALTER TABLE public.user_badges RENAME TO user_badges_old;

CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for badges
CREATE POLICY "Anyone can view badges" 
ON public.badges 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage badges" 
ON public.badges 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS policies for user_badges
CREATE POLICY "Users can view all user badges" 
ON public.user_badges 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage user badges" 
ON public.user_badges 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert initial badge definitions
INSERT INTO public.badges (name, emoji, description, slug, trigger_type, threshold) VALUES
('Goal Setter', '🎯', 'Set your first career goal', 'goal-setter', 'goal_count', 1),
('High Achiever', '⭐', 'Achieve a CRI score of 80 or higher', 'high-achiever', 'cri_score', 80),
('Scholar', '🎓', 'Add 5 transcripts to your profile', 'scholar', 'transcript_count', 5),
('Lifelong Learner', '📚', 'Save 10 courses for learning', 'lifelong-learner', 'saved_courses_count', 10),
('Resume Master', '📄', 'Publish your first AI resume draft', 'resume-master', 'published_resume_count', 1),
('Excellence Expert', '💎', 'Achieve a readiness score of 90 or higher', 'excellence-expert', 'readiness_score', 90),
('Course Collector', '🔥', 'Save 25 courses for learning', 'course-collector', 'saved_courses_count', 25),
('Academic Star', '🌟', 'Add 10 transcripts to your profile', 'academic-star', 'transcript_count', 10);