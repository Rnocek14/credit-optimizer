// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const SQL = {
  enhance_credit_transfer_rules: `
    ALTER TABLE public.credit_transfer_rules
      ADD COLUMN IF NOT EXISTS source_course_code TEXT,
      ADD COLUMN IF NOT EXISTS target_course_code TEXT,
      ADD COLUMN IF NOT EXISTS acceptance_status TEXT CHECK (acceptance_status IN ('accepted','elective','rejected')),
      ADD COLUMN IF NOT EXISTS confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1) DEFAULT 0.8,
      ADD COLUMN IF NOT EXISTS evidence_url TEXT,
      ADD COLUMN IF NOT EXISTS precedence SMALLINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS effective_to DATE;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_institutions_upper') THEN
        ALTER TABLE public.credit_transfer_rules
          ADD CONSTRAINT chk_institutions_upper
          CHECK (source_institution = UPPER(source_institution) AND target_institution = UPPER(target_institution));
      END IF;
    END$$;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_transfer_rule_lookup
      ON public.credit_transfer_rules (source_institution, source_course_code, target_institution)
      WHERE source_course_code IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_transfer_rules_badge_lookup
      ON public.credit_transfer_rules (source_institution, source_course_code, target_institution, acceptance_status);
  `,
  add_provider_codes: `
    ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS provider_code TEXT;
    UPDATE public.providers SET provider_code = 'TESU' WHERE provider_code IS NULL AND name ILIKE '%thomas edison%';
    UPDATE public.providers SET provider_code = 'WGU'  WHERE provider_code IS NULL AND name ILIKE '%western governors%';
    UPDATE public.providers SET provider_code = 'COSC' WHERE provider_code IS NULL AND name ILIKE '%charter oak%';
    UPDATE public.providers SET provider_code = 'EXCU' WHERE provider_code IS NULL AND name ILIKE '%excelsior%';
    UPDATE public.providers SET provider_code = 'SOPHIA' WHERE provider_code IS NULL AND name ILIKE '%sophia%';
    UPDATE public.providers SET provider_code = 'STUDY' WHERE provider_code IS NULL AND name ILIKE '%study.com%';
    UPDATE public.providers SET provider_code = 'CLEP' WHERE provider_code IS NULL AND name ILIKE '%clep%';
    UPDATE public.providers SET provider_code = 'DSST' WHERE provider_code IS NULL AND name ILIKE '%dsst%';
    UPDATE public.providers SET provider_code = 'COUR' WHERE provider_code IS NULL AND name ILIKE '%coursera%';
    UPDATE public.providers SET provider_code = 'EDX'  WHERE provider_code IS NULL AND name ILIKE '%edx%';

    UPDATE public.providers
      SET provider_code = UPPER(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'))
      WHERE provider_code IS NULL;

    ALTER TABLE public.providers
      ALTER COLUMN provider_code SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_provider_code') THEN
        ALTER TABLE public.providers ADD CONSTRAINT uq_provider_code UNIQUE (provider_code);
      END IF;
    END$$;

    CREATE INDEX IF NOT EXISTS idx_providers_code ON public.providers(provider_code);
  `,
  canonical_requirement_catalog: `
    CREATE TABLE IF NOT EXISTS public.requirement_catalog (
      canon_req_code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      area TEXT NOT NULL,
      level_hint INTEGER,
      credits_typical INTEGER DEFAULT 3,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.canonical_requirement_map (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      canon_req_code TEXT NOT NULL REFERENCES public.requirement_catalog(canon_req_code) ON DELETE CASCADE,
      marketplace_course_id UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
      confidence NUMERIC DEFAULT 1.0,
      source TEXT DEFAULT 'MANUAL',
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(canon_req_code, marketplace_course_id)
    );

    CREATE INDEX IF NOT EXISTS idx_canon_map_code ON public.canonical_requirement_map(canon_req_code);
    CREATE INDEX IF NOT EXISTS idx_canon_map_course ON public.canonical_requirement_map(marketplace_course_id);

    ALTER TABLE public.program_requirements
      ADD COLUMN IF NOT EXISTS canon_req_code TEXT REFERENCES public.requirement_catalog(canon_req_code);

    CREATE INDEX IF NOT EXISTS idx_program_req_canon ON public.program_requirements(canon_req_code);
  `,
  option_exclusions: `
    CREATE TABLE IF NOT EXISTS public.option_exclusions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      option_a_id UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
      option_b_id UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
      reason TEXT NOT NULL DEFAULT 'Equivalent/overlapping credit - only one counts',
      created_at TIMESTAMPTZ DEFAULT now(),
      CHECK (option_a_id < option_b_id),
      UNIQUE (option_a_id, option_b_id)
    );

    CREATE INDEX IF NOT EXISTS idx_exclusions_a ON public.option_exclusions(option_a_id);
    CREATE INDEX IF NOT EXISTS idx_exclusions_b ON public.option_exclusions(option_b_id);
  `,
  partner_policy_enhancements: `
    ALTER TABLE public.partner_policies
      ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'institution' CHECK (scope IN ('institution','program')),
      ADD COLUMN IF NOT EXISTS program_code TEXT,
      ADD COLUMN IF NOT EXISTS max_alt_in_major INTEGER,
      ADD COLUMN IF NOT EXISTS free_elective_cap INTEGER,
      ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS effective_to DATE;

    CREATE INDEX IF NOT EXISTS idx_policies_active
      ON public.partner_policies (partner_code, effective_from, effective_to)
      WHERE effective_to IS NULL OR effective_to > CURRENT_DATE;
  `,
  rls_for_new_tables: `
    ALTER TABLE public.requirement_catalog ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.canonical_requirement_map ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.option_exclusions ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rcat_public_read') THEN
        CREATE POLICY rcat_public_read ON public.requirement_catalog FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rcat_all_service') THEN
        CREATE POLICY rcat_all_service ON public.requirement_catalog FOR ALL USING (auth.role() = 'service_role');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='crmap_public_read') THEN
        CREATE POLICY crmap_public_read ON public.canonical_requirement_map FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='crmap_all_service') THEN
        CREATE POLICY crmap_all_service ON public.canonical_requirement_map FOR ALL USING (auth.role() = 'service_role');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='oex_public_read') THEN
        CREATE POLICY oex_public_read ON public.option_exclusions FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='oex_all_service') THEN
        CREATE POLICY oex_all_service ON public.option_exclusions FOR ALL USING (auth.role() = 'service_role');
      END IF;
    END$$;
  `,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_DB_URL");
    if (!url) return json(500, { error: "Missing SUPABASE_DB_URL secret" });

    const client = new Client(url);
    await client.connect();

    // Idempotency check (any one of the new columns is fine)
    const check = await client.queryArray`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='credit_transfer_rules'
        AND column_name='source_course_code'
      LIMIT 1;
    `;
    if (check.rowCount && check.rowCount > 0) {
      await client.end();
      return json(200, { message: "Migrations already applied", alreadyApplied: true });
    }

    await client.queryArray`BEGIN`;
    const order = [
      "enhance_credit_transfer_rules",
      "add_provider_codes",
      "canonical_requirement_catalog",
      "option_exclusions",
      "partner_policy_enhancements",
      "rls_for_new_tables",
    ] as const;

    for (const key of order) {
      await client.queryArray(SQL[key]);
    }
    await client.queryArray`COMMIT`;
    await client.end();

    return json(200, { message: `✅ Migrations applied: ${order.length}/${order.length}` });
  } catch (e) {
    try { /* try to rollback if open */ } catch { /* noop */ }
    return json(500, { error: "migration_failed", details: String(e) });
  }
});
