-- Create career_goals table for user career goals
CREATE TABLE public.career_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_role TEXT,
  target_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal_progress table for tracking progress steps
CREATE TABLE public.goal_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  course_id UUID REFERENCES public.recommended_courses(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for career_goals
CREATE POLICY "Users can view their own goals" 
ON public.career_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" 
ON public.career_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.career_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.career_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for goal_progress
CREATE POLICY "Users can view progress for their own goals" 
ON public.goal_progress 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.career_goals 
  WHERE career_goals.id = goal_progress.goal_id 
  AND career_goals.user_id = auth.uid()
));

CREATE POLICY "Users can create progress for their own goals" 
ON public.goal_progress 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.career_goals 
  WHERE career_goals.id = goal_progress.goal_id 
  AND career_goals.user_id = auth.uid()
));

CREATE POLICY "Users can update progress for their own goals" 
ON public.goal_progress 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.career_goals 
  WHERE career_goals.id = goal_progress.goal_id 
  AND career_goals.user_id = auth.uid()
));

CREATE POLICY "Users can delete progress for their own goals" 
ON public.goal_progress 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.career_goals 
  WHERE career_goals.id = goal_progress.goal_id 
  AND career_goals.user_id = auth.uid()
));

-- Service role can manage all goals and progress
CREATE POLICY "Service role can manage all goals" 
ON public.career_goals 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage all progress" 
ON public.goal_progress 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_career_goals_updated_at
BEFORE UPDATE ON public.career_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goal_progress_updated_at
BEFORE UPDATE ON public.goal_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_career_goals_user_id ON public.career_goals(user_id);
CREATE INDEX idx_career_goals_active ON public.career_goals(active);
CREATE INDEX idx_goal_progress_goal_id ON public.goal_progress(goal_id);
CREATE INDEX idx_goal_progress_completed ON public.goal_progress(completed);