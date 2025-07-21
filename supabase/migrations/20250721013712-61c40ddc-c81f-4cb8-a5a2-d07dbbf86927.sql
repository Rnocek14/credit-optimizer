-- Create milestone_plans table for storing user's long-term plans
CREATE TABLE public.milestone_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.milestone_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for milestone_plans
CREATE POLICY "Users can create their own milestone plans" 
ON public.milestone_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own milestone plans" 
ON public.milestone_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestone plans" 
ON public.milestone_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own milestone plans" 
ON public.milestone_plans 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all milestone plans" 
ON public.milestone_plans 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_milestone_plans_updated_at
BEFORE UPDATE ON public.milestone_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_milestone_plans_user_id ON public.milestone_plans(user_id);
CREATE INDEX idx_milestone_plans_status ON public.milestone_plans(status);