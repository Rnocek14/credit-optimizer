-- Create featured gallery curations table
CREATE TABLE public.featured_gallery_curations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  curation_tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.featured_gallery_curations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active curations" 
ON public.featured_gallery_curations 
FOR SELECT 
USING (active = true);

CREATE POLICY "Service role can manage curations" 
ON public.featured_gallery_curations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_featured_gallery_curations_profile_id ON public.featured_gallery_curations(profile_id);
CREATE INDEX idx_featured_gallery_curations_active ON public.featured_gallery_curations(active);