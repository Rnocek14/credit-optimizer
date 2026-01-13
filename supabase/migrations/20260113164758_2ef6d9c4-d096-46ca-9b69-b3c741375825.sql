-- Secure the invoke_edge_function helper:
-- 1. Remove hardcoded JWT
-- 2. Add function name allowlist
-- 3. Fix search_path to include net schema
-- 4. Require explicit service role key configuration

CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  name text,
  body jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
  project_url text := 'https://vzpissitddpunkpythsb.supabase.co';
  service_role_key text;
  allowed_functions text[] := ARRAY['evidence-backfill-worker', 'run-degree-truth-scan'];
BEGIN
  -- 1. Allowlist check - only permit explicitly allowed functions
  IF NOT (name = ANY(allowed_functions)) THEN
    RAISE EXCEPTION 'invoke_edge_function: function "%" not in allowlist', name;
  END IF;

  -- 2. Get service role key from app settings (must be configured externally)
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- 3. Require a key - don't silently fall back to anon
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE EXCEPTION 'invoke_edge_function: missing app.settings.service_role_key - configure it via ALTER DATABASE or session settings';
  END IF;

  -- 4. Use pg_net to POST to the edge function
  PERFORM net.http_post(
    url := project_url || '/functions/v1/' || name,
    body := body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  );
END;
$$;

-- Update comments
COMMENT ON FUNCTION util.invoke_edge_function IS 'Secure helper to invoke allowlisted Supabase Edge Functions via pg_net. Requires app.settings.service_role_key to be configured.';