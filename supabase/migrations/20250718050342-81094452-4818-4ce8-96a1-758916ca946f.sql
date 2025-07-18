-- Add updated_at column if it doesn't exist
ALTER TABLE public.roadmap_steps
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger for automatic timestamp updates on roadmap_steps (drop first if exists)
DROP TRIGGER IF EXISTS update_roadmap_steps_updated_at ON public.roadmap_steps;

CREATE TRIGGER update_roadmap_steps_updated_at
  BEFORE UPDATE ON public.roadmap_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();