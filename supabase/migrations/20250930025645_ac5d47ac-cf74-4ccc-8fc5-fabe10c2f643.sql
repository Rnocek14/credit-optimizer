-- Add functional index for case-insensitive lookups (performance boost)
CREATE INDEX IF NOT EXISTS idx_req_opt_counts_block_lower
  ON public.requirement_option_counts_by_block (LOWER(block_id));

-- Populate the table with current data
SELECT refresh_requirement_option_counts();