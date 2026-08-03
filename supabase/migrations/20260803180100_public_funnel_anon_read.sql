-- Guarantee the PUBLIC funnel works for anonymous visitors.
--
-- /compare and /plan/preview are public routes, but three different setup
-- scripts created conflicting SELECT policies for degree_templates over time
-- (scripts/optimizer-tables-setup.sql: TO authenticated;
--  scripts/optimizer-complete-setup.sql: TO public). If the authenticated-only
-- variant is what's live, every anonymous visitor sees an empty compare page.
--
-- RLS policies are permissive (OR'd), so ADDING these policies guarantees
-- anon read access regardless of which older policy exists. Scope is limited
-- to the exact data the public funnel renders.

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'degree_templates') THEN
    DROP POLICY IF EXISTS "funnel_anon_read_active_templates" ON public.degree_templates;
    CREATE POLICY "funnel_anon_read_active_templates"
      ON public.degree_templates FOR SELECT
      TO anon, authenticated
      USING (status = 'active');
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'template_baseline_snapshots') THEN
    DROP POLICY IF EXISTS "funnel_anon_read_baselines" ON public.template_baseline_snapshots;
    CREATE POLICY "funnel_anon_read_baselines"
      ON public.template_baseline_snapshots FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alt_provider_pricing_packs') THEN
    DROP POLICY IF EXISTS "funnel_anon_read_pricing" ON public.alt_provider_pricing_packs;
    CREATE POLICY "funnel_anon_read_pricing"
      ON public.alt_provider_pricing_packs FOR SELECT
      TO anon, authenticated
      USING (status = 'active');
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'institutions') THEN
    DROP POLICY IF EXISTS "funnel_anon_read_institutions" ON public.institutions;
    CREATE POLICY "funnel_anon_read_institutions"
      ON public.institutions FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
