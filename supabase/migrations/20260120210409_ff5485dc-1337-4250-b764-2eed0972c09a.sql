-- V1.1 Tighten-up: Add inferred_from column + verification_kind in view

-- 1) Add optional tracking column
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS last_verified_at_inferred_from text;

-- 2) Backfill the inferred_from source for existing inferred rows
UPDATE credit_transfer_rules
SET last_verified_at_inferred_from = 'bootstrap_v1.1'
WHERE last_verified_at_inferred = true
  AND last_verified_at_inferred_from IS NULL;

-- 3) Update the full freshness view with verification_kind
DROP VIEW IF EXISTS transfer_rules_with_freshness;

CREATE VIEW transfer_rules_with_freshness AS
SELECT
  r.*,
  f.freshness_status,
  f.days_since_verified,
  f.ttl_days,
  CASE
    WHEN r.last_verified_at IS NULL THEN 'never_verified'
    WHEN r.last_verified_at_inferred THEN 'inferred'
    ELSE 'explicit'
  END AS verification_kind
FROM credit_transfer_rules r
JOIN transfer_rule_freshness f ON f.id = r.id;

COMMENT ON VIEW transfer_rules_with_freshness IS 'Full transfer rules with server-computed freshness. verification_kind: explicit/inferred/never_verified.';