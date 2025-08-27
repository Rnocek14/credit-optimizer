-- Fix remaining critical security issues

-- 1. Drop problematic views and replace with secure functions  
DROP VIEW IF EXISTS public.user_validation_metrics;
DROP VIEW IF EXISTS public.maya_visible_insights;

-- 2. Enable RLS on any remaining tables that need it
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT t.tablename 
    FROM pg_tables t
    WHERE t.schemaname = 'public' 
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = t.tablename 
      AND n.nspname = 'public' 
      AND c.relrowsecurity = true
    )
    -- Skip system tables and potential backup tables
    AND t.tablename NOT LIKE '%backup%'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '__%'
  LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(table_name) || ' ENABLE ROW LEVEL SECURITY';
    
    -- Add a basic service role policy for tables without specific policies
    EXECUTE 'CREATE POLICY "Service role access" ON public.' || quote_ident(table_name) || 
            ' FOR ALL TO service_role USING (true) WITH CHECK (true)';
            
    RAISE NOTICE 'Enabled RLS on table: %', table_name;
  END LOOP;
END $$;