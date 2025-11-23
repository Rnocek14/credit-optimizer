-- ============================================================================
-- OPTIMIZER CLEANUP SCRIPT
-- ============================================================================
-- This script removes ALL optimizer-related tables and policies.
-- Run this BEFORE running optimizer-complete-setup.sql if you're getting
-- "policy already exists" or "table already exists" errors.
--
-- This is safe to run multiple times.
-- ============================================================================

-- Drop all optimizer tables with CASCADE (automatically drops all policies and dependencies)
-- ============================================================================

-- Tables with foreign key dependencies go first
DROP TABLE IF EXISTS public.gened_categories CASCADE;
DROP TABLE IF EXISTS public.gened_frameworks CASCADE;
DROP TABLE IF EXISTS public.cross_institution_equivalencies CASCADE;
DROP TABLE IF EXISTS public.degree_templates CASCADE;
DROP TABLE IF EXISTS public.institution_credit_limits CASCADE;
DROP TABLE IF EXISTS public.alt_credits CASCADE;

-- Note: We're NOT dropping or modifying the institutions table itself
-- Just the code column if you want a completely fresh start
-- Uncomment the line below only if you want to remove the code column:
-- ALTER TABLE public.institutions DROP COLUMN IF EXISTS code;

-- Verification Query
-- ============================================================================
SELECT 
  'Cleanup complete! All optimizer tables and policies removed.' as status,
  'Run optimizer-complete-setup.sql next to recreate everything fresh.' as next_step;
