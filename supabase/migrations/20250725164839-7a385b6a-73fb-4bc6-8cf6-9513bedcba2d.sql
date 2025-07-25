-- Create table for tracking user insight interactions (feedback loop)
CREATE TABLE public.user_insight_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_id TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'opportunity', 'risk', 'trend', 'recommendation'
  action_taken TEXT, -- 'clicked', 'analyzed', 'set_alert', 'dismissed'
  career_path TEXT,
  location TEXT,
  confidence_score NUMERIC,
  was_helpful BOOLEAN DEFAULT NULL,
  feedback_rating INTEGER, -- 1-5 rating
  feedback_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_insight_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own insight interactions" 
ON public.user_insight_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own insight interactions" 
ON public.user_insight_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own insight interactions" 
ON public.user_insight_interactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all insight interactions" 
ON public.user_insight_interactions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_user_insight_interactions_user_id ON public.user_insight_interactions(user_id);
CREATE INDEX idx_user_insight_interactions_created_at ON public.user_insight_interactions(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_user_insight_interactions_updated_at
BEFORE UPDATE ON public.user_insight_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();