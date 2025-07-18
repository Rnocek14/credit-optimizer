-- Add updated_at column to career_tracks table if it doesn't exist
ALTER TABLE public.career_tracks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger for automatic timestamp updates on career_tracks
CREATE TRIGGER update_career_tracks_updated_at
  BEFORE UPDATE ON public.career_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();