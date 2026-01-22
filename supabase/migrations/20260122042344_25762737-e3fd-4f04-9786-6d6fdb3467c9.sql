-- Fix ROW() fallback to use individual field assignments for type safety

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
  v_institution_id uuid;
  v_violations jsonb := '[]'::jsonb;
  v_ok boolean := true;
  v_totals record;
  v_req record;
  v_req_count integer;
  v_req_credits numeric;
  v_req_needed integer;
  v_course record;
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

  -- 2) Load program from program_catalog (get institution_code)
  SELECT 
    pc.id,
    pc.program_slug,
    pc.institution_code,
    pc.degree_total_credits,
    prv.total_credits,
    prv.residency_min,
    prv.alt_credit_cap,
    prv.transfer_max,
    prv.upper_division_min
  INTO v_prog
  FROM program_catalog pc
  LEFT JOIN program_requirements_versions prv 
    ON prv.program_id = pc.program_slug
    AND prv.is_active = true
  WHERE pc.program_slug = v_plan.program_id 
     OR pc.id::text = v_plan.program_id
  ORDER BY prv.effective_from DESC NULLS LAST
  LIMIT 1;

  IF v_prog IS NULL THEN
    -- Try just program_requirements_versions
    SELECT 
      null::uuid as id,
      prv.program_id as program_slug,
      null::text as institution_code,
      prv.total_credits as degree_total_credits,
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
  END IF;

  IF v_prog IS NULL THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'warn',
      'code', 'PROGRAM_NOT_FOUND',
      'scope_key', 'program',
      'message', 'Program configuration not found; using defaults',
      'details', jsonb_build_object('program_id', v_plan.program_id)
    ));
    -- Initialize with a dummy select to establish record shape, then set defaults
    SELECT 
      null::uuid as id,
      v_plan.program_id as program_slug,
      null::text as institution_code,
      120::integer as degree_total_credits,
      120::numeric as total_credits,
      30::numeric as residency_min,
      30::numeric as alt_credit_cap,
      90::numeric as transfer_max,
      0::numeric as upper_division_min
    INTO v_prog;
  END IF;

  -- 3) Get institution UUID for credit limits lookup
  IF v_prog.institution_code IS NOT NULL THEN
    SELECT i.id INTO v_institution_id
    FROM institutions i
    WHERE i.code = v_prog.institution_code
    LIMIT 1;
    
    -- Warn if institution lookup fails (don't flip v_ok to false)
    IF v_institution_id IS NULL THEN
      v_violations := v_violations || jsonb_build_array(jsonb_build_object(
        'severity', 'info',
        'code', 'INSTITUTION_LOOKUP_MISSING',
        'scope_key', 'institution',
        'message', format('Institution "%s" not found; provider caps not enforced', v_prog.institution_code),
        'details', jsonb_build_object('institution_code', v_prog.institution_code)
      ));
    END IF;
  END IF;

  -- 4) Load institution policy (using actual institution_code)
  IF v_prog.institution_code IS NOT NULL THEN
    SELECT * INTO v_policy
    FROM institution_policy_packs ipp
    WHERE ipp.institution = v_prog.institution_code
      AND ipp.status = 'active'
    ORDER BY ipp.created_at DESC
    LIMIT 1;
  END IF;

  -- 5) Calculate credit totals using plan_course_classification view
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
  IF v_totals.total < COALESCE(v_prog.total_credits, v_prog.degree_total_credits, 120) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'TOTAL_CREDITS',
      'scope_key', 'total_credits',
      'message', format('Plan has %s credits; requires %s.', v_totals.total, COALESCE(v_prog.total_credits, v_prog.degree_total_credits, 120)),
      'details', jsonb_build_object('have', v_totals.total, 'need', COALESCE(v_prog.total_credits, v_prog.degree_total_credits, 120))
    ));
    v_ok := false;
  END IF;

  -- C2: RESIDENCY_MIN check
  IF v_totals.institutional < COALESCE(v_prog.residency_min, 30) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'RESIDENCY_MIN',
      'scope_key', 'residency',
      'message', format('Institutional credits: %s; requires %s.', v_totals.institutional, COALESCE(v_prog.residency_min, 30)),
      'details', jsonb_build_object('have', v_totals.institutional, 'need', COALESCE(v_prog.residency_min, 30))
    ));
    v_ok := false;
  END IF;

  -- C3: TRANSFER_MAX check
  IF v_totals.transfer > COALESCE(v_policy.max_transfer_credits, v_prog.transfer_max, 90) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'TRANSFER_MAX',
      'scope_key', 'transfer_max',
      'message', format('Transfer credits: %s; maximum: %s.', v_totals.transfer, COALESCE(v_policy.max_transfer_credits, v_prog.transfer_max, 90)),
      'details', jsonb_build_object('have', v_totals.transfer, 'max', COALESCE(v_policy.max_transfer_credits, v_prog.transfer_max, 90))
    ));
    v_ok := false;
  END IF;

  -- C4: ALT_CREDIT_CAP check
  IF v_totals.alt > COALESCE(v_prog.alt_credit_cap, 30) THEN
    v_violations := v_violations || jsonb_build_array(jsonb_build_object(
      'severity', 'block',
      'code', 'ALT_CREDIT_CAP',
      'scope_key', 'alt_cap',
      'message', format('Alt-credit: %s; cap: %s.', v_totals.alt, COALESCE(v_prog.alt_credit_cap, 30)),
      'details', jsonb_build_object('have', v_totals.alt, 'max', COALESCE(v_prog.alt_credit_cap, 30))
    ));
    v_ok := false;
  END IF;

  -- C5: PROVIDER_LIMIT check (only if institution lookup succeeded)
  -- Use INNER JOIN so no limit row = no violation (unlimited)
  IF v_institution_id IS NOT NULL THEN
    FOR v_req IN
      SELECT
        pcc.provider_code,
        SUM(pcc.credits) AS provider_credits,
        icl.credit_value AS max_allowed
      FROM plan_course_classification pcc
      JOIN institution_credit_limits icl
        ON icl.provider_code = pcc.provider_code
       AND icl.institution_id = v_institution_id
       AND icl.limit_type = 'max_credits'
      WHERE pcc.plan_id = p_plan_id
        AND pcc.provider_code IS NOT NULL
      GROUP BY pcc.provider_code, icl.credit_value
      HAVING SUM(pcc.credits) > icl.credit_value
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
  END IF;

  -- C6: REQUIREMENT_INCOMPLETE — validate program_requirements
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
    SELECT COUNT(*) INTO v_req_count
    FROM user_plan_courses upc
    WHERE upc.plan_id = p_plan_id
      AND upc.requirement_id = v_req.id;

    SELECT COALESCE(SUM(COALESCE(upc.credits_earned, 3)), 0) INTO v_req_credits
    FROM user_plan_courses upc
    WHERE upc.plan_id = p_plan_id
      AND upc.requirement_id = v_req.id;

    SELECT COUNT(*) INTO v_req_needed
    FROM edu_requirement_options ero
    WHERE ero.requirement_id = v_req.id;

    IF v_req.min_select IS NOT NULL AND v_req.min_select > 0 THEN
      IF v_req_count < v_req.min_select THEN
        v_violations := v_violations || jsonb_build_array(jsonb_build_object(
          'severity', 'block',
          'code', 'REQUIREMENT_INCOMPLETE',
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
      IF v_req_credits < v_req.credits_required THEN
        v_violations := v_violations || jsonb_build_array(jsonb_build_object(
          'severity', 'block',
          'code', 'REQUIREMENT_INCOMPLETE',
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
      IF v_req_count < v_req_needed THEN
        v_violations := v_violations || jsonb_build_array(jsonb_build_object(
          'severity', 'block',
          'code', 'REQUIREMENT_INCOMPLETE',
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

  -- C7: NO_DOUBLE_COUNT
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
      'id', COALESCE(v_prog.id::text, v_prog.program_slug),
      'name', v_prog.program_slug,
      'total_credits', COALESCE(v_prog.total_credits, v_prog.degree_total_credits, 120),
      'residency_min', COALESCE(v_prog.residency_min, 30),
      'alt_credit_cap', COALESCE(v_prog.alt_credit_cap, 30),
      'transfer_max', COALESCE(v_prog.transfer_max, 90)
    )
  );
END;
$$;

-- Same fix for requirement_eligibility
CREATE OR REPLACE FUNCTION public.requirement_eligibility(p_plan_id uuid, p_block_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_prog record;
  v_req record;
  v_totals record;
  v_results jsonb := '[]'::jsonb;
  v_course record;
  v_score numeric;
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

  -- Load program context (need institution_code for transfer rules)
  SELECT 
    pc.id,
    pc.program_slug,
    pc.institution_code,
    COALESCE(prv.alt_credit_cap, 30) as alt_credit_cap,
    COALESCE(prv.transfer_max, 90) as transfer_max
  INTO v_prog
  FROM program_catalog pc
  LEFT JOIN program_requirements_versions prv 
    ON prv.program_id = pc.program_slug
    AND prv.is_active = true
  WHERE pc.program_slug = v_plan.program_id 
     OR pc.id::text = v_plan.program_id
  ORDER BY prv.effective_from DESC NULLS LAST
  LIMIT 1;

  IF v_prog IS NULL THEN
    -- Fallback: use SELECT to establish record shape with defaults
    SELECT 
      null::uuid as id,
      prv.program_id as program_slug,
      null::text as institution_code,
      COALESCE(prv.alt_credit_cap, 30) as alt_credit_cap,
      COALESCE(prv.transfer_max, 90) as transfer_max
    INTO v_prog
    FROM program_requirements_versions prv
    WHERE prv.program_id = v_plan.program_id
      AND prv.is_active = true
    ORDER BY prv.effective_from DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_prog IS NULL THEN
    -- Use defaults with SELECT for type safety
    SELECT 
      null::uuid as id,
      v_plan.program_id as program_slug,
      null::text as institution_code,
      30::numeric as alt_credit_cap,
      90::numeric as transfer_max
    INTO v_prog;
  END IF;

  -- Load requirement (p_block_id is program_requirements.id)
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

  -- Calculate current totals for cap computation
  SELECT
    COALESCE(SUM(CASE WHEN source_type = 'alt' THEN credits ELSE 0 END), 0) as alt_used,
    COALESCE(SUM(CASE WHEN source_type = 'transfer' THEN credits ELSE 0 END), 0) as transfer_used
  INTO v_totals
  FROM plan_course_classification
  WHERE plan_id = p_plan_id;

  v_alt_remaining := v_prog.alt_credit_cap - v_totals.alt_used;
  v_transfer_remaining := v_prog.transfer_max - v_totals.transfer_used;

  -- Get eligible courses from edu_requirement_options
  FOR v_course IN
    SELECT DISTINCT
      ec.id AS course_id,
      ec.title,
      ec.credits AS course_credits,
      ec.code AS course_code,
      ep.code AS provider_code,
      COALESCE(ccs.overall_cri_score, 50)::numeric AS cri_score,
      LOWER(tr.acceptance_status) AS transfer_status,
      tr.confidence AS transfer_confidence,
      ep.provider_type
    FROM edu_requirement_options ero
    JOIN edu_courses ec ON ec.id = ero.course_id
    LEFT JOIN edu_providers ep ON ep.id = ec.provider_id
    LEFT JOIN course_cri_scores ccs ON ccs.course_id = ec.id
    LEFT JOIN transfer_rules_resolved tr 
      ON v_prog.institution_code IS NOT NULL
      AND tr.source_course_code = ec.code
      AND tr.target_institution = v_prog.institution_code
      AND (tr.effective_end IS NULL OR tr.effective_end > CURRENT_DATE)
      AND LOWER(tr.status) = 'active'
    WHERE ero.requirement_id = p_block_id
      AND NOT EXISTS (
        SELECT 1 FROM user_plan_courses upc
        WHERE upc.plan_id = p_plan_id
          AND upc.course_id = ec.id
      )
    ORDER BY COALESCE(ccs.overall_cri_score, 50) DESC
    LIMIT 20
  LOOP
    v_eligibility := jsonb_build_object(
      'transfer_accepted', COALESCE(v_course.transfer_status = 'accepted', false),
      'provider_allowed', true,
      'within_alt_cap', v_alt_remaining >= COALESCE(v_course.course_credits, 3),
      'within_transfer_cap', v_transfer_remaining >= COALESCE(v_course.course_credits, 3),
      'fits_upper_div', true
    );

    v_explain := ARRAY[]::text[];
    
    IF v_prog.institution_code IS NULL THEN
      v_explain := array_append(v_explain, 'Transfer eligibility unknown (no institution context)');
    ELSIF v_course.transfer_status = 'accepted' THEN
      v_explain := array_append(v_explain, format('Pre-approved for %s', v_prog.institution_code));
    END IF;
    
    IF v_course.cri_score >= 80 THEN
      v_explain := array_append(v_explain, 'High CRI score');
    END IF;
    IF v_alt_remaining >= COALESCE(v_course.course_credits, 3) THEN
      v_explain := array_append(v_explain, 'Within alt-credit cap');
    END IF;
    IF v_course.transfer_confidence IS NOT NULL AND v_course.transfer_confidence >= 0.8 THEN
      v_explain := array_append(v_explain, 'High transfer confidence');
    END IF;

    v_score := LEAST(100::numeric, GREATEST(0::numeric,
      (COALESCE(v_course.cri_score, 50)::numeric * 0.4) +
      CASE WHEN v_course.transfer_status = 'accepted' THEN 30::numeric ELSE 0::numeric END +
      CASE WHEN v_alt_remaining >= COALESCE(v_course.course_credits, 3) THEN 20::numeric ELSE 0::numeric END +
      CASE WHEN v_course.transfer_confidence >= 0.8 THEN 10::numeric ELSE 0::numeric END
    ));

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'course_id', v_course.course_id,
      'title', v_course.title,
      'credits', COALESCE(v_course.course_credits, 3),
      'provider_code', v_course.provider_code,
      'cri_score', v_course.cri_score,
      'eligibility', v_eligibility,
      'explain', v_explain,
      'score', v_score::integer
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