-- Enhance career_paths table with goal-oriented features
ALTER TABLE public.career_paths ADD COLUMN IF NOT EXISTS track text DEFAULT 'general';
ALTER TABLE public.career_paths ADD COLUMN IF NOT EXISTS required_skill_ids uuid[] DEFAULT '{}';
ALTER TABLE public.career_paths ADD COLUMN IF NOT EXISTS optional_skill_ids uuid[] DEFAULT '{}';
ALTER TABLE public.career_paths ADD COLUMN IF NOT EXISTS checkpoint_skill_id uuid;
ALTER TABLE public.career_paths ADD COLUMN IF NOT EXISTS roi_score numeric DEFAULT 1.0;

-- Create user_career_selections table to track user's chosen career paths
CREATE TABLE IF NOT EXISTS public.user_career_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  career_path_id UUID NOT NULL REFERENCES public.career_paths(id),
  selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  checkpoint_reached BOOLEAN DEFAULT false,
  pivot_choices JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_career_selections
ALTER TABLE public.user_career_selections ENABLE ROW LEVEL SECURITY;

-- Create policies for user_career_selections
CREATE POLICY "Users can manage their own career selections" 
ON public.user_career_selections 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all career selections" 
ON public.user_career_selections 
FOR ALL
USING (true)
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_career_selections_user_id ON public.user_career_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_career_selections_career_path_id ON public.user_career_selections(career_path_id);
CREATE INDEX IF NOT EXISTS idx_career_paths_track ON public.career_paths(track);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_career_selections_updated_at
  BEFORE UPDATE ON public.user_career_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing career paths with track information
UPDATE public.career_paths 
SET track = CASE 
  WHEN title LIKE '%Designer%' OR title LIKE '%UX%' OR title LIKE '%Brand Strategist%' THEN 'design'
  WHEN title LIKE '%Engineer%' OR title LIKE '%Developer%' THEN 'engineering'
  WHEN title LIKE '%Data%' OR title LIKE '%Analyst%' THEN 'data'
  WHEN title LIKE '%Product%' OR title LIKE '%Manager%' THEN 'product'
  WHEN title LIKE '%Marketing%' THEN 'marketing'
  WHEN title LIKE '%Security%' OR title LIKE '%Cybersecurity%' THEN 'security'
  ELSE 'general'
END;