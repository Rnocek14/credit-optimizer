-- ============================================================================
-- Phase 1: Production-Grade Schema Enhancement for Marketplace Courses (FIXED)
-- ============================================================================
-- Purpose: Add columns, constraints, indexes, and RLS for marketplace ecosystem
-- Fix: Corrected credit_transfer_rules index to use acceptance_status column
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Create Enums for Type Safety
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE delivery_mode_enum AS ENUM (
    'asynchronous',
    'synchronous', 
    'hybrid',
    'testing_center'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_level_enum AS ENUM (
    'introductory',
    'intermediate',
    'advanced',
    'graduate'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Step 2: Add Production Columns to marketplace_courses
-- ============================================================================

ALTER TABLE public.marketplace_courses 
  ADD COLUMN IF NOT EXISTS ace_recommendation_id TEXT,
  ADD COLUMN IF NOT EXISTS nccrs_course_id TEXT,
  ADD COLUMN IF NOT EXISTS proctoring_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_mode delivery_mode_enum DEFAULT 'asynchronous',
  ADD COLUMN IF NOT EXISTS subject_area TEXT;

-- ============================================================================
-- Step 3: Add Production Columns to providers
-- ============================================================================

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 70,
  ADD COLUMN IF NOT EXISTS ace_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nccrs_approved BOOLEAN DEFAULT false;

-- ============================================================================
-- Step 4: Add Constraints for Data Integrity
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.marketplace_courses 
    ADD CONSTRAINT marketplace_courses_provider_title_unique 
    UNIQUE (provider_id, title);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.marketplace_courses
    ADD CONSTRAINT marketplace_courses_code_unique
    UNIQUE (code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.marketplace_courses
    ADD CONSTRAINT marketplace_courses_credits_positive
    CHECK (credits >= 0 AND credits <= 10);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.marketplace_courses
    ADD CONSTRAINT marketplace_courses_cost_positive
    CHECK (cost_usd IS NULL OR cost_usd >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.marketplace_courses
    ADD CONSTRAINT marketplace_courses_cri_range
    CHECK (cri_score IS NULL OR (cri_score >= 0 AND cri_score <= 100));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.providers
    ADD CONSTRAINT providers_reputation_range
    CHECK (reputation_score >= 0 AND reputation_score <= 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Step 5: Add Performance Indexes (Optimized for UI Queries) - FIXED
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_marketplace_courses_provider_subject 
  ON public.marketplace_courses(provider_id, subject_area) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_courses_level 
  ON public.marketplace_courses(level) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_courses_code 
  ON public.marketplace_courses(code)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_courses_ace 
  ON public.marketplace_courses(ace_recommendation_id) 
  WHERE active = true AND ace_recommendation_id IS NOT NULL;

-- FIXED: Use correct table structure for credit_transfer_rules
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_target 
  ON public.credit_transfer_rules(target_institution, target_course_code);

-- FIXED: Use acceptance_status instead of transfer_status
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_source
  ON public.credit_transfer_rules(source_institution, source_course_code)
  WHERE acceptance_status != 'rejected';

-- ============================================================================
-- Step 6: Enable RLS and Create Policies
-- ============================================================================

ALTER TABLE public.marketplace_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_courses_public_read"
ON public.marketplace_courses FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "marketplace_courses_service_write"
ON public.marketplace_courses FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_public_read"
ON public.providers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "providers_service_write"
ON public.providers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Step 7: Add Documentation Comments
-- ============================================================================

COMMENT ON COLUMN public.marketplace_courses.ace_recommendation_id IS 'ACE course recommendation ID for transfer credit eligibility';
COMMENT ON COLUMN public.marketplace_courses.nccrs_course_id IS 'NCCRS course ID for credit transfer recognition';
COMMENT ON COLUMN public.marketplace_courses.proctoring_required IS 'Whether course requires proctored exams';
COMMENT ON COLUMN public.marketplace_courses.delivery_mode IS 'How the course is delivered (async, sync, hybrid, testing center)';
COMMENT ON COLUMN public.marketplace_courses.subject_area IS 'Subject category for filtering (e.g., mathematics, computer-science)';
COMMENT ON COLUMN public.providers.reputation_score IS 'Provider quality score (0-100) used in CRI calculation';
COMMENT ON COLUMN public.providers.ace_approved IS 'Whether provider is ACE-approved for credit recommendations';
COMMENT ON COLUMN public.providers.nccrs_approved IS 'Whether provider is NCCRS-approved for credit transfer';

COMMIT;