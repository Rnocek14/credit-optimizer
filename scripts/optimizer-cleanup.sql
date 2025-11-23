-- ============================================================================
-- OPTIMIZER CLEANUP SCRIPT - NUCLEAR OPTION
-- ============================================================================
-- This drops ALL optimizer tables in a single transaction
-- Handles all dependency orders automatically
-- ============================================================================

DO $$ 
BEGIN
  -- Drop all tables in a single statement (PostgreSQL handles dependency order)
  DROP TABLE IF EXISTS 
    public.gened_categories,
    public.gened_frameworks,
    public.cross_institution_equivalencies,
    public.degree_templates,
    public.institution_credit_limits,
    public.alt_credits
  CASCADE;
  
  RAISE NOTICE 'Cleanup complete! All optimizer tables and policies removed.';
END $$;

-- Optional: Remove code column from institutions
-- Uncomment only if you want a completely fresh start:
-- ALTER TABLE public.institutions DROP COLUMN IF EXISTS code CASCADE;

SELECT 'Run optimizer-complete-setup.sql next to recreate everything fresh.' as next_step;
