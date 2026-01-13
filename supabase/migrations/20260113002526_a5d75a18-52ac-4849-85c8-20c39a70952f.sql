-- Drop existing function first, then recreate
DROP FUNCTION IF EXISTS public.activate_policy_pack(uuid);

-- Phase D: RPC to promote a draft pack to active (admin action)
CREATE FUNCTION public.activate_policy_pack(
  p_pack_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack RECORD;
  v_user_id UUID;
  v_superseded_count INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can activate policy packs';
  END IF;
  
  -- Get the pack to activate
  SELECT * INTO v_pack
  FROM institution_policy_packs
  WHERE id = p_pack_id;
  
  IF v_pack IS NULL THEN
    RAISE EXCEPTION 'Policy pack not found: %', p_pack_id;
  END IF;
  
  -- Verify pack is in draft status
  IF v_pack.status != 'draft' THEN
    RAISE EXCEPTION 'Can only activate packs in draft status. Current status: %', v_pack.status;
  END IF;
  
  -- Verify pack is not hard-blocked (allow soft warnings like missing_provenance_url)
  IF v_pack.blocked_reason IN ('confidence_below_threshold', 'unresolved_conflicts') THEN
    RAISE EXCEPTION 'Cannot activate pack with hard block: %. Resolve conflicts first.', v_pack.blocked_reason;
  END IF;
  
  -- Supersede existing active packs for same institution/scope/year
  UPDATE institution_policy_packs
  SET 
    status = 'superseded',
    stale = false
  WHERE institution = v_pack.institution
    AND pack_scope = v_pack.pack_scope
    AND status = 'active'
    AND id != p_pack_id;
  
  GET DIAGNOSTICS v_superseded_count = ROW_COUNT;
  
  -- Activate the new pack
  UPDATE institution_policy_packs
  SET 
    status = 'active',
    stale = false,
    blocked_reason = NULL,
    verified_by = v_user_id,
    last_verified_at = now()
  WHERE id = p_pack_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'activated_pack_id', p_pack_id,
    'institution', v_pack.institution,
    'superseded_count', v_superseded_count,
    'activated_by', v_user_id,
    'activated_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.activate_policy_pack IS 'Admin RPC to promote a draft policy pack to active status';