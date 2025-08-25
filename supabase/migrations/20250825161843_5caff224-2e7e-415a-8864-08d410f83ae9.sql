-- Create Maya Proactive Insights table
CREATE TABLE public.maya_proactive_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL DEFAULT 'recommendation', -- recommendation, alert, nudge, prediction
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  context_data JSONB NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  category TEXT NOT NULL DEFAULT 'general', -- career, learning, market, personal
  confidence_score NUMERIC NOT NULL DEFAULT 0.8,
  expires_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  acted_upon_at TIMESTAMP WITH TIME ZONE,
  feedback_rating INTEGER, -- 1-5 rating from user
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Maya Context Tracking table
CREATE TABLE public.maya_context_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  context_type TEXT NOT NULL, -- activity, completion, engagement, timing
  context_data JSONB NOT NULL DEFAULT '{}',
  tracked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.maya_proactive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maya_context_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for maya_proactive_insights
CREATE POLICY "Users can view their own Maya insights" 
ON public.maya_proactive_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Maya insights" 
ON public.maya_proactive_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all Maya insights" 
ON public.maya_proactive_insights 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for maya_context_tracking
CREATE POLICY "Users can view their own Maya context" 
ON public.maya_context_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Maya context" 
ON public.maya_context_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all Maya context" 
ON public.maya_context_tracking 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_maya_proactive_insights_user_id ON public.maya_proactive_insights(user_id);
CREATE INDEX idx_maya_proactive_insights_priority ON public.maya_proactive_insights(priority);
CREATE INDEX idx_maya_proactive_insights_expires_at ON public.maya_proactive_insights(expires_at);
CREATE INDEX idx_maya_proactive_insights_created_at ON public.maya_proactive_insights(created_at DESC);
CREATE INDEX idx_maya_context_tracking_user_id ON public.maya_context_tracking(user_id);
CREATE INDEX idx_maya_context_tracking_context_type ON public.maya_context_tracking(context_type);
CREATE INDEX idx_maya_context_tracking_tracked_at ON public.maya_context_tracking(tracked_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_maya_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_maya_proactive_insights_updated_at
BEFORE UPDATE ON public.maya_proactive_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_maya_insights_updated_at();