-- Create resume_events table for analytics tracking
CREATE TABLE public.resume_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for better query performance
CREATE INDEX idx_resume_events_user_id ON public.resume_events(user_id);
CREATE INDEX idx_resume_events_event_type ON public.resume_events(event_type);
CREATE INDEX idx_resume_events_created_at ON public.resume_events(created_at);

-- Enable Row Level Security
ALTER TABLE public.resume_events ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics access
CREATE POLICY "Users can view their own analytics events" 
ON public.resume_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create analytics events" 
ON public.resume_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can manage all analytics events" 
ON public.resume_events 
FOR ALL 
USING (true)
WITH CHECK (true);