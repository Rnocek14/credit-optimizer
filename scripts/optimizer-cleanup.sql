-- ============================================================================
-- OPTIMIZER CLEANUP SCRIPT
-- ============================================================================
-- This script removes ALL optimizer-related tables and policies.
-- Run this BEFORE running optimizer-complete-setup.sql if you're getting
-- "policy already exists" or "table already exists" errors.
--
-- This is safe to run multiple times.
-- ============================================================================

-- Drop all RLS policies (both old and new naming conventions)
-- ============================================================================

-- alt_credits policies
DROP POLICY IF EXISTS "Anyone can view alt_credits" ON public.alt_credits;
DROP POLICY IF EXISTS "Public read access" ON public.alt_credits;
DROP POLICY IF EXISTS "Allow public read access to alt credits" ON public.alt_credits;
DROP POLICY IF EXISTS "Authenticated users can insert alt credits" ON public.alt_credits;
DROP POLICY IF EXISTS "Authenticated users can update alt credits" ON public.alt_credits;

-- cross_institution_equivalencies policies
DROP POLICY IF EXISTS "Anyone can view equivalencies" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Public read access" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Allow public read access to equivalencies" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Authenticated users can insert equivalencies" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Authenticated users can update equivalencies" ON public.cross_institution_equivalencies;

-- degree_templates policies
DROP POLICY IF EXISTS "Anyone can view degree templates" ON public.degree_templates;
DROP POLICY IF EXISTS "Public read access" ON public.degree_templates;
DROP POLICY IF EXISTS "Allow public read access to degree templates" ON public.degree_templates;
DROP POLICY IF EXISTS "Authenticated users can insert degree templates" ON public.degree_templates;
DROP POLICY IF EXISTS "Authenticated users can update degree templates" ON public.degree_templates;

-- gened_frameworks policies
DROP POLICY IF EXISTS "Anyone can view gen-ed frameworks" ON public.gened_frameworks;
DROP POLICY IF EXISTS "Public read access" ON public.gened_frameworks;
DROP POLICY IF EXISTS "Allow public read access to gened frameworks" ON public.gened_frameworks;
DROP POLICY IF EXISTS "Authenticated users can insert gen-ed frameworks" ON public.gened_frameworks;

-- gened_categories policies
DROP POLICY IF EXISTS "Anyone can view gen-ed categories" ON public.gened_categories;
DROP POLICY IF EXISTS "Public read access" ON public.gened_categories;
DROP POLICY IF EXISTS "Allow public read access to gened categories" ON public.gened_categories;
DROP POLICY IF EXISTS "Authenticated users can insert gen-ed categories" ON public.gened_categories;

-- institution_credit_limits policies
DROP POLICY IF EXISTS "Anyone can view credit limits" ON public.institution_credit_limits;
DROP POLICY IF EXISTS "Public read access" ON public.institution_credit_limits;
DROP POLICY IF EXISTS "Allow public read access to credit limits" ON public.institution_credit_limits;
DROP POLICY IF EXISTS "Authenticated users can insert credit limits" ON public.institution_credit_limits;

-- Drop all optimizer tables (in dependency order)
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
