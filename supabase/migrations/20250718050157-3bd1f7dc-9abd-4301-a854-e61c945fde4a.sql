-- Add foreign key constraint to reference profiles(id)
ALTER TABLE public.roadmap_steps
ADD CONSTRAINT roadmap_steps_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.roadmap_steps
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger for automatic timestamp updates on roadmap_steps
CREATE TRIGGER update_roadmap_steps_updated_at
  BEFORE UPDATE ON public.roadmap_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();