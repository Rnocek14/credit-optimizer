-- ============================================
-- 1) ONBOARDING READINESS RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.check_institution_onboarding_readiness(p_institution_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_result JSONB;
  v_templates_total INT := 0;
  v_templates_scraped INT := 0;
  v_last_scraped_at TIMESTAMPTZ;
  v_extractions_count INT := 0;
  v_pack_status TEXT;
  v_pack_confidence NUMERIC;
  v_confidence_waived BOOLEAN;
  v_provenance_waived BOOLEAN;
  v_rules_total INT := 0;
  v_rules_with_evidence INT := 0;
  v_evidence_pct NUMERIC := 0;
  v_has_ground_truth BOOLEAN := FALSE;
  v_blockers TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
  v_ready_status TEXT;
BEGIN
  -- Templates
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE last_scraped_at IS NOT NULL),
    MAX(last_scraped_at)
  INTO v_templates_total, v_templates_scraped, v_last_scraped_at
  FROM scrape_url_templates
  WHERE institution_code = p_institution_code AND status = 'active';
  
  -- Extractions (via scraped_content)
  SELECT COUNT(*)
  INTO v_extractions_count
  FROM scraped_content sc
  JOIN scrape_url_templates t ON sc.url = t.url
  WHERE t.institution_code = p_institution_code
  AND sc.total_confidence_score IS NOT NULL;
  
  -- Policy pack
  SELECT 
    status,
    (policy_data->>'confidence')::NUMERIC,
    COALESCE((policy_data->>'confidence_waived')::BOOLEAN, FALSE),
    COALESCE((policy_data->>'provenance_waived')::BOOLEAN, FALSE)
  INTO v_pack_status, v_pack_confidence, v_confidence_waived, v_provenance_waived
  FROM institution_policy_packs
  WHERE institution = p_institution_code
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Ground truth
  SELECT EXISTS(
    SELECT 1 FROM institution_policy_ground_truth
    WHERE institution = p_institution_code
  ) INTO v_has_ground_truth;
  
  -- Transfer rules evidence
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE evidence_url IS NOT NULL AND BTRIM(evidence_url) != '')
  INTO v_rules_total, v_rules_with_evidence
  FROM credit_transfer_rules
  WHERE target_institution = p_institution_code;
  
  IF v_rules_total > 0 THEN
    v_evidence_pct := ROUND(100.0 * v_rules_with_evidence / v_rules_total, 1);
  END IF;
  
  -- Evaluate blockers and warnings
  IF v_templates_total = 0 THEN
    v_blockers := array_append(v_blockers, 'No active scrape templates');
  END IF;
  
  IF v_templates_scraped = 0 AND v_templates_total > 0 THEN
    v_blockers := array_append(v_blockers, 'No templates have been scraped');
  END IF;
  
  IF v_pack_status IS NULL THEN
    v_blockers := array_append(v_blockers, 'No policy pack exists');
  ELSIF v_pack_status != 'active' THEN
    v_blockers := array_append(v_blockers, 'Policy pack status is ' || v_pack_status || ', not active');
  END IF;
  
  IF NOT v_has_ground_truth THEN
    v_blockers := array_append(v_blockers, 'No ground truth record');
  END IF;
  
  IF v_confidence_waived THEN
    v_warnings := array_append(v_warnings, 'Confidence is waived (pending automated scoring)');
  ELSIF v_pack_confidence IS NULL THEN
    v_blockers := array_append(v_blockers, 'Confidence score missing');
  ELSIF v_pack_confidence < 0.70 THEN
    v_blockers := array_append(v_blockers, 'Confidence ' || v_pack_confidence || ' below 0.70 threshold');
  END IF;
  
  IF v_provenance_waived THEN
    v_warnings := array_append(v_warnings, 'Provenance verification is waived');
  END IF;
  
  IF v_evidence_pct < 50 THEN
    v_warnings := array_append(v_warnings, 'Evidence coverage ' || v_evidence_pct || '% below 50% target');
  END IF;
  
  -- Determine ready status
  IF array_length(v_blockers, 1) > 0 THEN
    v_ready_status := 'blocked';
  ELSIF array_length(v_warnings, 1) > 0 THEN
    v_ready_status := 'needs_review';
  ELSE
    v_ready_status := 'ready';
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'institution', p_institution_code,
    'ready_status', v_ready_status,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'templates', jsonb_build_object(
      'total', v_templates_total,
      'scraped', v_templates_scraped,
      'last_scraped_at', v_last_scraped_at
    ),
    'extractions', jsonb_build_object(
      'count', v_extractions_count
    ),
    'policy_pack', jsonb_build_object(
      'status', v_pack_status,
      'confidence', v_pack_confidence,
      'confidence_waived', v_confidence_waived,
      'provenance_waived', v_provenance_waived
    ),
    'ground_truth', jsonb_build_object(
      'exists', v_has_ground_truth
    ),
    'transfer_rules', jsonb_build_object(
      'total', v_rules_total,
      'with_evidence', v_rules_with_evidence,
      'evidence_pct', v_evidence_pct
    ),
    'checked_at', NOW()
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.check_institution_onboarding_readiness IS 
'Returns comprehensive onboarding readiness status for an institution:
- ready: All gates pass, no warnings
- needs_review: Gates pass but has warnings (waivers, low evidence)
- blocked: One or more hard gates fail';

-- ============================================
-- 2) TRANSFER EDGE SCHEMA (Typed, 2-Layer)
-- ============================================

-- Entity types that can be sources of transfer credit
CREATE TYPE transfer_entity_type AS ENUM (
  'institution',        -- Specific school (COSC, WGU)
  'accreditation',      -- Accreditation type (regional, national)
  'provider',           -- Alt credit provider (Sophia, Study.com)
  'credential_type',    -- Credential class (military_jst, ace_credit)
  'unknown'
);

-- Basis for how the edge was established
CREATE TYPE transfer_edge_basis AS ENUM (
  'policy_inferred',    -- Derived from published acceptance policy
  'articulation',       -- Explicit articulation agreement
  'heuristic',          -- Inferred from transitive logic
  'manual_entry'        -- Manually added by human
);

-- Verification status
CREATE TYPE transfer_verification_status AS ENUM (
  'verified',           -- Evidence reviewed and confirmed
  'inferred',           -- System-generated, needs review
  'deprecated',         -- No longer valid
  'unknown'
);

-- Main transfer edges table
CREATE TABLE IF NOT EXISTS institution_transfer_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source (who the credit comes from)
  from_entity_type transfer_entity_type NOT NULL,
  from_entity_id TEXT NOT NULL,  -- e.g., 'COSC', 'regional_accreditation', 'SOPHIA'
  
  -- Target (who accepts the credit)
  to_institution TEXT NOT NULL,
  
  -- Edge classification
  edge_basis transfer_edge_basis NOT NULL,
  acceptance_scope TEXT DEFAULT 'general',  -- 'general', 'gen_ed_only', 'elective_only', 'major_specific'
  
  -- Verification
  verification_status transfer_verification_status NOT NULL DEFAULT 'unknown',
  confidence NUMERIC(3,2),  -- 0.00 to 1.00
  
  -- Constraints (optional)
  max_credits_accepted INT,
  conditions JSONB,  -- {"requires_accreditation": "regional", "min_gpa": 2.0}
  
  -- Validity period
  effective_from DATE,
  effective_to DATE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Prevent duplicates
  UNIQUE(from_entity_type, from_entity_id, to_institution, acceptance_scope)
);

-- Evidence for edges
CREATE TABLE IF NOT EXISTS institution_transfer_edge_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_id UUID REFERENCES institution_transfer_edges(id) ON DELETE CASCADE,
  
  evidence_url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('policy_page', 'articulation_agreement', 'catalog', 'faq', 'community_report')),
  
  -- Audit trail
  content_hash TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transfer_edges_from ON institution_transfer_edges(from_entity_type, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_transfer_edges_to ON institution_transfer_edges(to_institution);
CREATE INDEX IF NOT EXISTS idx_transfer_edges_status ON institution_transfer_edges(verification_status);
CREATE INDEX IF NOT EXISTS idx_transfer_edge_evidence_edge ON institution_transfer_edge_evidence(edge_id);

-- RLS
ALTER TABLE institution_transfer_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_transfer_edge_evidence ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access to transfer edges"
  ON institution_transfer_edges FOR SELECT TO public USING (true);
  
CREATE POLICY "Allow public read access to transfer edge evidence"
  ON institution_transfer_edge_evidence FOR SELECT TO public USING (true);

-- Updated_at trigger
CREATE TRIGGER update_transfer_edges_updated_at
  BEFORE UPDATE ON institution_transfer_edges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE institution_transfer_edges IS 
'Typed transfer graph edges: tracks which entities (institutions, accreditations, providers) 
transfer credits to which institutions, with verification status and evidence';

COMMENT ON TABLE institution_transfer_edge_evidence IS 
'Evidence linking for transfer edges - supports audit trail with URL, hash, and verification';

-- ============================================
-- 3) SEED POLICY-BASED EDGES (Layer 1)
-- ============================================

-- TESU accepts regionally accredited institutions
INSERT INTO institution_transfer_edges 
  (from_entity_type, from_entity_id, to_institution, edge_basis, acceptance_scope, verification_status, confidence, max_credits_accepted, created_by)
VALUES
  ('accreditation', 'regional', 'TESU', 'policy_inferred', 'general', 'verified', 0.95, 117, 'system-seed'),
  ('provider', 'SOPHIA', 'TESU', 'policy_inferred', 'general', 'verified', 0.95, 60, 'system-seed'),
  ('provider', 'STUDYCOM', 'TESU', 'policy_inferred', 'general', 'verified', 0.90, 60, 'system-seed'),
  ('credential_type', 'ace_credit', 'TESU', 'policy_inferred', 'general', 'verified', 0.90, NULL, 'system-seed'),
  
  ('accreditation', 'regional', 'COSC', 'policy_inferred', 'general', 'verified', 0.95, 114, 'system-seed'),
  ('provider', 'SOPHIA', 'COSC', 'policy_inferred', 'general', 'verified', 0.95, 60, 'system-seed'),
  ('credential_type', 'clep', 'COSC', 'policy_inferred', 'general', 'verified', 0.95, NULL, 'system-seed'),
  
  ('accreditation', 'regional', 'WGU', 'policy_inferred', 'general', 'verified', 0.90, 90, 'system-seed'),
  ('provider', 'SOPHIA', 'WGU', 'policy_inferred', 'general', 'verified', 0.85, 45, 'system-seed'),
  
  ('accreditation', 'regional', 'EXCELSIOR', 'policy_inferred', 'general', 'verified', 0.95, 108, 'system-seed'),
  ('provider', 'SOPHIA', 'EXCELSIOR', 'policy_inferred', 'general', 'verified', 0.90, NULL, 'system-seed'),
  
  ('accreditation', 'regional', 'EMPIRE', 'policy_inferred', 'general', 'verified', 0.90, 96, 'system-seed')
ON CONFLICT DO NOTHING;

-- Add evidence for seeded edges
INSERT INTO institution_transfer_edge_evidence (edge_id, evidence_url, source_type, verified_by)
SELECT e.id, 
  CASE e.to_institution
    WHEN 'TESU' THEN 'https://www.tesu.edu/admissions/transfer-credit'
    WHEN 'COSC' THEN 'https://www.charteroak.edu/catalog/current/degree-requirements/'
    WHEN 'WGU' THEN 'https://www.wgu.edu/admissions/transferring-credits.html'
    WHEN 'EXCELSIOR' THEN 'https://www.excelsior.edu/admissions/transfer-credit/'
    WHEN 'EMPIRE' THEN 'https://www.suny.edu/empire/'
    ELSE 'https://migration-seed'
  END,
  'policy_page',
  'system-seed'
FROM institution_transfer_edges e
WHERE e.created_by = 'system-seed'
AND NOT EXISTS (
  SELECT 1 FROM institution_transfer_edge_evidence ev WHERE ev.edge_id = e.id
);