-- Step 1: Drop the broken 4-parameter function signature (foot-gun removal)
DROP FUNCTION IF EXISTS public.compute_template_baseline(TEXT, TEXT, TEXT, INTEGER);

-- Step 2: Delete stale/bad WGU baseline rows (surgical cleanup)
DELETE FROM template_baseline_snapshots
WHERE template_id LIKE 'WGU%'
  AND baseline_weeks = 64;

-- Step 3: Add unique constraint to prevent future duplicates (Option A - simplest)
ALTER TABLE template_baseline_snapshots
ADD CONSTRAINT unique_template_baseline UNIQUE (template_id);