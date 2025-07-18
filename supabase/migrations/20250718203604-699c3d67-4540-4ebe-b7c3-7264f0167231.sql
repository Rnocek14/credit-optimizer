-- Create mentor feedback table
CREATE TABLE public.mentor_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_event_id uuid NOT NULL,
  mentor_email text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  recommend_for_gallery boolean DEFAULT false,
  recommend_for_jobs boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Mentors can view their own feedback" 
ON public.mentor_feedback 
FOR SELECT 
USING (mentor_email = auth.jwt() ->> 'email' OR mentor_email IN (
  SELECT email FROM auth.users WHERE id = auth.uid()
));

CREATE POLICY "Mentors can create their own feedback" 
ON public.mentor_feedback 
FOR INSERT 
WITH CHECK (mentor_email = auth.jwt() ->> 'email' OR mentor_email IN (
  SELECT email FROM auth.users WHERE id = auth.uid()
));

CREATE POLICY "Mentors can update their own feedback" 
ON public.mentor_feedback 
FOR UPDATE 
USING (mentor_email = auth.jwt() ->> 'email' OR mentor_email IN (
  SELECT email FROM auth.users WHERE id = auth.uid()
));

-- Allow service role full access
CREATE POLICY "Allow service role access to mentor_feedback" 
ON public.mentor_feedback 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Add foreign key reference to resume_shared_events
ALTER TABLE public.mentor_feedback 
ADD CONSTRAINT mentor_feedback_resume_event_id_fkey 
FOREIGN KEY (resume_event_id) REFERENCES public.resume_shared_events(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_mentor_feedback_updated_at
BEFORE UPDATE ON public.mentor_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();