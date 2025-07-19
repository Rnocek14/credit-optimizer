-- Create transcripts table for user learning history
CREATE TABLE public.transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  grade TEXT,
  credits DECIMAL(4,2),
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  skill_tags TEXT[] DEFAULT '{}',
  cri_score DECIMAL(5,2) CHECK (cri_score >= 0 AND cri_score <= 100),
  verified BOOLEAN DEFAULT false,
  use_in_resume BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Create policies for transcripts
CREATE POLICY "Users can view their own transcripts" 
ON public.transcripts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transcripts" 
ON public.transcripts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcripts" 
ON public.transcripts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcripts" 
ON public.transcripts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role can manage all transcripts
CREATE POLICY "Service role can manage all transcripts" 
ON public.transcripts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transcripts_updated_at
BEFORE UPDATE ON public.transcripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_transcripts_user_id ON public.transcripts(user_id);
CREATE INDEX idx_transcripts_cri_score ON public.transcripts(cri_score DESC);
CREATE INDEX idx_transcripts_verified ON public.transcripts(verified);
CREATE INDEX idx_transcripts_use_in_resume ON public.transcripts(use_in_resume);