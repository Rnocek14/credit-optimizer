-- Bulletproof parameter naming to eliminate any future column/arg collisions
DROP FUNCTION IF EXISTS util.run_degree_truth_scan(text, boolean);
DROP FUNCTION IF EXISTS util.invoke_edge_function(text, jsonb);

CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  p_function_name text,
  p_body jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
  v_project_url text := 'https://vzpissitddpunkpythsb.supabase.co';
  v_service_role_key text;
  v_allowed_functions text[] := ARRAY['evidence-backfill-worker', 'run-degree-truth-scan'];
  v_request_id bigint;
BEGIN
  -- 1. Allowlist check (using prefixed param)
  IF NOT (p_function_name = ANY(v_allowed_functions)) THEN
    RAISE EXCEPTION 'invoke_edge_function: function "%" not in allowlist', p_function_name;
  END IF;

  -- 2. Get service role key from Vault (explicit table alias)
  SELECT ds.decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'service_role_key'
  LIMIT 1;
  
  -- 3. Require a key
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE EXCEPTION 'invoke_edge_function: missing service_role_key in vault';
  END IF;

  -- 4. POST to edge function, capture request_id for debugging
  SELECT net.http_post(
    url := v_project_url || '/functions/v1/' || p_function_name,
    body := p_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    )
  ) INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Wrapper for truth scan
CREATE OR REPLACE FUNCTION util.run_degree_truth_scan(
  p_program_code text DEFAULT 'BSBA',
  p_auto_fix boolean DEFAULT false
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN util.invoke_edge_function(
    p_function_name => 'run-degree-truth-scan',
    p_body => jsonb_build_object('program_code', p_program_code, 'auto_fix', p_auto_fix)
  );
END;
$$;

COMMENT ON FUNCTION util.invoke_edge_function IS 'Secure edge function invoker via pg_net. All params prefixed with p_, all locals with v_ to prevent collisions.';