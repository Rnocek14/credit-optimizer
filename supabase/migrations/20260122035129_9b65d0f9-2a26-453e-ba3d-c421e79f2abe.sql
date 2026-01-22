-- =============================================================================
-- PLAN CONSTRAINT VIOLATIONS TABLE + INVARIANT CHECK RPC + ELIGIBILITY RPC
-- =============================================================================

-- 1) Create plan_constraint_violations table for audit + UI
-- =============================================================================
CREATE TABLE IF NOT EXISTS plan_constraint_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES user_plans(id) ON DELETE CASCADE,
  
  -- Severity: block prevents graduation, warn is advisory, info is FYI
  severity text NOT NULL CHECK (severity IN ('block', 'warn', 'info')),
  code text NOT NULL,
  
  -- Scope: what the violation applies to (optional but huge for UI)
  requirement_block_id uuid NULL REFERENCES requirement_blocks(id) ON DELETE SET NULL,
  requirement_id uuid NULL,
  course_id uuid NULL,
  provider_code text NULL,
  
  -- scope_key lets you de-dupe per constraint instance
  scope_key text NOT NULL,
  
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- "current" marker for versioning
  is_current boolean NOT NULL DEFAULT true,
  
  -- Unique constraint for upserts
  CONSTRAINT uq_plan_violation_scope UNIQUE (plan_id, code, scope_key, is_current) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_pcv_plan_current ON plan_constraint_violations(plan_id, is_current);
CREATE INDEX IF NOT EXISTS idx_pcv_plan_code ON plan_constraint_violations(plan_id, code);
CREATE INDEX IF NOT EXISTS idx_pcv_plan_block ON plan_constraint_violations(plan_id, requirement_block_id) WHERE requirement_block_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pcv_severity ON plan_constraint_violations(plan_id, severity) WHERE is_current = true;

-- Enable RLS
ALTER TABLE plan_constraint_violations ENABLE ROW LEVEL SECURITY;

-- Users can view their own violations
CREATE POLICY "Users can view their own plan violations" 
ON plan_constraint_violations FOR SELECT 
USING (
  plan_id IN (SELECT id FROM user_plans WHERE user_id = auth.uid())
);

-- 2) Create helper view for course classification (shared by invariants + eligibility)
-- =============================================================================
CREATE OR REPLACE VIEW plan_course_classification AS
SELECT
  upc.id AS plan_course_id,
  upc.plan_id,
  upc.requirement_id,
  upc.course_id,
  upc.provider_id,
  COALESCE(upc.credits_earned, 3) AS credits, -- Default 3 if not specified
  upc.status,
  upc.transfer_source,
  upc.grade,
  -- Classify source type based on transfer_source enum
  CASE 
    WHEN upc.transfer_source = 'HOME' THEN 'institutional'
    WHEN upc.transfer_source IN ('ACE', 'NCCRS', 'CLEP', 'DSST') THEN 'alt'
    WHEN upc.transfer_source = 'XFER' THEN 'transfer'
    ELSE 'institutional'
  END AS source_type,
  -- Extract provider code if available
  CASE
    WHEN upc.transfer_source = 'CLEP' THEN 'CLEP'
    WHEN upc.transfer_source = 'DSST' THEN 'DSST'
    WHEN sc.provider_code IS NOT NULL THEN sc.provider_code
    ELSE NULL
  END AS provider_code,
  -- Level classification (would need course metadata)
  CASE
    WHEN ec.level_year >= 3 THEN 'upper'
    ELSE 'lower'
  END AS level
FROM user_plan_courses upc
LEFT JOIN source_courses sc ON sc.id = upc.provider_id
LEFT JOIN edu_courses ec ON ec.id = upc.course_id;

-- 3) Create plan_invariant_checks RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION plan_invariant_checks(
  p_plan_id uuid,
  p_persist boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_prog record;
  v_req_version record;
  v_policy record;
  v_limits record;
  v_totals record;
  v_violations jsonb := '[]'::jsonb;
  v_ok boolean := true;
  v_block record;
  v_block_count int;
  v_block_needed int;
  v_provider_usage record;
BEGIN
  -- 1) Load plan
  SELECT * INTO v_plan
  FROM user_plans
  WHERE id = p_plan_id;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'violations', jsonb_build_array(
      jsonb_build_object(
        'severity', 'block',
        'code', 'PLAN_NOT_FOUND',
        'scope_key', 'plan',
        'message', 'Plan not found',
        'details', jsonb_build_object('plan_id', p_plan_id)
      )
    ), 'totals', '{}'::jsonb);
  END IF;

  -- 2) Load program catalog
  SELECT * INTO v_prog
  FROM program_catalog
  WHERE program_slug = v_plan.program_id
     OR id::text = v_plan.program_id
  LIMIT 1;

  IF v_prog IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'violations', jsonb_build_array(
      jsonb_build_object(
        'severity', 'block',
        'code', 'PROGRAM_NOT_FOUND',
        'scope_key', 'program',
        'message', 'Program not found for plan',
        'details', jsonb_build_object('program_id', v_plan.program_id)
      )
    ), 'totals', '{}'::jsonb);
  END IF;

  -- 3) Load latest requirements version
  SELECT * INTO v_req_version
  FROM program_requirements_versions
  WHERE program_catalog_id = v_prog.id
  ORDER BY version_number DESC
  LIMIT 1;

  -- 4) Load institution policy
  SELECT * INTO v_policy
  FROM institution_policy_packs
  WHERE institution = v_prog.institution_code
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 5) Calculate totals from classified courses
  SELECT
    COALESCE(SUM(credits), 0) AS total_credits,
    COALESCE(SUM(CASE WHEN source_type = 'institutional' THEN credits ELSE 0 END), 0) AS institutional_credits,
    COALESCE(SUM(CASE WHEN source_type = 'transfer' THEN credits ELSE 0 END), 0) AS transfer_credits,
    COALESCE(SUM(CASE WHEN source_type = 'alt' THEN credits ELSE 0 END), 0) AS alt_credits,
    COALESCE(SUM(CASE WHEN level = 'upper' THEN credits ELSE 0 END), 0) AS upper_div_credits,
    COUNT(*) AS course_count,
    COUNT(CASE WHEN status = 'complete' THEN 1 END) AS completed_count
  INTO v_totals
  FROM plan_course_classification
  WHERE plan_id = p_plan_id;

  -- Default totals if null
  IF v_totals IS NULL THEN
    v_totals := ROW(0, 0, 0, 0, 0, 0, 0);
  END IF;

  -- ==========================================================================
  -- CONSTRAINT CHECKS
  -- ==========================================================================

  -- C1: TOTAL_CREDITS
  IF v_totals.total_credits < COALESCE(v_req_version.credits_total, v_prog.degree_total_credits, 120) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'TOTAL_CREDITS',
      'scope_key', 'total_credits',
      'message', format('Plan has %s credits; requires %s.', 
        v_totals.total_credits, 
        COALESCE(v_req_version.credits_total, v_prog.degree_total_credits, 120)),
      'details', jsonb_build_object(
        'have', v_totals.total_credits, 
        'need', COALESCE(v_req_version.credits_total, v_prog.degree_total_credits, 120)
      )
    ));
    v_ok := false;
  END IF;

  -- C2: RESIDENCY_MIN
  IF v_totals.institutional_credits < COALESCE(v_req_version.residency_min, 6) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'RESIDENCY_MIN',
      'scope_key', 'residency',
      'message', format('Institutional credits %s; requires %s.', 
        v_totals.institutional_credits, 
        COALESCE(v_req_version.residency_min, 6)),
      'details', jsonb_build_object(
        'have', v_totals.institutional_credits, 
        'need', COALESCE(v_req_version.residency_min, 6)
      )
    ));
    v_ok := false;
  END IF;

  -- C3: TRANSFER_MAX
  IF v_totals.transfer_credits > COALESCE(v_req_version.transfer_max, 114) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'TRANSFER_MAX',
      'scope_key', 'transfer_max',
      'message', format('Transfer credits %s exceed maximum %s.', 
        v_totals.transfer_credits, 
        COALESCE(v_req_version.transfer_max, 114)),
      'details', jsonb_build_object(
        'have', v_totals.transfer_credits, 
        'max', COALESCE(v_req_version.transfer_max, 114)
      )
    ));
    v_ok := false;
  END IF;

  -- C4: ALT_CREDIT_CAP
  IF v_totals.alt_credits > COALESCE(v_req_version.alt_credit_cap, 90) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'ALT_CREDIT_CAP',
      'scope_key', 'alt_cap',
      'message', format('Alt-credit %s exceeds cap %s.', 
        v_totals.alt_credits, 
        COALESCE(v_req_version.alt_credit_cap, 90)),
      'details', jsonb_build_object(
        'have', v_totals.alt_credits, 
        'max', COALESCE(v_req_version.alt_credit_cap, 90)
      )
    ));
    v_ok := false;
  END IF;

  -- C5: PROVIDER_LIMIT - check per-provider caps
  FOR v_provider_usage IN
    SELECT 
      provider_code,
      SUM(credits) AS credits_used
    FROM plan_course_classification
    WHERE plan_id = p_plan_id
      AND provider_code IS NOT NULL
    GROUP BY provider_code
  LOOP
    -- Check against institution_credit_limits
    FOR v_limits IN
      SELECT icl.*
      FROM institution_credit_limits icl
      JOIN institutions i ON i.id = icl.institution_id
      WHERE i.institution_code = v_prog.institution_code
        AND icl.provider_code = v_provider_usage.provider_code
        AND icl.limit_type = 'provider_max'
    LOOP
      IF v_provider_usage.credits_used > v_limits.credit_value THEN
        v_violations := v_violations || jsonb_build_array(jsonb_build_object(
          'severity', 'block',
          'code', 'PROVIDER_LIMIT',
          'scope_key', 'provider_' || v_provider_usage.provider_code,
          'provider_code', v_provider_usage.provider_code,
          'message', format('%s credits (%s) exceed limit (%s).', 
            v_provider_usage.provider_code,
            v_provider_usage.credits_used, 
            v_limits.credit_value),
          'details', jsonb_build_object(
            'provider', v_provider_usage.provider_code,
            'have', v_provider_usage.credits_used, 
            'max', v_limits.credit_value
          )
        ));
        v_ok := false;
      END IF;
    END LOOP;
  END LOOP;

  -- C6: BLOCK_COMPLETE - check each requirement block
  FOR v_block IN
    SELECT 
      rb.id,
      rb.title,
      rb.rule_type,
      rb.k,
      rb.credits_needed,
      rb.program_id
    FROM requirement_blocks rb
    WHERE rb.program_id = v_plan.program_id
      AND rb.hidden = false
      AND rb.is_virtual = false
  LOOP
    -- Count courses placed in this block
    SELECT COUNT(*) INTO v_block_count
    FROM user_plan_courses upc
    WHERE upc.plan_id = p_plan_id
      AND upc.requirement_id = v_block.id;

    -- Determine how many are needed based on rule_type
    CASE v_block.rule_type
      WHEN 'ALL' THEN
        SELECT COUNT(*) INTO v_block_needed
        FROM block_members bm
        WHERE bm.block_id = v_block.id;
        
        IF v_block_count < v_block_needed THEN
          v_violations := v_violations || jsonb_build_array(jsonb_build_object(
            'severity', 'block',
            'code', 'BLOCK_INCOMPLETE',
            'scope_key', 'block_' || v_block.id,
            'requirement_block_id', v_block.id,
            'message', format('Block "%s" requires all %s courses; have %s.', 
              v_block.title, v_block_needed, v_block_count),
            'details', jsonb_build_object(
              'block_id', v_block.id,
              'block_title', v_block.title,
              'rule_type', v_block.rule_type,
              'have', v_block_count, 
              'need', v_block_needed
            )
          ));
          v_ok := false;
        END IF;

      WHEN 'K_OF_N' THEN
        IF v_block_count < COALESCE(v_block.k, 1) THEN
          v_violations := v_violations || jsonb_build_array(jsonb_build_object(
            'severity', 'block',
            'code', 'BLOCK_INCOMPLETE',
            'scope_key', 'block_' || v_block.id,
            'requirement_block_id', v_block.id,
            'message', format('Block "%s" requires %s of N courses; have %s.', 
              v_block.title, v_block.k, v_block_count),
            'details', jsonb_build_object(
              'block_id', v_block.id,
              'block_title', v_block.title,
              'rule_type', v_block.rule_type,
              'have', v_block_count, 
              'need', v_block.k
            )
          ));
          v_ok := false;
        END IF;

      WHEN 'CREDITS' THEN
        -- Sum credits for this block
        SELECT COALESCE(SUM(COALESCE(upc.credits_earned, 3)), 0) INTO v_block_count
        FROM user_plan_courses upc
        WHERE upc.plan_id = p_plan_id
          AND upc.requirement_id = v_block.id;
        
        IF v_block_count < COALESCE(v_block.credits_needed, 0) THEN
          v_violations := v_violations || jsonb_build_array(jsonb_build_object(
            'severity', 'block',
            'code', 'BLOCK_INCOMPLETE',
            'scope_key', 'block_' || v_block.id,
            'requirement_block_id', v_block.id,
            'message', format('Block "%s" requires %s credits; have %s.', 
              v_block.title, v_block.credits_needed, v_block_count),
            'details', jsonb_build_object(
              'block_id', v_block.id,
              'block_title', v_block.title,
              'rule_type', v_block.rule_type,
              'have', v_block_count, 
              'need', v_block.credits_needed
            )
          ));
          v_ok := false;
        END IF;
      ELSE
        -- Unknown rule type, skip
        NULL;
    END CASE;
  END LOOP;

  -- C7: NO_DOUBLE_COUNT - check for courses used in multiple blocks
  FOR v_block IN
    SELECT 
      course_id,
      COUNT(DISTINCT requirement_id) AS block_count,
      array_agg(DISTINCT requirement_id) AS blocks_used
    FROM user_plan_courses
    WHERE plan_id = p_plan_id
      AND course_id IS NOT NULL
    GROUP BY course_id
    HAVING COUNT(DISTINCT requirement_id) > 1
  LOOP
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'warn',
      'code', 'DOUBLE_COUNT',
      'scope_key', 'double_' || v_block.course_id,
      'course_id', v_block.course_id,
      'message', format('Course used in %s blocks (may not be allowed).', v_block.block_count),
      'details', jsonb_build_object(
        'course_id', v_block.course_id,
        'blocks_used', v_block.blocks_used
      )
    ));
    -- Double-count is a warning, not blocking by default
  END LOOP;

  -- ==========================================================================
  -- PERSIST VIOLATIONS
  -- ==========================================================================
  IF p_persist THEN
    -- Mark old violations as not current
    UPDATE plan_constraint_violations
    SET is_current = false, updated_at = now()
    WHERE plan_id = p_plan_id AND is_current = true;

    -- Insert new violations
    INSERT INTO plan_constraint_violations
      (plan_id, severity, code, scope_key, requirement_block_id, requirement_id, 
       course_id, provider_code, message, details, is_current)
    SELECT
      p_plan_id,
      (v->>'severity')::text,
      (v->>'code')::text,
      (v->>'scope_key')::text,
      (v->>'requirement_block_id')::uuid,
      (v->>'requirement_id')::uuid,
      (v->>'course_id')::uuid,
      (v->>'provider_code')::text,
      (v->>'message')::text,
      COALESCE((v->'details')::jsonb, '{}'::jsonb),
      true
    FROM jsonb_array_elements(v_violations) v;
  END IF;

  -- ==========================================================================
  -- RETURN RESULT
  -- ==========================================================================
  RETURN jsonb_build_object(
    'ok', v_ok,
    'violations', v_violations,
    'totals', jsonb_build_object(
      'total_credits', v_totals.total_credits,
      'institutional_credits', v_totals.institutional_credits,
      'transfer_credits', v_totals.transfer_credits,
      'alt_credits', v_totals.alt_credits,
      'upper_div_credits', v_totals.upper_div_credits,
      'course_count', v_totals.course_count,
      'completed_count', v_totals.completed_count
    ),
    'program', jsonb_build_object(
      'id', v_prog.id,
      'slug', v_prog.program_slug,
      'institution', v_prog.institution_code,
      'credits_required', COALESCE(v_req_version.credits_total, v_prog.degree_total_credits, 120),
      'residency_min', COALESCE(v_req_version.residency_min, 6),
      'transfer_max', COALESCE(v_req_version.transfer_max, 114),
      'alt_credit_cap', COALESCE(v_req_version.alt_credit_cap, 90)
    )
  );
END;
$$;

-- 4) Create requirement_eligibility RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION requirement_eligibility(
  p_plan_id uuid,
  p_block_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_prog record;
  v_policy record;
  v_block record;
  v_totals record;
  v_remaining_alt numeric;
  v_remaining_transfer numeric;
  v_results jsonb := '[]'::jsonb;
  v_course record;
BEGIN
  -- 1) Load plan and program context
  SELECT * INTO v_plan FROM user_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('error', 'Plan not found', 'eligible_courses', '[]'::jsonb);
  END IF;

  SELECT * INTO v_prog 
  FROM program_catalog
  WHERE program_slug = v_plan.program_id OR id::text = v_plan.program_id
  LIMIT 1;

  -- 2) Load block
  SELECT * INTO v_block FROM requirement_blocks WHERE id = p_block_id;
  IF v_block IS NULL THEN
    RETURN jsonb_build_object('error', 'Block not found', 'eligible_courses', '[]'::jsonb);
  END IF;

  -- 3) Load policy
  SELECT * INTO v_policy
  FROM institution_policy_packs
  WHERE institution = v_prog.institution_code AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  -- 4) Calculate current usage and remaining caps
  SELECT
    COALESCE(SUM(CASE WHEN source_type = 'alt' THEN credits ELSE 0 END), 0) AS alt_used,
    COALESCE(SUM(CASE WHEN source_type = 'transfer' THEN credits ELSE 0 END), 0) AS transfer_used
  INTO v_totals
  FROM plan_course_classification
  WHERE plan_id = p_plan_id;

  v_remaining_alt := COALESCE((SELECT alt_credit_cap FROM program_requirements_versions 
    WHERE program_catalog_id = v_prog.id ORDER BY version_number DESC LIMIT 1), 90) 
    - COALESCE(v_totals.alt_used, 0);
  
  v_remaining_transfer := COALESCE((SELECT transfer_max FROM program_requirements_versions 
    WHERE program_catalog_id = v_prog.id ORDER BY version_number DESC LIMIT 1), 114) 
    - COALESCE(v_totals.transfer_used, 0);

  -- 5) Get eligible courses from block_members + requirement_options
  FOR v_course IN
    SELECT DISTINCT
      mc.id AS course_id,
      mc.title,
      mc.credits AS course_credits,
      sc.provider_code,
      sc.canonical_code,
      COALESCE(ccs.overall_cri_score, 50) AS cri_score,
      tr.acceptance_status AS transfer_status,
      tr.confidence AS transfer_confidence,
      -- Calculate eligibility flags
      CASE WHEN sc.provider_code IS NULL THEN true ELSE false END AS is_institutional,
      CASE WHEN sc.provider_code IN ('SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE') THEN true ELSE false END AS is_alt,
      CASE WHEN sc.provider_code IS NOT NULL AND sc.provider_code NOT IN ('SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP', 'DSST') THEN true ELSE false END AS is_transfer
    FROM block_members bm
    JOIN marketplace_courses mc ON mc.id = bm.course_id
    LEFT JOIN source_courses sc ON sc.id = bm.course_id
    LEFT JOIN course_cri_scores ccs ON ccs.course_id = bm.course_id
    LEFT JOIN transfer_rules_resolved tr ON tr.source_course_id = sc.id 
      AND tr.target_institution = v_prog.institution_code
    WHERE bm.block_id = p_block_id
    -- Exclude already placed courses
    AND NOT EXISTS (
      SELECT 1 FROM user_plan_courses upc 
      WHERE upc.plan_id = p_plan_id 
        AND upc.course_id = bm.course_id
    )
  LOOP
    -- Build eligibility result
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'course_id', v_course.course_id,
      'title', v_course.title,
      'credits', COALESCE(v_course.course_credits, 3),
      'provider_code', v_course.provider_code,
      'cri_score', v_course.cri_score,
      'eligibility', jsonb_build_object(
        'is_eligible', true, -- Base eligibility
        'within_alt_cap', CASE 
          WHEN v_course.is_alt THEN v_remaining_alt >= COALESCE(v_course.course_credits, 3)
          ELSE true 
        END,
        'within_transfer_cap', CASE 
          WHEN v_course.is_transfer THEN v_remaining_transfer >= COALESCE(v_course.course_credits, 3)
          ELSE true 
        END,
        'transfer_accepted', COALESCE(v_course.transfer_status = 'accepted', v_course.is_institutional),
        'transfer_confidence', v_course.transfer_confidence
      ),
      'explain', ARRAY[
        CASE WHEN v_course.is_institutional THEN 'Institutional course' 
             WHEN v_course.transfer_status = 'accepted' THEN 'Transfer accepted'
             WHEN v_course.is_alt THEN 'Alt-credit eligible'
             ELSE 'Transfer eligibility unknown'
        END,
        CASE WHEN v_course.cri_score >= 70 THEN 'High CRI score'
             WHEN v_course.cri_score >= 50 THEN 'Average CRI score'
             ELSE 'Below average CRI'
        END
      ],
      'score', (
        -- Composite ranking score (0-100)
        (v_course.cri_score * 0.4) +
        (CASE WHEN v_course.transfer_status = 'accepted' THEN 30 ELSE 0 END) +
        (CASE WHEN v_course.is_institutional THEN 20 ELSE 10 END) +
        (CASE WHEN v_course.is_alt AND v_remaining_alt >= COALESCE(v_course.course_credits, 3) THEN 10 ELSE 0 END)
      )::int
    ));
  END LOOP;

  -- Sort by score descending
  SELECT jsonb_agg(elem ORDER BY (elem->>'score')::int DESC)
  INTO v_results
  FROM jsonb_array_elements(v_results) elem;

  RETURN jsonb_build_object(
    'block_id', p_block_id,
    'block_title', v_block.title,
    'rule_type', v_block.rule_type,
    'eligible_courses', COALESCE(v_results, '[]'::jsonb),
    'caps', jsonb_build_object(
      'alt_remaining', v_remaining_alt,
      'transfer_remaining', v_remaining_transfer
    )
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION plan_invariant_checks(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION requirement_eligibility(uuid, uuid) TO authenticated;