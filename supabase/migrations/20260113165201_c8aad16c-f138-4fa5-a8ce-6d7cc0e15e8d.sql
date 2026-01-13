-- Update invoke_edge_function to use Vault for the service role key
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

  -- 2. Get service role key from Vault
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
  
  -- 3. Require a key - don't silently proceed without auth
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE EXCEPTION 'invoke_edge_function: missing service_role_key in vault. Add it with: SELECT vault.create_secret(''your-key'', ''service_role_key'')';
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

-- Add the service role key to vault (user will need to update with real key)
-- This creates a placeholder - user must update via SQL Editor with actual key
DO $$
BEGIN
  -- Check if the secret already exists
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
    -- Create a placeholder (user must update with real key)
    PERFORM vault.create_secret('PLACEHOLDER_REPLACE_ME', 'service_role_key', 'Supabase service role key for internal edge function calls');
  END IF;
END $$;

COMMENT ON FUNCTION util.invoke_edge_function IS 'Secure helper to invoke allowlisted Supabase Edge Functions via pg_net. Requires service_role_key in vault.';