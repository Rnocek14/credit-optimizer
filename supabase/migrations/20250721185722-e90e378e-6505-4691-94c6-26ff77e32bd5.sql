CREATE TABLE public.career_location_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  salary_multiplier NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_location_multipliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view multipliers" ON public.career_location_multipliers
FOR SELECT USING (true);

CREATE POLICY "Service role can manage multipliers" ON public.career_location_multipliers
FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update timestamps
CREATE TRIGGER update_clm_updated_at
BEFORE UPDATE ON public.career_location_multipliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();