-- Create ai_resume_drafts table for storing generated resumes
CREATE TABLE public.ai_resume_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  cri_average DECIMAL(5,2),
  readiness_score DECIMAL(5,2),
  published_to_profile BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_resume_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_resume_drafts
CREATE POLICY "Users can view their own resume drafts" 
ON public.ai_resume_drafts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own resume drafts" 
ON public.ai_resume_drafts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume drafts" 
ON public.ai_resume_drafts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume drafts" 
ON public.ai_resume_drafts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role can manage all resume drafts
CREATE POLICY "Service role can manage all resume drafts" 
ON public.ai_resume_drafts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_resume_drafts_updated_at
BEFORE UPDATE ON public.ai_resume_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_ai_resume_drafts_user_id ON public.ai_resume_drafts(user_id);
CREATE INDEX idx_ai_resume_drafts_published ON public.ai_resume_drafts(published_to_profile);