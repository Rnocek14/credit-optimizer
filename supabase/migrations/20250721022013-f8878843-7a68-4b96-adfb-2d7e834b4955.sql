-- Add CRI scoring fields to ai_resume_drafts table
ALTER TABLE public.ai_resume_drafts 
ADD COLUMN submitted_for_cri boolean DEFAULT false,
ADD COLUMN cri_feedback jsonb,
ADD COLUMN scored_at timestamp with time zone,
ADD COLUMN improvement_suggestions text[];

-- Create index for better performance
CREATE INDEX idx_ai_resume_drafts_user_submitted ON public.ai_resume_drafts(user_id, submitted_for_cri);
CREATE INDEX idx_ai_resume_drafts_published ON public.ai_resume_drafts(published_to_profile, created_at);