-- Complete the database security fix by moving remaining extensions
-- Move unaccent extension from public to extensions schema
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Add verification queries for ops documentation
-- These queries can be run to verify the security state:
/*
-- Query 1: Confirm no extensions remain in public schema
SELECT extname, nspname 
FROM pg_extension e 
JOIN pg_namespace n ON e.extnamespace = n.oid 
WHERE n.nspname = 'public'
ORDER BY extname;

-- Query 2: Confirm all extensions are in extensions schema  
SELECT extname, nspname
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;

-- Query 3: Confirm no RLS tables lack policies
SELECT relname
FROM pg_class c
WHERE relkind = 'r'
  AND relnamespace = 'public'::regnamespace
  AND relrowsecurity
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  );
*/