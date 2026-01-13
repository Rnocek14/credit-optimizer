-- Drop existing functions to change return types
DROP FUNCTION IF EXISTS util.run_degree_truth_scan(text, boolean);
DROP FUNCTION IF EXISTS util.invoke_edge_function(text, jsonb);

-- Recreate invoke_edge_function with fixed parameter name and request_id return
CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  function_name text,
  body jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
  project_url text := 'https://vzpissitddpunkpythsb.supabase.co';
  service_role_key text;
  allowed_functions text[] := ARRAY['evidence-backfill-worker', 'run-degree-truth-scan'];
  request_id bigint;
BEGIN
  -- 1. Allowlist check
  IF NOT (function_name = ANY(allowed_functions)) THEN
    RAISE EXCEPTION 'invoke_edge_function: function "%" not in allowlist', function_name;
  END IF;

  -- 2. Get service role key from Vault (explicit alias to avoid ambiguity)
  SELECT ds.decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'service_role_key'
  LIMIT 1;
  
  -- 3. Require a key
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE EXCEPTION 'invoke_edge_function: missing service_role_key in vault';
  END IF;

  -- 4. POST to edge function, return request_id for debugging
  SELECT net.http_post(
    url := project_url || '/functions/v1/' || function_name,
    body := body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  ) INTO request_id;
  
  RETURN request_id;
END;
$$;

-- Recreate run_degree_truth_scan
CREATE OR REPLACE FUNCTION util.run_degree_truth_scan(
  program_code text DEFAULT 'BSBA',
  auto_fix boolean DEFAULT false
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN util.invoke_edge_function(
    function_name => 'run-degree-truth-scan',
    body => jsonb_build_object('program_code', program_code, 'auto_fix', auto_fix)
  );
END;
$$;

COMMENT ON FUNCTION util.invoke_edge_function IS 'Secure edge function invoker via pg_net. Returns request_id for debugging.';