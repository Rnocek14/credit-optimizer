-- Drop existing view if it exists
DROP VIEW IF EXISTS public.requirement_option_counts_by_block CASCADE;

-- Create the table
CREATE TABLE public.requirement_option_counts_by_block (
  block_id TEXT PRIMARY KEY,
  options_count INTEGER NOT NULL DEFAULT 0,
  has_ace_credit BOOLEAN NOT NULL DEFAULT false,
  has_clep BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.requirement_option_counts_by_block ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view requirement option counts"
  ON public.requirement_option_counts_by_block
  FOR SELECT
  USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage requirement option counts"
  ON public.requirement_option_counts_by_block
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to refresh marketplace data from block_members
CREATE OR REPLACE FUNCTION public.refresh_requirement_option_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear existing data
  DELETE FROM public.requirement_option_counts_by_block;
  
  -- Aggregate course counts per block from block_members
  -- Cast UUID to text before applying LOWER
  INSERT INTO public.requirement_option_counts_by_block (
    block_id,
    options_count,
    has_ace_credit,
    has_clep,
    updated_at
  )
  SELECT 
    LOWER(bm.block_id::text) as block_id,
    COUNT(DISTINCT bm.course_id)::INTEGER as options_count,
    -- Check if any linked course has ACE credit options
    COALESCE(
      bool_or(EXISTS(
        SELECT 1 FROM public.alt_credit_options aco 
        WHERE aco.course_id = bm.course_id 
        AND aco.provider = 'ACE'
      )),
      false
    ) as has_ace_credit,
    -- Check if any linked course has CLEP options
    COALESCE(
      bool_or(EXISTS(
        SELECT 1 FROM public.alt_credit_options aco 
        WHERE aco.course_id = bm.course_id 
        AND aco.provider = 'CLEP'
      )),
      false
    ) as has_clep,
    now() as updated_at
  FROM public.block_members bm
  GROUP BY LOWER(bm.block_id::text);
  
  -- Log the refresh
  RAISE NOTICE 'Refreshed % requirement option counts', (SELECT COUNT(*) FROM public.requirement_option_counts_by_block);
END;
$$;

-- Initial seed: call the refresh function
SELECT public.refresh_requirement_option_counts();

-- Add trigger to auto-update when block_members change
CREATE OR REPLACE FUNCTION public.trigger_refresh_requirement_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh the counts
  PERFORM public.refresh_requirement_option_counts();
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER refresh_requirement_counts_on_block_members_change
  AFTER INSERT OR UPDATE OR DELETE ON public.block_members
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_requirement_counts();