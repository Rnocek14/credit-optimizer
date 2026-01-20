-- V1.1 Evidence Typing Backfill
-- Classifies evidence_url patterns into evidence_source_type
-- Safe: only updates rows where evidence_url IS NOT NULL AND evidence_source_type IS NULL

-- Classification rules:
-- 1. Institution domains (.edu) → institution_web
-- 2. Provider domains (sophia.org, study.com, etc.) with institution path → institution_web (partner page)
-- 3. PDF files on institution domains → institution_pdf  
-- 4. CLEP/ACE (collegeboard) → ace_nccrs
-- 5. Generic provider pages → provider_page

UPDATE credit_transfer_rules
SET evidence_source_type = CASE
  -- Institution domain patterns → institution_web
  WHEN evidence_url ILIKE '%tesu.edu%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%wgu.edu%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%charteroak.edu%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%excelsior.edu%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%sunyempire.edu%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%esc.edu%' THEN 'institution_web'
  
  -- Sophia partner pages (institution-specific) → institution_web
  WHEN evidence_url ILIKE '%sophia.org%' AND evidence_url ILIKE '%partner%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%sunyempire.sophia.org%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%tesu.sophia.org%' THEN 'institution_web'
  WHEN evidence_url ILIKE '%excelsior.sophia.org%' THEN 'institution_web'
  
  -- CLEP / ACE → ace_nccrs
  WHEN evidence_url ILIKE '%collegeboard%' THEN 'ace_nccrs'
  
  -- Generic provider catalog pages → provider_page
  WHEN evidence_url ILIKE '%sophia.org%' THEN 'provider_page'
  WHEN evidence_url ILIKE '%study.com%' THEN 'provider_page'
  WHEN evidence_url ILIKE '%straighterline%' THEN 'provider_page'
  WHEN evidence_url ILIKE '%saylor%' THEN 'provider_page'
  WHEN evidence_url ILIKE '%modernstates%' THEN 'provider_page'
  
  -- Fallback: anything else with URL → human_override (needs review)
  ELSE 'human_override'
END
WHERE evidence_url IS NOT NULL 
  AND evidence_source_type IS NULL