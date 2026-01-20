-- Canonical Source Course Identity Model (Complete)
-- Phase 1: Tables + Resolver View (Lean model)

-- 0) Safety: create a lightweight updated_at trigger helper if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

-- 1) Canonical source course catalog
CREATE TABLE public.source_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_code text NOT NULL,
  canonical_code text NOT NULL,

  canonical_title text,
  canonical_url text,
  active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Normalized generated columns for stable uniqueness + joins
  provider_code_norm text GENERATED ALWAYS AS (upper(btrim(provider_code))) STORED,
  canonical_code_norm text GENERATED ALWAYS AS (upper(btrim(canonical_code))) STORED
);

CREATE UNIQUE INDEX source_courses_provider_canonical_ux
  ON public.source_courses (provider_code_norm, canonical_code_norm);

CREATE INDEX source_courses_provider_idx
  ON public.source_courses (provider_code_norm);

CREATE TRIGGER trg_source_courses_updated_at
BEFORE UPDATE ON public.source_courses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.source_courses IS
'Canonical identity for provider courses/exams. One row per (provider_code, canonical_code).';

-- 2) Alias mapping table: many aliases -> one canonical
CREATE TABLE public.source_course_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  source_course_id uuid NOT NULL REFERENCES public.source_courses(id) ON DELETE CASCADE,

  provider_code text NOT NULL,
  alias_code text NOT NULL,

  alias_title text,
  alias_kind text NOT NULL DEFAULT 'internal_normalized',
  confidence numeric,

  evidence_url text,
  evidence_source_type text,
  evidence_locator text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  provider_code_norm text GENERATED ALWAYS AS (upper(btrim(provider_code))) STORED,
  alias_code_norm text GENERATED ALWAYS AS (upper(btrim(alias_code))) STORED
);

CREATE UNIQUE INDEX source_course_aliases_provider_alias_ux
  ON public.source_course_aliases (provider_code_norm, alias_code_norm);

CREATE INDEX source_course_aliases_source_course_idx
  ON public.source_course_aliases (source_course_id);

CREATE TRIGGER trg_source_course_aliases_updated_at
BEFORE UPDATE ON public.source_course_aliases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.source_course_aliases IS
'Maps internal/legacy/provider alt codes to canonical source_courses identity.';

-- 3) Integrity trigger: alias.provider_code must match source_courses.provider_code
CREATE OR REPLACE FUNCTION public.enforce_alias_provider_matches_canonical()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  canon_provider_norm text;
BEGIN
  SELECT provider_code_norm INTO canon_provider_norm
  FROM public.source_courses
  WHERE id = NEW.source_course_id;

  IF canon_provider_norm IS NULL THEN
    RAISE EXCEPTION 'Invalid source_course_id: %', NEW.source_course_id;
  END IF;

  IF canon_provider_norm <> NEW.provider_code_norm THEN
    RAISE EXCEPTION
      'Alias provider_code (%) must match canonical provider_code (%) for source_course_id %',
      NEW.provider_code_norm, canon_provider_norm, NEW.source_course_id;
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_alias_provider_match
BEFORE INSERT OR UPDATE ON public.source_course_aliases
FOR EACH ROW EXECUTE FUNCTION public.enforce_alias_provider_matches_canonical();

-- 4) Add nullable canonical FK onto transfer rules (Lean model)
ALTER TABLE public.credit_transfer_rules
  ADD COLUMN IF NOT EXISTS source_course_id uuid
  REFERENCES public.source_courses(id) ON DELETE SET NULL;

CREATE INDEX credit_transfer_rules_source_course_id_idx
  ON public.credit_transfer_rules (source_course_id);

COMMENT ON COLUMN public.credit_transfer_rules.source_course_id IS
'Optional canonical identity for source course/exam. If NULL, rule can be resolved via source_course_aliases or remain legacy-unmapped.';

-- 5) Resolver View: canonical identity + resolution status
-- Use unique aliases to avoid ambiguity with credit_transfer_rules columns
CREATE OR REPLACE VIEW public.transfer_rules_resolved AS
WITH base AS (
  SELECT
    r.*,
    upper(btrim(r.source_institution)) AS rule_provider_norm,
    upper(btrim(r.source_course_code)) AS rule_course_code_norm
  FROM public.credit_transfer_rules r
)
SELECT
  b.*,

  -- Canonical identity resolution
  COALESCE(sc_direct.id, sc_alias.id) AS resolved_source_course_id,
  COALESCE(sc_direct.provider_code, sc_alias.provider_code) AS canonical_provider_code,
  COALESCE(sc_direct.canonical_code, sc_alias.canonical_code) AS canonical_code,
  COALESCE(sc_direct.canonical_title, sc_alias.canonical_title) AS canonical_title,
  COALESCE(sc_direct.canonical_url, sc_alias.canonical_url) AS canonical_url,

  CASE
    WHEN sc_direct.id IS NOT NULL THEN 'canonical'
    WHEN sc_alias.id IS NOT NULL THEN 'alias_resolved'
    ELSE 'legacy_unmapped'
  END AS canonical_resolution_status,

  CASE
    WHEN COALESCE(sc_direct.id, sc_alias.id) IS NULL THEN NULL
    ELSE (COALESCE(sc_direct.provider_code, sc_alias.provider_code) || ':' || COALESCE(sc_direct.canonical_code, sc_alias.canonical_code))
  END AS source_course_identity

FROM base b
LEFT JOIN public.source_courses sc_direct
  ON sc_direct.id = b.source_course_id

LEFT JOIN public.source_course_aliases a
  ON a.provider_code_norm = b.rule_provider_norm
 AND a.alias_code_norm = b.rule_course_code_norm

LEFT JOIN public.source_courses sc_alias
  ON sc_alias.id = a.source_course_id;

COMMENT ON VIEW public.transfer_rules_resolved IS
'Resolves transfer rules to canonical source course identity via direct FK or alias mapping. Provides canonical_resolution_status for UI/reporting.';

-- 6) RLS for new tables
ALTER TABLE public.source_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_course_aliases ENABLE ROW LEVEL SECURITY;

-- Public read access (these are reference data)
CREATE POLICY "Allow public read access to source_courses"
  ON public.source_courses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to source_course_aliases"
  ON public.source_course_aliases
  FOR SELECT
  TO public
  USING (true);