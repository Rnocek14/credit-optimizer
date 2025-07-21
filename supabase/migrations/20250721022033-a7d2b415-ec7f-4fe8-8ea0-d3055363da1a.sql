-- Add CRI scoring fields to ai_resume_drafts table (skip if exists)
ALTER TABLE public.ai_resume_drafts 
ADD COLUMN IF NOT EXISTS submitted_for_cri boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cri_feedback jsonb,
ADD COLUMN IF NOT EXISTS scored_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS improvement_suggestions text[];

-- Create index for better performance (skip if exists)  
CREATE INDEX IF NOT EXISTS idx_ai_resume_drafts_user_submitted ON public.ai_resume_drafts(user_id, submitted_for_cri);