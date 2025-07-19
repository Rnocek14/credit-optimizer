-- Create user_xp table to store XP for each user
CREATE TABLE public.user_xp (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

-- Create policies for user_xp table
CREATE POLICY "Users can view their own XP"
ON public.user_xp
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own XP"
ON public.user_xp
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP"
ON public.user_xp
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all user XP"
ON public.user_xp
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to automatically update last_updated timestamp
CREATE TRIGGER update_user_xp_updated_at
BEFORE UPDATE ON public.user_xp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper function to get user level based on XP
CREATE OR REPLACE FUNCTION public.get_user_level(user_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  total_xp integer,
  current_level integer,
  xp_for_current_level integer,
  xp_for_next_level integer,
  xp_progress_in_level integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    ux.user_id,
    ux.total_xp,
    CASE 
      WHEN ux.total_xp < 100 THEN 1
      WHEN ux.total_xp < 250 THEN 2
      WHEN ux.total_xp < 500 THEN 3
      WHEN ux.total_xp < 1000 THEN 4
      ELSE 4 + ((ux.total_xp - 500) / 500)
    END as current_level,
    CASE 
      WHEN ux.total_xp < 100 THEN 0
      WHEN ux.total_xp < 250 THEN 100
      WHEN ux.total_xp < 500 THEN 250
      WHEN ux.total_xp < 1000 THEN 500
      ELSE 500 + (((ux.total_xp - 500) / 500) * 500)
    END as xp_for_current_level,
    CASE 
      WHEN ux.total_xp < 100 THEN 100
      WHEN ux.total_xp < 250 THEN 250
      WHEN ux.total_xp < 500 THEN 500
      WHEN ux.total_xp < 1000 THEN 1000
      ELSE 500 + (((ux.total_xp - 500) / 500 + 1) * 500)
    END as xp_for_next_level,
    CASE 
      WHEN ux.total_xp < 100 THEN ux.total_xp
      WHEN ux.total_xp < 250 THEN ux.total_xp - 100
      WHEN ux.total_xp < 500 THEN ux.total_xp - 250
      WHEN ux.total_xp < 1000 THEN ux.total_xp - 500
      ELSE ux.total_xp - (500 + (((ux.total_xp - 500) / 500) * 500))
    END as xp_progress_in_level
  FROM public.user_xp ux
  WHERE ux.user_id = user_id_param;
$$;

-- Insert demo XP data for Aisha Khan
INSERT INTO public.user_xp (user_id, total_xp, last_updated)
VALUES ('2b458624-d498-4cca-a63d-9341cc20e363', 185, now())
ON CONFLICT (user_id) 
DO UPDATE SET 
  total_xp = EXCLUDED.total_xp,
  last_updated = EXCLUDED.last_updated;