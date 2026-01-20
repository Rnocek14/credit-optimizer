-- 1) Canonical provider identifiers proven by evidence source (e.g., Sophia course ID like BusLaw1001)
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS source_course_code_canonical text;

-- 2) Optional but strongly recommended: canonical title (helps future audits when codes change)
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS source_course_title_canonical text;

-- 3) Where the evidence came from (institution_pdf/provider_page/etc.)
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS evidence_source_type text;

-- 4) Free-form "where in the doc" snippet (row/section/table) to make audits deterministic
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS evidence_locator text;

-- 5) Basic constraint to avoid garbage values
ALTER TABLE credit_transfer_rules
ADD CONSTRAINT credit_transfer_rules_evidence_source_type_chk
CHECK (
  evidence_source_type IS NULL OR evidence_source_type IN (
    'institution_pdf',
    'institution_web',
    'provider_page',
    'ace_nccrs',
    'human_override'
  )
);