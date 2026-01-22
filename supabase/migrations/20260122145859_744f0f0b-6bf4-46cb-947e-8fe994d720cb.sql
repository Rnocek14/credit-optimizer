-- Create helper RPC for invariant B (provenance check)
-- This is needed because the JSONB path query is complex

CREATE OR REPLACE FUNCTION public.count_active_packs_missing_provenance()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM institution_policy_packs
  WHERE status = 'active'
  AND (
    COALESCE(policy_data->>'provenance_verified_at', '') = ''
    OR COALESCE(policy_data->>'provenance_verified_by', '') = ''
    OR COALESCE(policy_data->>'provenance_source_url', '') = ''
  )
  AND COALESCE((policy_data->>'provenance_waived')::BOOLEAN, FALSE) = FALSE;
$$;

COMMENT ON FUNCTION public.count_active_packs_missing_provenance IS 
'Counts active policy packs missing required provenance verification fields (Gate 7 bypass detection)';