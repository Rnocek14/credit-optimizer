-- Create resolve_policy_conflict RPC for admin conflict resolution
CREATE OR REPLACE FUNCTION public.resolve_policy_conflict(
  p_institution TEXT,
  p_field_name TEXT,
  p_chosen_value JSONB,
  p_citation_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_override_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Upsert into ground_truth_overrides
  INSERT INTO ground_truth_overrides (
    institution,
    field_name,
    chosen_value,
    citation_url,
    notes,
    resolved_by,
    resolved_at
  )
  VALUES (
    p_institution,
    p_field_name,
    p_chosen_value,
    p_citation_url,
    p_notes,
    v_user_id,
    now()
  )
  ON CONFLICT (institution, field_name) 
  DO UPDATE SET
    chosen_value = EXCLUDED.chosen_value,
    citation_url = EXCLUDED.citation_url,
    notes = EXCLUDED.notes,
    resolved_by = EXCLUDED.resolved_by,
    resolved_at = EXCLUDED.resolved_at
  RETURNING id INTO v_override_id;

  RETURN jsonb_build_object(
    'success', true,
    'override_id', v_override_id,
    'institution', p_institution,
    'field_name', p_field_name
  );
END;
$$;

-- Grant execute to authenticated users (admin check should be in app layer)
GRANT EXECUTE ON FUNCTION public.resolve_policy_conflict TO authenticated;