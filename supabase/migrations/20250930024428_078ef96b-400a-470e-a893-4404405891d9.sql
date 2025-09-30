-- Add index for fast batch lookups on block_id
CREATE INDEX IF NOT EXISTS idx_req_opt_counts_block 
  ON public.requirement_option_counts_by_block (block_id);

-- Optional: Grant execute to allow manual refresh calls
-- Keeping it privileged for now (service role only)
-- GRANT EXECUTE ON FUNCTION public.refresh_requirement_option_counts() TO anon, authenticated;