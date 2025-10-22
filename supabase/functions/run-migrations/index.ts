// deno-lint-ignore-file no-explicit-any
// Deno Edge Function: run-migrations
// Creates/aligns ONLY the schema your frontend already uses.

import postgres from 'https://esm.sh/postgres@3.4.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: any) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_DB_URL");
    if (!url) return json(500, { error: "Missing SUPABASE_DB_URL secret" });

    console.log('Connecting to database...');
    const sql = postgres(url);

    // If we can see the new column on credit_transfer_rules, we likely already ran
    const already = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='credit_transfer_rules'
        AND column_name='source_course_code' LIMIT 1
    `;
    if (already.length > 0) {
      console.log('Migrations already applied');
      await sql.end();
      return json(200, { message: "Migrations already applied", alreadyApplied: true });
    }

    console.log('Starting migrations...');

    // 0) Providers — add provider_code (don't recreate table!)
    await sql`
      ALTER TABLE IF EXISTS public.providers
        ADD COLUMN IF NOT EXISTS provider_code TEXT
    `;
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'providers_code_unique') THEN
          ALTER TABLE public.providers ADD CONSTRAINT providers_code_unique UNIQUE(provider_code);
        END IF;
      END$$
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_providers_code ON public.providers(provider_code)
    `;
    console.log('✓ Provider schema updated');

    // 1) Requirement Catalog
    await sql`
      CREATE TABLE IF NOT EXISTS public.requirement_catalog (
        canon_req_code      TEXT PRIMARY KEY,
        title               TEXT NOT NULL,
        area                TEXT,
        level_hint          INTEGER,
        credits_typical     INTEGER,
        description         TEXT,
        created_at          TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log('✓ Requirement catalog created');

    // 2) Canonical Requirement Map
    await sql`
      CREATE TABLE IF NOT EXISTS public.canonical_requirement_map (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        canon_req_code        TEXT NOT NULL REFERENCES public.requirement_catalog(canon_req_code) ON DELETE CASCADE,
        marketplace_course_id UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
        confidence            NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
        source                TEXT,
        created_at            TIMESTAMPTZ DEFAULT now(),
        UNIQUE (canon_req_code, marketplace_course_id)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_canon_map_code ON public.canonical_requirement_map(canon_req_code)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_canon_map_course ON public.canonical_requirement_map(marketplace_course_id)
    `;
    console.log('✓ Canonical requirement map created');

    // 3) Credit Transfer Rules (original schema your UI uses)
    await sql`
      CREATE TABLE IF NOT EXISTS public.credit_transfer_rules (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_institution   TEXT NOT NULL,
        source_course_code   TEXT,
        target_institution   TEXT NOT NULL,
        target_course_code   TEXT,
        acceptance_status    TEXT CHECK (acceptance_status IN ('accepted','elective','rejected')),
        rule_source          TEXT,
        confidence           NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
        evidence_url         TEXT,
        precedence           SMALLINT DEFAULT 0,
        effective_from       DATE DEFAULT CURRENT_DATE,
        effective_to         DATE
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_transfer_rule_lookup
        ON public.credit_transfer_rules (source_institution, source_course_code, target_institution)
        WHERE source_course_code IS NOT NULL
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_transfer_rules_badge_lookup
        ON public.credit_transfer_rules (source_institution, source_course_code, target_institution, acceptance_status)
    `;
    console.log('✓ Credit transfer rules created');

    // 4) Option Exclusions (mutual exclusivity for marketplace courses)
    await sql`
      CREATE TABLE IF NOT EXISTS public.option_exclusions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        option_a_id  UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
        option_b_id  UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
        reason       TEXT NOT NULL DEFAULT 'Equivalent/overlapping credit - only one counts',
        created_at   TIMESTAMPTZ DEFAULT now(),
        CHECK (option_a_id < option_b_id),
        UNIQUE (option_a_id, option_b_id)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_exclusions_a ON public.option_exclusions(option_a_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_exclusions_b ON public.option_exclusions(option_b_id)
    `;
    console.log('✓ Option exclusions created');

    // 5) Partner policies: keep existing table/column names
    // (If you already have it, we only add helpful indexes)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_policies_active
        ON public.partner_policies (partner_code, effective_from, effective_to)
    `;
    console.log('✓ Partner policies indexed');

    // 6) RLS (public read + service role full)
    await sql`
      ALTER TABLE public.requirement_catalog ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.canonical_requirement_map ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.option_exclusions ENABLE ROW LEVEL SECURITY
    `;
    await sql`
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
      END$$
    `;
    console.log('✓ RLS policies applied');

    await sql.end();
    console.log('✅ All migrations complete: 6/6');
    return json(200, { message: "✅ Migrations applied: 6/6" });
  } catch (e) {
    console.error('Migration error:', e);
    return json(500, { error: "migration_failed", details: String(e) });
  }
});
