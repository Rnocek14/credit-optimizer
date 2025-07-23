-- Create pivot_exploration_events table to track user pivot explorations
CREATE TABLE public.pivot_exploration_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_career TEXT NOT NULL,
  pivoted_career TEXT NOT NULL,
  shared_skills TEXT[] NOT NULL DEFAULT '{}',
  missing_skills TEXT[] NOT NULL DEFAULT '{}',
  roi_score NUMERIC,
  estimated_time TEXT,
  estimated_cost TEXT,
  reasoning TEXT
);

-- Enable Row Level Security
ALTER TABLE public.pivot_exploration_events ENABLE ROW LEVEL SECURITY;

-- Create policies for pivot exploration events
CREATE POLICY "Users can view their own pivot exploration events" 
ON public.pivot_exploration_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pivot exploration events" 
ON public.pivot_exploration_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all pivot exploration events" 
ON public.pivot_exploration_events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for better performance on user queries
CREATE INDEX idx_pivot_exploration_events_user_id ON public.pivot_exploration_events(user_id);
CREATE INDEX idx_pivot_exploration_events_timestamp ON public.pivot_exploration_events(timestamp);