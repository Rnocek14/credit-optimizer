-- Add data_source column for provenance tracking
-- Tag seeded rows for safe cleanup

-- 1. Add column to snapshots (default 'real' for future rows)
ALTER TABLE invariant_decision_snapshots 
ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'real';

-- Add check constraint
ALTER TABLE invariant_decision_snapshots 
ADD CONSTRAINT invariant_decision_snapshots_data_source_check 
CHECK (data_source IN ('real', 'seed'));

-- 2. Add column to jobs
ALTER TABLE template_generation_jobs 
ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'real';

ALTER TABLE template_generation_jobs 
ADD CONSTRAINT template_generation_jobs_data_source_check 
CHECK (data_source IN ('real', 'seed'));

-- 3. Tag existing seeded snapshots (those with synthetic invariant versions)
UPDATE invariant_decision_snapshots 
SET data_source = 'seed' 
WHERE invariant_version IN ('v1.0.0', 'v1.1.0', 'v1.2.0');

-- 4. Tag seeded jobs (the 5 we inserted with known UUIDs)
UPDATE template_generation_jobs 
SET data_source = 'seed' 
WHERE id IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111105'
);

-- 5. Create admin-only purge function
CREATE OR REPLACE FUNCTION public.admin_purge_seeded_invariant_data(
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(
  snapshots_deleted BIGINT,
  jobs_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshots_count BIGINT;
  v_jobs_count BIGINT;
BEGIN
  -- Count seeded rows
  SELECT COUNT(*) INTO v_snapshots_count 
  FROM invariant_decision_snapshots WHERE data_source = 'seed';
  
  SELECT COUNT(*) INTO v_jobs_count 
  FROM template_generation_jobs WHERE data_source = 'seed';
  
  IF NOT p_dry_run THEN
    -- Actually delete (snapshots first due to FK on job_id)
    DELETE FROM invariant_decision_snapshots WHERE data_source = 'seed';
    DELETE FROM template_generation_jobs WHERE data_source = 'seed';
  END IF;
  
  RETURN QUERY SELECT v_snapshots_count, v_jobs_count;
END;
$$;

-- Grant execute to authenticated (admin check happens in edge function)
GRANT EXECUTE ON FUNCTION public.admin_purge_seeded_invariant_data(BOOLEAN) TO authenticated;