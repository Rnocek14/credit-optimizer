-- Phase A: Schema enhancements for course-aware nodes with transferability (idempotent)

-- 1) Create course_equivalencies table for ACE/CLEP and provider mappings
CREATE TABLE IF NOT EXISTS public.course_equivalencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  equivalent_course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  provider_from TEXT NOT NULL,
  provider_to TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',
  score NUMERIC DEFAULT 0.85,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Enhance transfer_rules table (idempotent column additions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transfer_rules') THEN
    CREATE TABLE public.transfer_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      block_id UUID NOT NULL,
      provider_id TEXT,
      course_id UUID REFERENCES public.edu_courses(id) ON DELETE CASCADE,
      transfer_state TEXT NOT NULL DEFAULT 'unknown',
      score NUMERIC DEFAULT 0.5,
      notes TEXT,
      updated_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now()
    );
  ELSE
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transfer_rules' AND column_name = 'block_id') THEN
      ALTER TABLE public.transfer_rules ADD COLUMN block_id UUID;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transfer_rules' AND column_name = 'course_id') THEN
      ALTER TABLE public.transfer_rules ADD COLUMN course_id UUID REFERENCES public.edu_courses(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transfer_rules' AND column_name = 'transfer_state') THEN
      ALTER TABLE public.transfer_rules ADD COLUMN transfer_state TEXT NOT NULL DEFAULT 'unknown';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transfer_rules' AND column_name = 'score') THEN
      ALTER TABLE public.transfer_rules ADD COLUMN score NUMERIC DEFAULT 0.5;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transfer_rules' AND column_name = 'notes') THEN
      ALTER TABLE public.transfer_rules ADD COLUMN notes TEXT;
    END IF;
  END IF;
END $$;

-- 3) Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_course_equiv_course_id ON public.course_equivalencies(course_id);
CREATE INDEX IF NOT EXISTS idx_course_equiv_equiv_course_id ON public.course_equivalencies(equivalent_course_id);
CREATE INDEX IF NOT EXISTS idx_course_equiv_provider_from ON public.course_equivalencies(provider_from);
CREATE INDEX IF NOT EXISTS idx_transfer_rules_block_id ON public.transfer_rules(block_id);
CREATE INDEX IF NOT EXISTS idx_transfer_rules_course_id ON public.transfer_rules(course_id);
CREATE INDEX IF NOT EXISTS idx_transfer_rules_state ON public.transfer_rules(transfer_state);

-- 4) Enable RLS (idempotent)
ALTER TABLE public.course_equivalencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_rules ENABLE ROW LEVEL SECURITY;

-- 5) Create policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'course_equivalencies' AND policyname = 'Public read access to course equivalencies') THEN
    CREATE POLICY "Public read access to course equivalencies"
      ON public.course_equivalencies FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'course_equivalencies' AND policyname = 'Service role can manage course equivalencies') THEN
    CREATE POLICY "Service role can manage course equivalencies"
      ON public.course_equivalencies FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transfer_rules' AND policyname = 'Public read access to transfer rules') THEN
    CREATE POLICY "Public read access to transfer rules"
      ON public.transfer_rules FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transfer_rules' AND policyname = 'Service role can manage transfer rules') THEN
    CREATE POLICY "Service role can manage transfer rules"
      ON public.transfer_rules FOR ALL USING (true);
  END IF;
END $$;

-- 6) Create trigger function and trigger (idempotent)
CREATE OR REPLACE FUNCTION public.update_transfer_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transfer_rules_updated_at ON public.transfer_rules;
CREATE TRIGGER update_transfer_rules_updated_at
  BEFORE UPDATE ON public.transfer_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transfer_rules_updated_at();