-- Phase E: Audit Timeline - Create policy_pack_events table
CREATE TABLE public.policy_pack_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  institution TEXT NOT NULL,
  pack_id UUID REFERENCES institution_policy_packs(id) ON DELETE SET NULL,
  run_id UUID,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT policy_pack_events_type_check CHECK (
    event_type IN (
      'scan_started', 'scan_completed', 'scan_failed',
      'merge_created', 'diffs_written', 'conflict_detected',
      'override_set', 'promotion_attempted', 'promoted', 'promote_blocked'
    )
  )
);

-- Indexes for timeline queries
CREATE INDEX idx_policy_pack_events_institution ON policy_pack_events(institution);
CREATE INDEX idx_policy_pack_events_run_id ON policy_pack_events(run_id);
CREATE INDEX idx_policy_pack_events_pack_id ON policy_pack_events(pack_id);
CREATE INDEX idx_policy_pack_events_created_at ON policy_pack_events(created_at DESC);
CREATE INDEX idx_policy_pack_events_lookup ON policy_pack_events(institution, run_id, created_at DESC);

-- Enable RLS
ALTER TABLE policy_pack_events ENABLE ROW LEVEL SECURITY;

-- Admin can read all events
CREATE POLICY "Admins can read policy events"
ON policy_pack_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Service role / edge functions can insert (no auth check for insert)
CREATE POLICY "Service can insert policy events"
ON policy_pack_events FOR INSERT
WITH CHECK (true);

-- Update activate_policy_pack to log events
CREATE OR REPLACE FUNCTION public.activate_policy_pack(p_pack_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pack RECORD;
  v_old_active_id UUID;
  v_event_payload JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin role required');
  END IF;

  -- Get the pack to promote
  SELECT * INTO v_pack FROM institution_policy_packs WHERE id = p_pack_id;
  IF v_pack IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pack not found');
  END IF;

  -- Verify it's a draft
  IF v_pack.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only draft packs can be promoted');
  END IF;

  -- Check for hard blocks
  IF v_pack.blocked_reason IS NOT NULL AND v_pack.blocked_reason NOT IN ('missing_provenance_url') THEN
    -- Log blocked promotion attempt
    INSERT INTO policy_pack_events (institution, pack_id, run_id, event_type, actor_user_id, payload)
    VALUES (
      v_pack.institution, p_pack_id, v_pack.last_run_id, 'promote_blocked', v_user_id,
      jsonb_build_object(
        'blocked_reason', v_pack.blocked_reason,
        'confidence_score', v_pack.confidence_score
      )
    );
    RETURN jsonb_build_object('success', false, 'error', 'Pack is blocked: ' || v_pack.blocked_reason);
  END IF;

  -- Find current active pack for this institution + scope + year
  SELECT id INTO v_old_active_id
  FROM institution_policy_packs
  WHERE institution = v_pack.institution
    AND pack_scope = v_pack.pack_scope
    AND academic_year = v_pack.academic_year
    AND status = 'active'
  LIMIT 1;

  -- Supersede old active pack
  IF v_old_active_id IS NOT NULL THEN
    UPDATE institution_policy_packs
    SET status = 'superseded', updated_at = now()
    WHERE id = v_old_active_id;
  END IF;

  -- Promote the draft
  UPDATE institution_policy_packs
  SET 
    status = 'active',
    stale = false,
    verified_by = v_user_id,
    verified_at = now(),
    updated_at = now()
  WHERE id = p_pack_id;

  -- Build event payload
  v_event_payload := jsonb_build_object(
    'confidence_score', v_pack.confidence_score,
    'pack_scope', v_pack.pack_scope,
    'academic_year', v_pack.academic_year,
    'superseded_pack_id', v_old_active_id,
    'provenance_url', v_pack.provenance_url
  );

  -- Log promotion event
  INSERT INTO policy_pack_events (institution, pack_id, run_id, event_type, actor_user_id, payload)
  VALUES (v_pack.institution, p_pack_id, v_pack.last_run_id, 'promoted', v_user_id, v_event_payload);

  RETURN jsonb_build_object(
    'success', true,
    'pack_id', p_pack_id,
    'institution', v_pack.institution,
    'superseded_pack_id', v_old_active_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_policy_pack TO authenticated;