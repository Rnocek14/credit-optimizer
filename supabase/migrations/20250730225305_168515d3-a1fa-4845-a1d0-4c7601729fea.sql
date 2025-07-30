-- Create user CRI goals table for goal persistence
CREATE TABLE public.user_cri_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_cri INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_cri_target CHECK (target_cri >= 0 AND target_cri <= 100)
);

-- Enable RLS
ALTER TABLE public.user_cri_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own CRI goals" 
ON public.user_cri_goals 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all CRI goals" 
ON public.user_cri_goals 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_user_cri_goals_updated_at
BEFORE UPDATE ON public.user_cri_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();