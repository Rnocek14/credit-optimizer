
-- Add supersession tracking columns
ALTER TABLE credit_transfer_rules
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES credit_transfer_rules(id),
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

-- Index for fast active-rule resolution
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_active_lookup
  ON credit_transfer_rules(target_institution, source_institution, source_course_code)
  WHERE is_active = true;

-- Index for data quality filtering
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_quality
  ON credit_transfer_rules(data_quality, is_active);

-- Create priority view for resolution engine
CREATE OR REPLACE VIEW active_transfer_rules AS
SELECT *,
  CASE data_quality
    WHEN 'catalog_verified' THEN 1
    WHEN 'ai_extracted' THEN 2
    WHEN 'unverified' THEN 3
    WHEN 'legacy_unverified' THEN 4
    ELSE 5
  END AS quality_rank
FROM credit_transfer_rules
WHERE is_active = true
ORDER BY quality_rank, confidence DESC NULLS LAST;

-- RLS: inherit parent table's public read policy
-- (view uses invoker's permissions by default, which is correct)

COMMENT ON COLUMN credit_transfer_rules.is_active IS 'Whether this rule is active in resolution. Superseded rules are deactivated.';
COMMENT ON COLUMN credit_transfer_rules.superseded_by IS 'UUID of the newer rule that replaced this one';
COMMENT ON COLUMN credit_transfer_rules.promoted_at IS 'When this rule was promoted from AI candidate to production';
