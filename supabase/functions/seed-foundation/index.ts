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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_DB_URL");
    if (!url) return json(500, { error: "Missing SUPABASE_DB_URL secret" });

    const client = new Client(url);
    await client.connect();
    await client.queryArray`BEGIN`;

    // 0) Ensure core providers exist + backfill provider_code
    await client.queryArray`
      -- Defensive: ensure column exists
      ALTER TABLE IF EXISTS public.providers
        ADD COLUMN IF NOT EXISTS provider_code TEXT;

      -- Backfill codes on existing rows by name matching
      UPDATE public.providers SET provider_code = 'TESU'
        WHERE provider_code IS NULL AND name ILIKE '%thomas edison%';
      UPDATE public.providers SET provider_code = 'WGU'
        WHERE provider_code IS NULL AND name ILIKE '%western governors%';
      UPDATE public.providers SET provider_code = 'COSC'
        WHERE provider_code IS NULL AND name ILIKE '%charter oak%';
      UPDATE public.providers SET provider_code = 'EXCU'
        WHERE provider_code IS NULL AND name ILIKE '%excelsior%';
      UPDATE public.providers SET provider_code = 'SOPHIA'
        WHERE provider_code IS NULL AND name ILIKE '%sophia%';
      UPDATE public.providers SET provider_code = 'STUDY'
        WHERE provider_code IS NULL AND name ILIKE '%study%';
      UPDATE public.providers SET provider_code = 'CLEP'
        WHERE provider_code IS NULL AND name ILIKE '%clep%';
      UPDATE public.providers SET provider_code = 'DSST'
        WHERE provider_code IS NULL AND name ILIKE '%dsst%';
      UPDATE public.providers SET provider_code = 'COUR'
        WHERE provider_code IS NULL AND name ILIKE '%coursera%';
      UPDATE public.providers SET provider_code = 'EDX'
        WHERE provider_code IS NULL AND name ILIKE '%edx%';

      -- Insert must-have providers if missing (idempotent)
      INSERT INTO public.providers (name, type, website_url, provider_code)
      SELECT * FROM (VALUES
        ('Thomas Edison State University', 'university', 'https://www.tesu.edu', 'TESU'),
        ('Western Governors University', 'university', 'https://www.wgu.edu', 'WGU'),
        ('Charter Oak State College', 'university', 'https://www.charteroak.edu', 'COSC'),
        ('Excelsior University', 'university', 'https://www.excelsior.edu', 'EXCU'),
        ('Sophia Learning', 'mooc', 'https://www.sophia.org', 'SOPHIA'),
        ('Study.com', 'mooc', 'https://www.study.com', 'STUDY'),
        ('CLEP', 'testing_center', 'https://clep.collegeboard.org', 'CLEP'),
        ('DSST', 'testing_center', 'https://www.dantes.doded.mil/examinee/Exam_Programs/DSST.html', 'DSST'),
        ('Coursera', 'mooc', 'https://www.coursera.org', 'COUR'),
        ('edX', 'mooc', 'https://www.edx.org', 'EDX')
      ) AS v(name, type, website_url, provider_code)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.providers p WHERE p.provider_code = v.provider_code
      );

      -- Enforce constraints
      ALTER TABLE public.providers
        ALTER COLUMN provider_code SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_provider_code'
        ) THEN
          ALTER TABLE public.providers
            ADD CONSTRAINT uq_provider_code UNIQUE (provider_code);
        END IF;
      END$$;

      CREATE INDEX IF NOT EXISTS idx_providers_code ON public.providers(provider_code);
    `;

    // 1) Canonical Requirement Catalog
    const catalog = [
      // English
      ["ENG-101","English Composition I","Written Communication",100,3,"Introductory academic writing"],
      ["ENG-102","English Composition II","Written Communication",100,3,"Advanced writing & research"],
      // Math
      ["MATH-ALG","College Algebra","Mathematics",100,3,"Algebra fundamentals"],
      ["MATH-STAT","Introduction to Statistics","Mathematics",200,3,"Statistical methods"],
      ["MATH-CALC1","Calculus I","Mathematics",200,4,"Single-variable calculus"],
      // Social Sci
      ["PSY-101","Introduction to Psychology","Social Sciences",100,3,"Psychology fundamentals"],
      ["SOC-101","Introduction to Sociology","Social Sciences",100,3,"Society & social behavior"],
      ["HIST-US1","U.S. History I","Social Sciences",100,3,"US to 1877"],
      // Comm
      ["COMM-SPEECH","Public Speaking","Communication",100,3,"Oral communication"],
      // CS Core
      ["CS-101","Introduction to Computer Science","Computer Science",100,3,"Programming fundamentals"],
      ["CS-DISCRETE","Discrete Mathematics","Computer Science",200,3,"Math foundations for CS"],
      ["CS-DATASTRUCT","Data Structures","Computer Science",200,3,"Core data structures & algos"],
      ["CS-DATABASE","Introduction to Databases","Computer Science",200,3,"Database & SQL basics"],
    ];

    for (const r of catalog) {
      await client.queryArray`
        INSERT INTO public.requirement_catalog (canon_req_code, title, area, level_hint, credits_typical, description)
        VALUES (${r[0]}, ${r[1]}, ${r[2]}, ${r[3]}, ${r[4]}, ${r[5]})
        ON CONFLICT (canon_req_code) DO UPDATE SET
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          level_hint = EXCLUDED.level_hint,
          credits_typical = EXCLUDED.credits_typical,
          description = EXCLUDED.description;
      `;
    }

    // 2) Partner Policies (anchors)
    const anchors = [
      ["TESU","Thomas Edison State University",90,30,18,"Very ACE-friendly; capstone in-residence"],
      ["WGU","Western Governors University",90,36,24,"Competency-based; program nuances"],
      ["COSC","Charter Oak State College",90,30,18,"PLA friendly"],
      ["EXCU","Excelsior University",90,30,18,"Online-focused; nursing exclusions"],
    ];

    for (const a of anchors) {
      await client.queryArray`
        INSERT INTO public.partner_policies
          (partner_code, partner_name, max_alt_credits, min_residency_credits, upper_division_min, notes, scope, effective_from)
        VALUES (${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}, ${a[4]}, ${a[5]}, 'institution', CURRENT_DATE)
        ON CONFLICT (partner_code) DO UPDATE SET
          partner_name = EXCLUDED.partner_name,
          max_alt_credits = EXCLUDED.max_alt_credits,
          min_residency_credits = EXCLUDED.min_residency_credits,
          upper_division_min = EXCLUDED.upper_division_min,
          notes = EXCLUDED.notes,
          scope = EXCLUDED.scope;
      `;
    }

    // 3) Starter Transfer Rules (16 rows)
    const rules = [
      // English
      ["SOPHIA","SOPH-ENG-101","TESU","ENG-101","accepted","ACE",0.95,null],
      ["SOPHIA","SOPH-ENG-102","TESU","ENG-102","accepted","ACE",0.95,null],
      ["STUDY","STUDY-ENG-101","TESU","ENG-101","accepted","ACE",0.92,null],
      ["CLEP","CLEP-COMP","TESU","ENG-102","accepted","CLEP",0.98,null],
      // Math
      ["SOPHIA","SOPH-ALG-101","TESU","MAT-121","accepted","ACE",0.93,null],
      ["STUDY","STUDY-ALG-101","TESU","MAT-121","accepted","ACE",0.92,null],
      ["CLEP","CLEP-ALG","TESU","MAT-121","accepted","CLEP",0.98,null],
      ["SOPHIA","SOPH-STAT-201","TESU","STA-201","accepted","ACE",0.92,null],
      // Psych/Soc
      ["SOPHIA","SOPH-PSY-101","TESU","PSY-101","accepted","ACE",0.90,null],
      ["CLEP","CLEP-PSY","TESU","PSY-101","accepted","CLEP",0.97,null],
      ["SOPHIA","SOPH-SOC-101","TESU","SOC-101","accepted","ACE",0.89,null],
      // Elective example
      ["SOPHIA","SOPH-COMM-101","TESU",null,"elective","ACE",0.60,null],
      // WGU examples
      ["SOPHIA","SOPH-ENG-101","WGU","ENG-1XX","accepted","ACE",0.85,null],
      ["SOPHIA","SOPH-STAT-201","WGU","STAT-1XX","accepted","ACE",0.84,null],
      ["STUDY","STUDY-DB-INTRO","WGU",null,"elective","ACE",0.70,null],
      // Rejected example
      ["SOPHIA","SOPH-COMM-101","WGU",null,"rejected","heuristic",0.50,null],
    ];

    for (const r of rules) {
      await client.queryArray`
        INSERT INTO public.credit_transfer_rules
          (source_institution, source_course_code, target_institution, target_course_code,
           acceptance_status, rule_source, confidence, effective_from)
        VALUES (${r[0]}, ${r[1]}, ${r[2]}, ${r[3]}, ${r[4]}, ${r[5]}, ${r[6]}, CURRENT_DATE)
        ON CONFLICT (source_institution, source_course_code, target_institution)
        WHERE (source_course_code IS NOT NULL)
        DO UPDATE SET
          target_course_code = EXCLUDED.target_course_code,
          acceptance_status = EXCLUDED.acceptance_status,
          rule_source = EXCLUDED.rule_source,
          confidence = EXCLUDED.confidence;
      `;
    }

    // 4) Option Exclusions — look up UUIDs safely; skip if not present
    const codes = ["SOPH-ALG-101","STUDY-ALG-101","CLEP-ALG"];
    const found = await client.queryObject<{id: string, code: string}>`
      SELECT id, code FROM public.marketplace_courses
      WHERE code = ANY(${codes})
    `;
    const map = new Map(found.rows.map(r => [r.code, r.id]));

    const pairs: Array<[string, string, string]> = [];
    const a = map.get("SOPH-ALG-101");
    const b = map.get("STUDY-ALG-101");
    const c = map.get("CLEP-ALG");
    const reason = "Equivalent College Algebra credit - only one counts";

    function orderedPair(x?: string, y?: string): [string,string] | null {
      if (!x || !y) return null;
      return x < y ? [x,y] : [y,x];
    }

    const p1 = orderedPair(a,b); if (p1) pairs.push([p1[0], p1[1], reason]);
    const p2 = orderedPair(a,c); if (p2) pairs.push([p2[0], p2[1], reason]);
    const p3 = orderedPair(b,c); if (p3) pairs.push([p3[0], p3[1], reason]);

    for (const [oa, ob, rsn] of pairs) {
      await client.queryArray`
        INSERT INTO public.option_exclusions (option_a_id, option_b_id, reason)
        VALUES (${oa}, ${ob}, ${rsn})
        ON CONFLICT (option_a_id, option_b_id) DO NOTHING;
      `;
    }

    await client.queryArray`COMMIT`;
    await client.end();
    return json(200, {
      message: "✅ Seed complete",
      inserted: {
        providers: 10,
        requirement_catalog: catalog.length,
        partner_policies: anchors.length,
        transfer_rules: rules.length,
        option_exclusions: pairs.length,
      }
    });
  } catch (e) {
    return json(500, { error: "seed_failed", details: String(e) });
  }
});
