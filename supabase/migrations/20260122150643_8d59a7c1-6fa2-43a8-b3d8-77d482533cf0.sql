-- Fix the onboarding readiness RPC to prioritize active packs
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
  
  -- Policy pack - PRIORITIZE active status, then most recent
  SELECT 
    status,
    (policy_data->>'confidence')::NUMERIC,
    COALESCE((policy_data->>'confidence_waived')::BOOLEAN, FALSE),
    COALESCE((policy_data->>'provenance_waived')::BOOLEAN, FALSE)
  INTO v_pack_status, v_pack_confidence, v_confidence_waived, v_provenance_waived
  FROM institution_policy_packs
  WHERE institution = p_institution_code
  ORDER BY 
    CASE WHEN status = 'active' THEN 0 ELSE 1 END,  -- Active first
    created_at DESC
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
  ELSIF v_pack_confidence IS NULL AND v_pack_status = 'active' THEN
    v_warnings := array_append(v_warnings, 'Active pack has no confidence score');
  ELSIF v_pack_confidence IS NOT NULL AND v_pack_confidence < 0.70 THEN
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