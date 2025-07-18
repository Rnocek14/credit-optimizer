-- Add gallery inclusion and resume sharing functionality
ALTER TABLE public.profiles 
ADD COLUMN gallery_enabled boolean DEFAULT false,
ADD COLUMN gallery_featured boolean DEFAULT false;

-- Create resume sharing events table
CREATE TABLE public.resume_shared_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  shared_with_email text NOT NULL,
  shared_at timestamp with time zone NOT NULL DEFAULT now(),
  resume_data jsonb,
  ai_review_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resume_shared_events ENABLE ROW LEVEL SECURITY;

-- Create policies for resume sharing events
CREATE POLICY "Users can view their own shared events" 
ON public.resume_shared_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shared events" 
ON public.resume_shared_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow service role full access
CREATE POLICY "Allow service role access to resume_shared_events" 
ON public.resume_shared_events 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);