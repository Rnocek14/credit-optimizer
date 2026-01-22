
-- ===========================================
-- Ops KV State Table + Policy Scan Cooldown
-- ===========================================

-- Create ops state table for orchestration coordination
CREATE TABLE IF NOT EXISTS public.ops_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS - service role only
ALTER TABLE public.ops_kv ENABLE ROW LEVEL SECURITY;

-- Service role can read/write
CREATE POLICY "service_role_ops_kv"
ON public.ops_kv
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Seed the policy scan marker
INSERT INTO public.ops_kv(key, value)
VALUES ('policy_change_scan', jsonb_build_object('last_ran_at', null))
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- Claim Policy Scan Run RPC (cooldown guard)
-- ===========================================

CREATE OR REPLACE FUNCTION public.claim_policy_scan_run(p_cooldown_minutes int DEFAULT 360)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last timestamptz;
BEGIN
  -- Advisory lock so only one caller can claim at a time
  PERFORM pg_advisory_lock(424242);

  SELECT (value->>'last_ran_at')::timestamptz
    INTO v_last
  FROM public.ops_kv
  WHERE key = 'policy_change_scan';

  IF v_last IS NULL OR v_last < now() - (p_cooldown_minutes || ' minutes')::interval THEN
    UPDATE public.ops_kv
    SET value = jsonb_set(value, '{last_ran_at}', to_jsonb(now()), true),
        updated_at = now()
    WHERE key = 'policy_change_scan';

    PERFORM pg_advisory_unlock(424242);
    RETURN true;
  END IF;

  PERFORM pg_advisory_unlock(424242);
  RETURN false;

EXCEPTION WHEN OTHERS THEN
  PERFORM pg_advisory_unlock(424242);
  RAISE;
END;
$$;

-- Grant to service_role (edge functions use this)
GRANT EXECUTE ON FUNCTION public.claim_policy_scan_run(int) TO service_role;

COMMENT ON FUNCTION public.claim_policy_scan_run IS 
'Returns true if policy-change-scan is due and claims the slot (cooldown default 360 minutes). Uses advisory lock to prevent race conditions.';
