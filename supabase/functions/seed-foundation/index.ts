// deno-lint-ignore-file no-explicit-any
// Deno Edge Function: seed-foundation
// Seeds providers (codes), canonical requirements, partner policies, starter rules, exclusions.
// Rewritten to use Deno-native postgres client

import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

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

  const pool = new Pool(Deno.env.get("SUPABASE_DB_URL") || "", 3, true);

  try {
    const url = Deno.env.get("SUPABASE_DB_URL");
    if (!url) return json(500, { error: "Missing SUPABASE_DB_URL secret" });

    console.log('Connecting to database...');
    const connection = await pool.connect();

    try {
      console.log('Starting seed operations...');

      // 0) Provider codes — backfill and insert if missing
      console.log('Backfilling provider codes...');
      
      const providerUpdates = [
        { pattern: '%thomas edison%', code: 'TESU' },
        { pattern: '%western governors%', code: 'WGU' },
        { pattern: '%charter oak%', code: 'COSC' },
        { pattern: '%excelsior%', code: 'EXCU' },
        { pattern: '%sophia%', code: 'SOPHIA' },
        { pattern: '%study.com%', code: 'STUDY' },
        { pattern: '%clep%', code: 'CLEP' },
        { pattern: '%dsst%', code: 'DSST' },
        { pattern: '%coursera%', code: 'COUR' },
        { pattern: '%edx%', code: 'EDX' }
      ];

      for (const { pattern, code } of providerUpdates) {
        await connection.queryObject(
          `UPDATE public.providers SET provider_code = $1 
           WHERE provider_code IS NULL AND name ILIKE $2`,
          [code, pattern]
        );
      }

      // Insert "must-have" providers if not present
      const providersSeed = [
        ["TESU", "Thomas Edison State University"],
        ["WGU", "Western Governors University"],
        ["COSC", "Charter Oak State College"],
        ["EXCU", "Excelsior University"],
        ["SOPHIA", "Sophia Learning"],
        ["STUDY", "Study.com"],
        ["CLEP", "CLEP Exams"],
        ["DSST", "DSST Exams"],
        ["COUR", "Coursera"],
        ["EDX", "edX"],
      ];

      for (const [code, name] of providersSeed) {
        await connection.queryObject(
          `INSERT INTO public.providers (id, name, type, provider_code)
           SELECT gen_random_uuid(), $1, COALESCE((SELECT type FROM public.providers WHERE provider_code=$2 LIMIT 1),'mooc'), $2
           WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE provider_code=$2)`,
          [name, code]
        );
      }
      console.log(`✓ Providers seeded (${providersSeed.length} codes)`);

      // 1) Canonical requirement catalog (13 rows)
      const catalog = [
        ["ENG-101","English Composition I","Written Communication",100,3,"Introductory academic writing"],
        ["ENG-102","English Composition II","Written Communication",100,3,"Advanced writing & research"],
        ["MATH-ALG","College Algebra","Mathematics",100,3,"Algebra fundamentals"],
        ["MATH-STAT","Introduction to Statistics","Mathematics",200,3,"Statistical methods"],
        ["MATH-CALC1","Calculus I","Mathematics",200,4,"Single-variable calculus"],
        ["PSY-101","Introduction to Psychology","Social Sciences",100,3,"Psychology fundamentals"],
        ["SOC-101","Introduction to Sociology","Social Sciences",100,3,"Society & social behavior"],
        ["HIST-US1","U.S. History I","Social Sciences",100,3,"US to 1877"],
        ["COMM-SPEECH","Public Speaking","Communication",100,3,"Oral communication"],
        ["CS-101","Introduction to Computer Science","Computer Science",100,3,"Programming fundamentals"],
        ["CS-DISCRETE","Discrete Mathematics","Computer Science",200,3,"Math foundations for CS"],
        ["CS-DATASTRUCT","Data Structures","Computer Science",200,3,"Core data structures & algorithms"],
        ["CS-DATABASE","Introduction to Databases","Computer Science",200,3,"Database & SQL basics"],
      ];

      for (const r of catalog) {
        await connection.queryObject(
          `INSERT INTO public.requirement_catalog (canon_req_code, title, area, level_hint, credits_typical, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (canon_req_code) DO UPDATE
             SET title=EXCLUDED.title, area=EXCLUDED.area, level_hint=EXCLUDED.level_hint,
                 credits_typical=EXCLUDED.credits_typical, description=EXCLUDED.description`,
          r
        );
      }
      console.log(`✓ Requirement catalog seeded (${catalog.length} requirements)`);

      // 2) Partner policies
      const anchors = [
        ["TESU","Thomas Edison State University",90,30,18,"Very ACE-friendly; capstone in-residence"],
        ["WGU","Western Governors University",90,36,24,"Competency-based; program nuances"],
        ["COSC","Charter Oak State College",90,30,18,"PLA friendly"],
        ["EXCU","Excelsior University",90,30,18,"Online-focused; nursing exclusions"],
      ];

      for (const a of anchors) {
        await connection.queryObject(
          `INSERT INTO public.partner_policies
             (partner_code, partner_name, max_alt_credits, min_residency_credits, upper_division_min, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (partner_code) DO UPDATE
             SET partner_name=EXCLUDED.partner_name,
                 max_alt_credits=EXCLUDED.max_alt_credits,
                 min_residency_credits=EXCLUDED.min_residency_credits,
                 upper_division_min=EXCLUDED.upper_division_min,
                 notes=EXCLUDED.notes`,
          a
        );
      }
      console.log(`✓ Partner policies seeded (${anchors.length} schools)`);

      // 3) Starter transfer rules (~16)
      const rules = [
        ["SOPHIA","SOPH-ENG-101","TESU","ENG-101","accepted","ACE",0.95,null],
        ["SOPHIA","SOPH-ENG-102","TESU","ENG-102","accepted","ACE",0.95,null],
        ["STUDY","STUDY-ENG-101","TESU","ENG-101","accepted","ACE",0.92,null],
        ["CLEP","CLEP-COMP","TESU","ENG-102","accepted","CLEP",0.98,null],
        ["SOPHIA","SOPH-ALG-101","TESU","MAT-121","accepted","ACE",0.93,null],
        ["STUDY","STUDY-ALG-101","TESU","MAT-121","accepted","ACE",0.92,null],
        ["CLEP","CLEP-ALG","TESU","MAT-121","accepted","CLEP",0.98,null],
        ["SOPHIA","SOPH-STAT-201","TESU","STA-201","accepted","ACE",0.92,null],
        ["SOPHIA","SOPH-PSY-101","TESU","PSY-101","accepted","ACE",0.90,null],
        ["CLEP","CLEP-PSY","TESU","PSY-101","accepted","CLEP",0.97,null],
        ["SOPHIA","SOPH-SOC-101","TESU","SOC-101","accepted","ACE",0.89,null],
        ["SOPHIA","SOPH-COMM-101","TESU",null,"elective","ACE",0.60,null],
        ["SOPHIA","SOPH-ENG-101","WGU","ENG-1XX","accepted","ACE",0.85,null],
        ["SOPHIA","SOPH-STAT-201","WGU","STAT-1XX","accepted","ACE",0.84,null],
        ["STUDY","STUDY-DB-INTRO","WGU",null,"elective","ACE",0.70,null],
        ["SOPHIA","SOPH-COMM-101","WGU",null,"rejected","heuristic",0.50,null],
      ];

      for (const r of rules) {
        await connection.queryObject(
          `INSERT INTO public.credit_transfer_rules
             (source_institution, source_course_code, target_institution, target_course_code,
              acceptance_status, rule_source, confidence, effective_from)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
           ON CONFLICT (source_institution, source_course_code, target_institution)
           DO UPDATE SET
             target_course_code = EXCLUDED.target_course_code,
             acceptance_status  = EXCLUDED.acceptance_status,
             rule_source        = EXCLUDED.rule_source,
             confidence         = EXCLUDED.confidence`,
          r
        );
      }
      console.log(`✓ Transfer rules seeded (${rules.length} rules)`);

      // 4) Algebra option exclusions
      const codes = ["SOPH-ALG-101","STUDY-ALG-101","CLEP-ALG"];
      const { rows: found } = await connection.queryObject<{id: string, code: string}>(
        `SELECT id::text, code FROM public.marketplace_courses WHERE code = ANY($1)`,
        [codes]
      );
      
      const map = new Map(found.map(r => [r.code, r.id]));
      const pairs: Array<[string,string,string]> = [];
      const a = map.get("SOPH-ALG-101");
      const b = map.get("STUDY-ALG-101");
      const c = map.get("CLEP-ALG");
      const reason = "Equivalent College Algebra credit - only one counts";
      const orderPair = (x?: string, y?: string): [string,string] | null =>
        (!x || !y) ? null : (x < y ? [x,y] : [y,x]);
      const p1 = orderPair(a,b); if (p1) pairs.push([p1[0], p1[1], reason]);
      const p2 = orderPair(a,c); if (p2) pairs.push([p2[0], p2[1], reason]);
      const p3 = orderPair(b,c); if (p3) pairs.push([p3[0], p3[1], reason]);

      for (const [oa, ob, why] of pairs) {
        await connection.queryObject(
          `INSERT INTO public.option_exclusions (option_a_id, option_b_id, reason)
           VALUES ($1, $2, $3)
           ON CONFLICT (option_a_id, option_b_id) DO NOTHING`,
          [oa, ob, why]
        );
      }
      console.log(`✓ Option exclusions seeded (${pairs.length} pairs)`);

      const counts = {
        providers: providersSeed.length,
        requirement_catalog: catalog.length,
        partner_policies: anchors.length,
        transfer_rules: rules.length,
        option_exclusions: pairs.length,
      };

      console.log('✅ Seed complete:', counts);
      return json(200, {
        message: "✅ Seed complete",
        inserted: counts,
      });

    } finally {
      connection.release();
    }

  } catch (e) {
    console.error('Seed error:', e);
    return json(500, { error: "seed_failed", details: String(e) });
  } finally {
    await pool.end();
  }
});
