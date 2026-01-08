// Deno Edge Function: setup-school-scraper
// Creates the school scraper tables if they don't exist

import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const pool = new Pool(Deno.env.get("SUPABASE_DB_URL") || "", 3, true);

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) return json(500, { error: "Missing SUPABASE_DB_URL secret" });

    console.log('Connecting to database...');
    const connection = await pool.connect();

    try {
      // Check if tables already exist
      const { rows: tableCheck } = await connection.queryObject(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='school_scrape_jobs' LIMIT 1`
      );

      if (tableCheck.length > 0) {
        console.log('School scraper tables already exist');
        return json(200, { message: "Tables already exist", alreadyApplied: true });
      }

      console.log('Creating school scraper tables...');

      // 1) school_scrape_jobs - Tracks scrape requests
      await connection.queryObject(
        `CREATE TABLE IF NOT EXISTS public.school_scrape_jobs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institution_code text NOT NULL,
          target_urls text[] NOT NULL DEFAULT '{}',
          status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scraping', 'extracting', 'review', 'completed', 'failed')),
          scraped_content jsonb,
          extracted_data jsonb,
          overall_confidence integer,
          error_message text,
          created_by uuid,
          reviewed_by uuid,
          reviewed_at timestamptz,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )`
      );
      console.log('✓ school_scrape_jobs created');

      // 2) policy_field_extractions - Individual extracted fields
      await connection.queryObject(
        `CREATE TABLE IF NOT EXISTS public.policy_field_extractions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          job_id uuid NOT NULL REFERENCES public.school_scrape_jobs(id) ON DELETE CASCADE,
          field_path text NOT NULL,
          extracted_value jsonb,
          confidence integer NOT NULL DEFAULT 0,
          source_quote text,
          source_url text,
          review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'modified')),
          reviewer_notes text,
          final_value jsonb,
          created_at timestamptz DEFAULT now()
        )`
      );
      console.log('✓ policy_field_extractions created');

      // 3) scrape_url_templates - Pre-configured URLs per institution
      await connection.queryObject(
        `CREATE TABLE IF NOT EXISTS public.scrape_url_templates (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institution_code text NOT NULL,
          url text NOT NULL,
          page_type text NOT NULL DEFAULT 'catalog',
          priority integer NOT NULL DEFAULT 1,
          last_scraped_at timestamptz,
          created_at timestamptz DEFAULT now(),
          UNIQUE(institution_code, url)
        )`
      );
      console.log('✓ scrape_url_templates created');

      // Indexes
      await connection.queryObject(`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_institution ON public.school_scrape_jobs(institution_code)`);
      await connection.queryObject(`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON public.school_scrape_jobs(status)`);
      await connection.queryObject(`CREATE INDEX IF NOT EXISTS idx_field_extractions_job ON public.policy_field_extractions(job_id)`);
      await connection.queryObject(`CREATE INDEX IF NOT EXISTS idx_field_extractions_status ON public.policy_field_extractions(review_status)`);
      await connection.queryObject(`CREATE INDEX IF NOT EXISTS idx_url_templates_institution ON public.scrape_url_templates(institution_code)`);
      console.log('✓ Indexes created');

      // RLS
      await connection.queryObject(`ALTER TABLE public.school_scrape_jobs ENABLE ROW LEVEL SECURITY`);
      await connection.queryObject(`ALTER TABLE public.policy_field_extractions ENABLE ROW LEVEL SECURITY`);
      await connection.queryObject(`ALTER TABLE public.scrape_url_templates ENABLE ROW LEVEL SECURITY`);

      // RLS Policies - allow all (admin feature)
      await connection.queryObject(
        `DO $$
         BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='scrape_jobs_all') THEN
             CREATE POLICY scrape_jobs_all ON public.school_scrape_jobs FOR ALL USING (true) WITH CHECK (true);
           END IF;
           IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='field_extractions_all') THEN
             CREATE POLICY field_extractions_all ON public.policy_field_extractions FOR ALL USING (true) WITH CHECK (true);
           END IF;
           IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='url_templates_all') THEN
             CREATE POLICY url_templates_all ON public.scrape_url_templates FOR ALL USING (true) WITH CHECK (true);
           END IF;
         END$$`
      );
      console.log('✓ RLS policies applied');

      // Seed TESU URL templates
      await connection.queryObject(
        `INSERT INTO public.scrape_url_templates (institution_code, url, page_type, priority) VALUES
          ('TESU', 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/methods-of-learning-and-earning-credit/transfer-credit', 'transfer_policy', 1),
          ('TESU', 'https://www.tesu.edu/admissions/faqs/transfer-credits.php', 'transfer_faq', 2),
          ('TESU', 'https://www.tesu.edu/admissions/faqs/credit-hour-residency.php', 'residency', 3),
          ('TESU', 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/degree-programs-and-certificates/overview', 'catalog', 4),
          ('TESU', 'https://www.tesu.edu/tuition-financial-aid/tuition-fees/undergraduate.php', 'tuition', 5),
          ('TESU', 'https://www.tesu.edu/student-resources/transfer-credits/index.php', 'transfer_info', 6)
        ON CONFLICT (institution_code, url) DO NOTHING`
      );
      console.log('✓ TESU URL templates seeded');

      console.log('✅ School scraper setup complete');
      return json(200, { message: "✅ School scraper tables created and seeded" });

    } finally {
      connection.release();
    }

  } catch (e) {
    console.error('Setup error:', e);
    return json(500, { error: "setup_failed", details: String(e) });
  } finally {
    await pool.end();
  }
});
