-- Fix plan_invariant_checks and requirement_eligibility to use correct joins
-- user_plan_courses.requirement_id → program_requirements.id

-- Drop and recreate plan_invariant_checks with correct requirement-based logic
CREATE OR REPLACE FUNCTION public.plan_invariant_checks(p_plan_id uuid, p_persist boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_prog record;
  v_policy record;
  v_violations jsonb := '[]'::jsonb;
  v_ok boolean := true;
  v_totals record;
  v_req record;
  v_req_count integer;
  v_req_credits numeric;
  v_req_needed integer;
  v_course record;
  v_course_reqs text[];
BEGIN
  -- 1) Load plan
  SELECT * INTO v_plan
  FROM user_plans
  WHERE id = p_plan_id;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'violations', jsonb_build_array(
        jsonb_build_object(
          'severity', 'block',
          'code', 'PLAN_NOT_FOUND',
          'scope_key', 'plan',
          'message', 'Plan not found',
          'details', jsonb_build_object('plan_id', p_plan_id)
        )
      ),
      'totals', jsonb_build_object('total', 0, 'institutional', 0, 'transfer', 0, 'alt', 0)
    );
  END IF;

  -- 2) Load program from program_requirements_versions (using program_id text)
  SELECT 
    prv.program_id,
    prv.total_credits,
    prv.residency_min,
    prv.alt_credit_cap,
    prv.transfer_max,
    prv.upper_division_min
  INTO v_prog
  FROM program_requirements_versions prv
  WHERE prv.program_id = v_plan.program_id
    AND prv.is_active = true
  ORDER BY prv.effective_from DESC NULLS LAST
  LIMIT 1;

  IF v_prog IS NULL THEN
    -- Fallback: try program_catalog
    SELECT 
      pc.id::text as program_id,
      120 as total_credits,
      30 as residency_min,
      30 as alt_credit_cap,
      90 as transfer_max,
      0 as upper_division_min
    INTO v_prog
    FROM program_catalog pc
    WHERE pc.id::text = v_plan.program_id
    LIMIT 1;
  END IF;

  IF v_prog IS NULL THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'warn',
      'code', 'PROGRAM_NOT_FOUND',
      'scope_key', 'program',
      'message', 'Program configuration not found; using defaults',
      'details', jsonb_build_object('program_id', v_plan.program_id)
    ));
    -- Use defaults
    v_prog := ROW(v_plan.program_id, 120, 30, 30, 90, 0);
  END IF;

  -- 3) Load institution policy (optional)
  SELECT * INTO v_policy
  FROM institution_policy_packs ipp
  WHERE ipp.institution = 'WGU'
    AND ipp.status = 'active'
  ORDER BY ipp.created_at DESC
  LIMIT 1;

  -- 4) Calculate credit totals using plan_course_classification view
  SELECT
    COALESCE(SUM(credits), 0) as total,
    COALESCE(SUM(CASE WHEN source_type = 'institutional' THEN credits ELSE 0 END), 0) as institutional,
    COALESCE(SUM(CASE WHEN source_type = 'transfer' THEN credits ELSE 0 END), 0) as transfer,
    COALESCE(SUM(CASE WHEN source_type = 'alt' THEN credits ELSE 0 END), 0) as alt,
    COALESCE(SUM(CASE WHEN level >= 300 THEN credits ELSE 0 END), 0) as upper_division
  INTO v_totals
  FROM plan_course_classification
  WHERE plan_id = p_plan_id;

  -- C1: TOTAL_CREDITS check
  IF v_totals.total < COALESCE(v_prog.total_credits, 120) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'TOTAL_CREDITS',
      'scope_key', 'total_credits',
      'message', format('Plan has %s credits; requires %s.', v_totals.total, v_prog.total_credits),
      'details', jsonb_build_object('have', v_totals.total, 'need', v_prog.total_credits)
    ));
    v_ok := false;
  END IF;

  -- C2: RESIDENCY_MIN check
  IF v_totals.institutional < COALESCE(v_prog.residency_min, 30) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'RESIDENCY_MIN',
      'scope_key', 'residency',
      'message', format('Institutional credits: %s; requires %s.', v_totals.institutional, v_prog.residency_min),
      'details', jsonb_build_object('have', v_totals.institutional, 'need', v_prog.residency_min)
    ));
    v_ok := false;
  END IF;

  -- C3: TRANSFER_MAX check
  IF v_totals.transfer > COALESCE(COALESCE(v_policy.max_transfer_credits, v_prog.transfer_max), 90) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'TRANSFER_MAX',
      'scope_key', 'transfer_max',
      'message', format('Transfer credits: %s; maximum: %s.', v_totals.transfer, COALESCE(v_policy.max_transfer_credits, v_prog.transfer_max)),
      'details', jsonb_build_object('have', v_totals.transfer, 'max', COALESCE(v_policy.max_transfer_credits, v_prog.transfer_max))
    ));
    v_ok := false;
  END IF;

  -- C4: ALT_CREDIT_CAP check
  IF v_totals.alt > COALESCE(v_prog.alt_credit_cap, 30) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'ALT_CREDIT_CAP',
      'scope_key', 'alt_cap',
      'message', format('Alt-credit: %s; cap: %s.', v_totals.alt, v_prog.alt_credit_cap),
      'details', jsonb_build_object('have', v_totals.alt, 'max', v_prog.alt_credit_cap)
    ));
    v_ok := false;
  END IF;

  -- C5: PROVIDER_LIMIT check (per-provider caps from institution_credit_limits)
  FOR v_req IN
    SELECT 
      pcc.provider_code,
      SUM(pcc.credits) as provider_credits,
      COALESCE(icl.max_credits, 999) as max_allowed
    FROM plan_course_classification pcc
    LEFT JOIN institution_credit_limits icl 
      ON icl.provider_code = pcc.provider_code
      AND icl.institution_code = 'WGU'
    WHERE pcc.plan_id = p_plan_id
      AND pcc.provider_code IS NOT NULL
    GROUP BY pcc.provider_code, icl.max_credits
    HAVING SUM(pcc.credits) > COALESCE(icl.max_credits, 999)
  LOOP
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'PROVIDER_LIMIT',
      'scope_key', 'provider_' || v_req.provider_code,
      'provider_code', v_req.provider_code,
      'message', format('Provider %s: %s credits exceeds limit of %s.', v_req.provider_code, v_req.provider_credits, v_req.max_allowed),
      'details', jsonb_build_object('provider', v_req.provider_code, 'have', v_req.provider_credits, 'max', v_req.max_allowed)
    ));
    v_ok := false;
  END LOOP;

  -- C6: REQUIREMENT_INCOMPLETE (was BLOCK_COMPLETE) — validate program_requirements
  FOR v_req IN
    SELECT
      pr.id,
      pr.name as title,
      pr.category,
      pr.credits_required,
      pr.min_select,
      pr.max_select,
      pr.requirement_block_id
    FROM program_requirements pr
    WHERE pr.program_id = v_plan.program_id
  LOOP
    -- Count courses placed into this requirement
    SELECT COUNT(*) INTO v_req_count
    FROM user_plan_courses upc
    WHERE upc.plan_id = p_plan_id
      AND upc.requirement_id = v_req.id;

    -- Sum credits placed into this requirement
    SELECT COALESCE(SUM(COALESCE(upc.credits_earned, 3)), 0) INTO v_req_credits
    FROM user_plan_courses upc
    WHERE upc.plan_id = p_plan_id
      AND upc.requirement_id = v_req.id;

    -- Get count of required courses from edu_requirement_options
    SELECT COUNT(*) INTO v_req_needed
    FROM edu_requirement_options ero
    WHERE ero.requirement_id = v_req.id;

    -- Check based on min_select (K_OF_N style) or credits_required
    IF v_req.min_select IS NOT NULL AND v_req.min_select > 0 THEN
      -- K_OF_N rule: need at least min_select courses
      IF v_req_count < v_req.min_select THEN
        v_violations := v_violations || jsonb_build_array(jsonb_build_object(
          'severity', 'block',
          'code', 'BLOCK_INCOMPLETE',
          'scope_key', 'req_' || v_req.id,
          'requirement_block_id', v_req.requirement_block_id,
          'requirement_id', v_req.id,
          'message', format('Requirement "%s" requires %s course(s); have %s.', v_req.title, v_req.min_select, v_req_count),
          'details', jsonb_build_object(
            'requirement_id', v_req.id,
            'title', v_req.title,
            'rule_type', 'K_OF_N',
            'have', v_req_count,
            'need', v_req.min_select
          )
        ));
        v_ok := false;
      END IF;
    ELSIF v_req.credits_required IS NOT NULL AND v_req.credits_required > 0 THEN
      -- CREDITS rule: need at least credits_required credits
      IF v_req_credits < v_req.credits_required THEN
        v_violations := v_violations || jsonb_build_array(jsonb_build_object(
          'severity', 'block',
          'code', 'BLOCK_INCOMPLETE',
          'scope_key', 'req_' || v_req.id,
          'requirement_block_id', v_req.requirement_block_id,
          'requirement_id', v_req.id,
          'message', format('Requirement "%s" requires %s credits; have %s.', v_req.title, v_req.credits_required, v_req_credits),
          'details', jsonb_build_object(
            'requirement_id', v_req.id,
            'title', v_req.title,
            'rule_type', 'CREDITS',
            'have', v_req_credits,
            'need', v_req.credits_required
          )
        ));
        v_ok := false;
      END IF;
    ELSIF v_req_needed > 0 THEN
      -- ALL rule: need all courses from options
      IF v_req_count < v_req_needed THEN
        v_violations := v_violations || jsonb_build_array(jsonb_build_object(
          'severity', 'block',
          'code', 'BLOCK_INCOMPLETE',
          'scope_key', 'req_' || v_req.id,
          'requirement_block_id', v_req.requirement_block_id,
          'requirement_id', v_req.id,
          'message', format('Requirement "%s" requires all %s courses; have %s.', v_req.title, v_req_needed, v_req_count),
          'details', jsonb_build_object(
            'requirement_id', v_req.id,
            'title', v_req.title,
            'rule_type', 'ALL',
            'have', v_req_count,
            'need', v_req_needed
          )
        ));
        v_ok := false;
      END IF;
    END IF;
  END LOOP;

  -- C7: NO_DOUBLE_COUNT — detect courses placed in multiple requirements
  FOR v_course IN
    SELECT 
      upc.course_id,
      array_agg(upc.requirement_id::text) as req_ids,
      COUNT(*) as placement_count
    FROM user_plan_courses upc
    WHERE upc.plan_id = p_plan_id
      AND upc.requirement_id IS NOT NULL
    GROUP BY upc.course_id
    HAVING COUNT(*) > 1
  LOOP
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'warn',
      'code', 'DOUBLE_COUNT',
      'scope_key', 'course_' || v_course.course_id,
      'course_id', v_course.course_id,
      'message', format('Course is placed in %s requirements; may not be allowed.', v_course.placement_count),
      'details', jsonb_build_object(
        'course_id', v_course.course_id,
        'requirement_ids', v_course.req_ids,
        'count', v_course.placement_count
      )
    ));
  END LOOP;

  -- Persist violations if requested
  IF p_persist THEN
    UPDATE plan_constraint_violations
    SET is_current = false, updated_at = now()
    WHERE plan_id = p_plan_id AND is_current = true;

    INSERT INTO plan_constraint_violations 
      (plan_id, severity, code, scope_key, requirement_block_id, requirement_id, course_id, provider_code, message, details, is_current)
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

  RETURN jsonb_build_object(
    'ok', v_ok,
    'violations', v_violations,
    'totals', jsonb_build_object(
      'total', v_totals.total,
      'institutional', v_totals.institutional,
      'transfer', v_totals.transfer,
      'alt', v_totals.alt,
      'upper_division', v_totals.upper_division
    ),
    'program', jsonb_build_object(
      'id', v_prog.program_id,
      'total_credits', v_prog.total_credits,
      'residency_min', v_prog.residency_min,
      'alt_credit_cap', v_prog.alt_credit_cap,
      'transfer_max', v_prog.transfer_max
    )
  );
END;
$$;

-- Drop and recreate requirement_eligibility with correct requirement-based logic
CREATE OR REPLACE FUNCTION public.requirement_eligibility(p_plan_id uuid, p_block_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_req record;
  v_totals record;
  v_prog record;
  v_results jsonb := '[]'::jsonb;
  v_course record;
  v_score integer;
  v_eligibility jsonb;
  v_explain text[];
  v_alt_remaining numeric;
  v_transfer_remaining numeric;
BEGIN
  -- Load plan
  SELECT * INTO v_plan FROM user_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('error', 'Plan not found', 'eligible_courses', '[]'::jsonb);
  END IF;

  -- Load requirement (p_block_id is actually program_requirements.id)
  SELECT 
    pr.id,
    pr.name as title,
    pr.category,
    pr.credits_required,
    pr.min_select,
    pr.max_select,
    pr.requirement_block_id
  INTO v_req
  FROM program_requirements pr
  WHERE pr.id = p_block_id;

  IF v_req IS NULL THEN
    RETURN jsonb_build_object('error', 'Requirement not found', 'eligible_courses', '[]'::jsonb);
  END IF;

  -- Load program limits
  SELECT 
    prv.alt_credit_cap,
    prv.transfer_max
  INTO v_prog
  FROM program_requirements_versions prv
  WHERE prv.program_id = v_plan.program_id
    AND prv.is_active = true
  ORDER BY prv.effective_from DESC NULLS LAST
  LIMIT 1;

  -- Calculate current totals
  SELECT
    COALESCE(SUM(CASE WHEN source_type = 'alt' THEN credits ELSE 0 END), 0) as alt_used,
    COALESCE(SUM(CASE WHEN source_type = 'transfer' THEN credits ELSE 0 END), 0) as transfer_used
  INTO v_totals
  FROM plan_course_classification
  WHERE plan_id = p_plan_id;

  v_alt_remaining := COALESCE(v_prog.alt_credit_cap, 30) - v_totals.alt_used;
  v_transfer_remaining := COALESCE(v_prog.transfer_max, 90) - v_totals.transfer_used;

  -- Get eligible courses from edu_requirement_options
  FOR v_course IN
    SELECT DISTINCT
      ec.id AS course_id,
      ec.title,
      ec.credits AS course_credits,
      ep.code AS provider_code,
      COALESCE(ccs.overall_cri_score, 50) AS cri_score,
      tr.acceptance_status AS transfer_status,
      tr.confidence AS transfer_confidence,
      ep.provider_type
    FROM edu_requirement_options ero
    JOIN edu_courses ec ON ec.id = ero.course_id
    LEFT JOIN edu_providers ep ON ep.id = ec.provider_id
    LEFT JOIN course_cri_scores ccs ON ccs.course_id = ec.id
    LEFT JOIN transfer_rules_resolved tr ON tr.source_course_id = ec.id
    WHERE ero.requirement_id = p_block_id
      -- Exclude courses already in plan
      AND NOT EXISTS (
        SELECT 1 FROM user_plan_courses upc
        WHERE upc.plan_id = p_plan_id
          AND upc.course_id = ec.id
      )
    ORDER BY COALESCE(ccs.overall_cri_score, 50) DESC
    LIMIT 20
  LOOP
    -- Build eligibility flags
    v_eligibility := jsonb_build_object(
      'transfer_accepted', COALESCE(v_course.transfer_status = 'ACCEPTED', false),
      'provider_allowed', true,
      'within_alt_cap', v_alt_remaining >= COALESCE(v_course.course_credits, 3),
      'within_transfer_cap', v_transfer_remaining >= COALESCE(v_course.course_credits, 3)
    );

    -- Build explain array
    v_explain := ARRAY[]::text[];
    IF v_course.transfer_status = 'ACCEPTED' THEN
      v_explain := array_append(v_explain, 'Pre-approved transfer');
    END IF;
    IF v_course.cri_score >= 80 THEN
      v_explain := array_append(v_explain, 'High CRI score');
    END IF;
    IF v_alt_remaining >= COALESCE(v_course.course_credits, 3) THEN
      v_explain := array_append(v_explain, 'Within alt-credit cap');
    END IF;

    -- Calculate composite score (0-100)
    v_score := LEAST(100, GREATEST(0,
      COALESCE(v_course.cri_score, 50) * 0.4 +
      CASE WHEN v_course.transfer_status = 'ACCEPTED' THEN 30 ELSE 0 END +
      CASE WHEN v_alt_remaining >= COALESCE(v_course.course_credits, 3) THEN 20 ELSE 0 END +
      CASE WHEN v_course.transfer_confidence >= 0.8 THEN 10 ELSE 0 END
    ))::integer;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'course_id', v_course.course_id,
      'title', v_course.title,
      'credits', COALESCE(v_course.course_credits, 3),
      'provider_code', v_course.provider_code,
      'cri_score', v_course.cri_score,
      'eligibility', v_eligibility,
      'explain', v_explain,
      'score', v_score
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'block_id', v_req.id,
    'block_title', v_req.title,
    'rule_type', CASE 
      WHEN v_req.min_select IS NOT NULL THEN 'K_OF_N'
      WHEN v_req.credits_required IS NOT NULL THEN 'CREDITS'
      ELSE 'ALL'
    END,
    'k', v_req.min_select,
    'credits_needed', v_req.credits_required,
    'eligible_courses', v_results,
    'caps', jsonb_build_object(
      'alt_remaining', v_alt_remaining,
      'transfer_remaining', v_transfer_remaining
    )
  );
END;
$$;