-- Create xp_events table to track all XP awards
CREATE TABLE public.xp_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  xp_amount integer NOT NULL,
  action_type text NOT NULL,
  source_id uuid,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- Create policies for xp_events table
CREATE POLICY "Users can view their own XP events"
ON public.xp_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all XP events"
ON public.xp_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Create custom update trigger for user_xp since it uses last_updated instead of updated_at
CREATE OR REPLACE FUNCTION public.update_user_xp_last_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

-- Drop existing trigger and create new one with correct function
DROP TRIGGER IF EXISTS update_user_xp_updated_at ON public.user_xp;
CREATE TRIGGER update_user_xp_last_updated
BEFORE UPDATE ON public.user_xp
FOR EACH ROW
EXECUTE FUNCTION public.update_user_xp_last_updated();

-- Create function to award XP
CREATE OR REPLACE FUNCTION public.award_xp(
  user_id_param uuid,
  xp_amount_param integer,
  action_type_param text,
  reason_param text,
  source_id_param uuid DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert XP event record
  INSERT INTO public.xp_events (user_id, xp_amount, action_type, source_id, reason)
  VALUES (user_id_param, xp_amount_param, action_type_param, source_id_param, reason_param);
  
  -- Update or insert user_xp record
  INSERT INTO public.user_xp (user_id, total_xp, last_updated)
  VALUES (user_id_param, xp_amount_param, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_xp = user_xp.total_xp + xp_amount_param,
    last_updated = now();
END;
$$;

-- Test by awarding 15 XP to Aisha Khan for transcript_saved
SELECT public.award_xp(
  '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
  15,
  'transcript_saved',
  'Added a new transcript to profile'
);