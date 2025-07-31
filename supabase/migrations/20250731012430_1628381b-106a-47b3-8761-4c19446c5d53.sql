-- Create course progress tracking table
CREATE TABLE public.course_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused')),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  time_spent_hours NUMERIC DEFAULT 0,
  xp_awarded INTEGER DEFAULT 0,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Create learning milestones table for tracking achievements
CREATE TABLE public.learning_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  milestone_type TEXT NOT NULL,
  milestone_data JSONB NOT NULL DEFAULT '{}',
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on course_progress
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_progress
CREATE POLICY "Users can view their own course progress" 
ON public.course_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own course progress" 
ON public.course_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own course progress" 
ON public.course_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all course progress" 
ON public.course_progress 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Enable RLS on learning_milestones
ALTER TABLE public.learning_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_milestones
CREATE POLICY "Users can view their own learning milestones" 
ON public.learning_milestones 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning milestones" 
ON public.learning_milestones 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all learning milestones" 
ON public.learning_milestones 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger to update updated_at column
CREATE TRIGGER update_course_progress_updated_at
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to start course progress
CREATE OR REPLACE FUNCTION public.start_course_progress(
  user_id_param UUID,
  course_id_param UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  progress_id UUID;
BEGIN
  -- Security: Only allow authenticated users to start their own progress
  IF auth.uid() IS NULL OR auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Insufficient permissions to start course progress';
  END IF;
  
  -- Insert or update course progress
  INSERT INTO public.course_progress (user_id, course_id, status, started_at, last_accessed_at)
  VALUES (user_id_param, course_id_param, 'in_progress', now(), now())
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET 
    status = CASE 
      WHEN course_progress.status = 'not_started' THEN 'in_progress'
      ELSE course_progress.status
    END,
    started_at = CASE 
      WHEN course_progress.started_at IS NULL THEN now()
      ELSE course_progress.started_at
    END,
    last_accessed_at = now(),
    updated_at = now()
  RETURNING id INTO progress_id;
  
  -- Award XP for starting course (if first time)
  IF (SELECT started_at FROM public.course_progress WHERE id = progress_id) = now() THEN
    PERFORM public.award_xp(user_id_param, 5, 'COURSE_STARTED', 'Started learning a new course', course_id_param);
  END IF;
  
  RETURN progress_id;
END;
$$;

-- Create function to complete course progress
CREATE OR REPLACE FUNCTION public.complete_course_progress(
  user_id_param UUID,
  course_id_param UUID,
  completion_notes_param TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  progress_id UUID;
  was_already_completed BOOLEAN;
BEGIN
  -- Security: Only allow authenticated users to complete their own progress
  IF auth.uid() IS NULL OR auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Insufficient permissions to complete course progress';
  END IF;
  
  -- Check if already completed
  SELECT (status = 'completed') INTO was_already_completed
  FROM public.course_progress 
  WHERE user_id = user_id_param AND course_id = course_id_param;
  
  -- Update course progress to completed
  INSERT INTO public.course_progress (user_id, course_id, status, started_at, completed_at, progress_percentage, completion_notes)
  VALUES (user_id_param, course_id_param, 'completed', now(), now(), 100, completion_notes_param)
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET 
    status = 'completed',
    completed_at = now(),
    progress_percentage = 100,
    completion_notes = completion_notes_param,
    updated_at = now()
  RETURNING id INTO progress_id;
  
  -- Award XP for completing course (if not already completed)
  IF NOT COALESCE(was_already_completed, false) THEN
    PERFORM public.award_xp(user_id_param, 50, 'COURSE_COMPLETED', 'Completed a course', course_id_param);
    
    -- Create learning milestone
    INSERT INTO public.learning_milestones (user_id, milestone_type, milestone_data, xp_awarded)
    VALUES (
      user_id_param, 
      'course_completion', 
      jsonb_build_object('course_id', course_id_param, 'completion_notes', completion_notes_param),
      50
    );
  END IF;
  
  RETURN progress_id;
END;
$$;