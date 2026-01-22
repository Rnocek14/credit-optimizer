-- Unique index to prevent duplicate verified edges for the same key
-- This is a safety guardrail for idempotent promotion under retries
CREATE UNIQUE INDEX IF NOT EXISTS uniq_verified_edge_key_active
ON public.institution_transfer_edges (
  from_entity_type,
  upper(trim(from_entity_id)),
  to_institution,
  acceptance_scope
)
WHERE verification_status = 'verified' AND superseded_by_edge_id IS NULL;

-- Add comment
COMMENT ON INDEX uniq_verified_edge_key_active IS 'Prevents duplicate active verified edges for the same (from_type, from_id, to_institution, scope) combination';