-- Backfill inferred verification timestamps using verified_at as source
UPDATE credit_transfer_rules
SET 
  last_verified_at = COALESCE(verified_at, effective_from, NOW()),
  last_verified_at_inferred = true
WHERE evidence_url IS NOT NULL 
  AND last_verified_at IS NULL