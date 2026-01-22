-- Final polish: clamp caps to 0 and add deterministic ordering

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
  SELECT * INTO v_plan FROM user_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('error', 'Plan not found', 'eligible_courses', '[]'::jsonb);
  END IF;

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
    SELECT 
      null::uuid as id,
      v_plan.program_id as program_slug,
      null::text as institution_code,
      30::numeric as alt_credit_cap,
      90::numeric as transfer_max
    INTO v_prog;
  END IF;

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

  SELECT
    COALESCE(SUM(CASE WHEN source_type = 'alt' THEN credits ELSE 0 END), 0) as alt_used,
    COALESCE(SUM(CASE WHEN source_type = 'transfer' THEN credits ELSE 0 END), 0) as transfer_used
  INTO v_totals
  FROM plan_course_classification
  WHERE plan_id = p_plan_id;

  -- Clamp remaining caps to 0 so UI never shows negative
  v_alt_remaining := GREATEST(0, v_prog.alt_credit_cap - v_totals.alt_used);
  v_transfer_remaining := GREATEST(0, v_prog.transfer_max - v_totals.transfer_used);

  -- Deterministic ordering with tie-breakers
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
    ORDER BY COALESCE(ccs.overall_cri_score, 50) DESC, ec.title ASC, ec.id ASC
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