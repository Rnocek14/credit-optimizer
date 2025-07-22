-- Create user_step_progress table
CREATE TABLE IF NOT EXISTS public.user_step_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  step_id UUID REFERENCES public.career_steps(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('locked', 'in_progress', 'complete')) DEFAULT 'locked',
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, step_id)
);

-- Enable RLS
ALTER TABLE public.user_step_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own step progress"
ON public.user_step_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own step progress"
ON public.user_step_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own step progress"
ON public.user_step_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own step progress"
ON public.user_step_progress
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all step progress"
ON public.user_step_progress
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_user_step_progress_updated_at
BEFORE UPDATE ON public.user_step_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();