import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedResult {
  canonicals_inserted: number;
  aliases_inserted: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: SeedResult = {
      canonicals_inserted: 0,
      aliases_inserted: 0,
      errors: [],
    };

    // 1) Canonical CLEP exams (College Board official exams)
    // canonical_code = CLEP-<EXAM_SLUG> (stable internal ID)
    const canonicals = [
      // Business
      { provider_code: "CLEP", canonical_code: "CLEP-BUSINESS-LAW", canonical_title: "Introductory Business Law", canonical_url: "https://clep.collegeboard.org/clep-exams/introductory-business-law" },
      { provider_code: "CLEP", canonical_code: "CLEP-FIN-ACCT", canonical_title: "Financial Accounting", canonical_url: "https://clep.collegeboard.org/clep-exams/financial-accounting" },
      { provider_code: "CLEP", canonical_code: "CLEP-INFO-SYS", canonical_title: "Information Systems", canonical_url: "https://clep.collegeboard.org/clep-exams/information-systems" },
      { provider_code: "CLEP", canonical_code: "CLEP-PRIN-MGMT", canonical_title: "Principles of Management", canonical_url: "https://clep.collegeboard.org/clep-exams/principles-of-management" },
      { provider_code: "CLEP", canonical_code: "CLEP-PRIN-MKT", canonical_title: "Principles of Marketing", canonical_url: "https://clep.collegeboard.org/clep-exams/principles-of-marketing" },
      
      // Composition & Literature
      { provider_code: "CLEP", canonical_code: "CLEP-COLLEGE-COMP", canonical_title: "College Composition", canonical_url: "https://clep.collegeboard.org/clep-exams/college-composition" },
      { provider_code: "CLEP", canonical_code: "CLEP-COLLEGE-COMP-MOD", canonical_title: "College Composition Modular", canonical_url: "https://clep.collegeboard.org/clep-exams/college-composition-modular" },
      
      // History & Social Sciences
      { provider_code: "CLEP", canonical_code: "CLEP-US-HIST-I", canonical_title: "History of the United States I", canonical_url: "https://clep.collegeboard.org/clep-exams/history-of-the-united-states-i" },
      { provider_code: "CLEP", canonical_code: "CLEP-US-HIST-II", canonical_title: "History of the United States II", canonical_url: "https://clep.collegeboard.org/clep-exams/history-of-the-united-states-ii" },
      { provider_code: "CLEP", canonical_code: "CLEP-PSYCHOLOGY", canonical_title: "Introductory Psychology", canonical_url: "https://clep.collegeboard.org/clep-exams/introductory-psychology" },
      { provider_code: "CLEP", canonical_code: "CLEP-SOCIOLOGY", canonical_title: "Introductory Sociology", canonical_url: "https://clep.collegeboard.org/clep-exams/introductory-sociology" },
      { provider_code: "CLEP", canonical_code: "CLEP-MACRO-ECON", canonical_title: "Principles of Macroeconomics", canonical_url: "https://clep.collegeboard.org/clep-exams/principles-of-macroeconomics" },
      { provider_code: "CLEP", canonical_code: "CLEP-MICRO-ECON", canonical_title: "Principles of Microeconomics", canonical_url: "https://clep.collegeboard.org/clep-exams/principles-of-microeconomics" },
      
      // Math & Science
      { provider_code: "CLEP", canonical_code: "CLEP-COLLEGE-ALG", canonical_title: "College Algebra", canonical_url: "https://clep.collegeboard.org/clep-exams/college-algebra" },
      { provider_code: "CLEP", canonical_code: "CLEP-COLLEGE-MATH", canonical_title: "College Mathematics", canonical_url: "https://clep.collegeboard.org/clep-exams/college-mathematics" },
      { provider_code: "CLEP", canonical_code: "CLEP-CALCULUS", canonical_title: "Calculus", canonical_url: "https://clep.collegeboard.org/clep-exams/calculus" },
      { provider_code: "CLEP", canonical_code: "CLEP-PRECALCULUS", canonical_title: "Precalculus", canonical_url: "https://clep.collegeboard.org/clep-exams/precalculus" },
      { provider_code: "CLEP", canonical_code: "CLEP-BIOLOGY", canonical_title: "Biology", canonical_url: "https://clep.collegeboard.org/clep-exams/biology" },
      { provider_code: "CLEP", canonical_code: "CLEP-CHEMISTRY", canonical_title: "Chemistry", canonical_url: "https://clep.collegeboard.org/clep-exams/chemistry" },
    ];

    // Insert canonicals with upsert
    const { data: insertedCanonicals, error: canonicalError } = await supabase
      .from("source_courses")
      .upsert(canonicals, { 
        onConflict: "provider_code_norm,canonical_code_norm",
        ignoreDuplicates: false 
      })
      .select("id, canonical_code");

    if (canonicalError) {
      result.errors.push(`Canonical insert error: ${canonicalError.message}`);
    } else {
      result.canonicals_inserted = insertedCanonicals?.length ?? 0;
    }

    // 2) Fetch all canonical IDs for alias mapping
    const { data: allCanonicals, error: fetchError } = await supabase
      .from("source_courses")
      .select("id, canonical_code, provider_code_norm, canonical_code_norm")
      .eq("provider_code_norm", "CLEP");

    if (fetchError) {
      result.errors.push(`Fetch canonicals error: ${fetchError.message}`);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Build lookup map
    const canonicalMap = new Map<string, string>();
    for (const c of allCanonicals ?? []) {
      canonicalMap.set(c.canonical_code_norm, c.id);
    }

    // 3) Alias mappings (legacy codes → canonical)
    const aliasMappings = [
      // Business
      { alias_code: "BUSINESS-LAW", canonical_code: "CLEP-BUSINESS-LAW", confidence: 0.95 },
      { alias_code: "FINANCIAL-ACCOUNTING", canonical_code: "CLEP-FIN-ACCT", confidence: 0.95 },
      { alias_code: "CLEP-INFO-SYS", canonical_code: "CLEP-INFO-SYS", confidence: 1.0 },
      { alias_code: "PRINCIPLES-MANAGEMENT", canonical_code: "CLEP-PRIN-MGMT", confidence: 0.95 },
      { alias_code: "PRINCIPLES-MARKETING", canonical_code: "CLEP-PRIN-MKT", confidence: 0.95 },
      
      // Composition
      { alias_code: "COLLEGE-COMPOSITION", canonical_code: "CLEP-COLLEGE-COMP", confidence: 0.95 },
      { alias_code: "CLEP-COLLEGE-COMP", canonical_code: "CLEP-COLLEGE-COMP", confidence: 1.0 },
      { alias_code: "CLEP-COMP", canonical_code: "CLEP-COLLEGE-COMP", confidence: 0.90 }, // variant
      
      // Economics
      { alias_code: "MACROECONOMICS", canonical_code: "CLEP-MACRO-ECON", confidence: 0.95 },
      { alias_code: "CLEP-MACRO-ECON", canonical_code: "CLEP-MACRO-ECON", confidence: 1.0 },
      { alias_code: "MICROECONOMICS", canonical_code: "CLEP-MICRO-ECON", confidence: 0.95 },
      { alias_code: "CLEP-MICRO-ECON", canonical_code: "CLEP-MICRO-ECON", confidence: 1.0 },
      
      // Math
      { alias_code: "COLLEGE-ALGEBRA", canonical_code: "CLEP-COLLEGE-ALG", confidence: 0.95 },
      { alias_code: "CLEP-ALG", canonical_code: "CLEP-COLLEGE-ALG", confidence: 0.90 },
      { alias_code: "CLEP-CALCULUS", canonical_code: "CLEP-CALCULUS", confidence: 1.0 },
      
      // Psychology & Sociology
      { alias_code: "INTRO-PSYCHOLOGY", canonical_code: "CLEP-PSYCHOLOGY", confidence: 0.95 },
      { alias_code: "CLEP-PSY", canonical_code: "CLEP-PSYCHOLOGY", confidence: 0.90 },
      { alias_code: "CLEP-PSYCH", canonical_code: "CLEP-PSYCHOLOGY", confidence: 0.90 },
      { alias_code: "CLEP-SOCIOLOGY", canonical_code: "CLEP-SOCIOLOGY", confidence: 1.0 },
    ];

    const aliasRows = aliasMappings.map((m) => {
      const sourceId = canonicalMap.get(m.canonical_code.toUpperCase());
      if (!sourceId) {
        result.errors.push(`Missing canonical for alias ${m.alias_code} -> ${m.canonical_code}`);
        return null;
      }
      return {
        source_course_id: sourceId,
        provider_code: "CLEP",
        alias_code: m.alias_code,
        alias_kind: "internal_normalized",
        confidence: m.confidence,
        evidence_url: "https://clep.collegeboard.org/",
        evidence_source_type: "provider_page",
        evidence_locator: `College Board CLEP exam page for ${m.canonical_code}`,
      };
    }).filter(Boolean);

    if (aliasRows.length > 0) {
      const { data: insertedAliases, error: aliasError } = await supabase
        .from("source_course_aliases")
        .upsert(aliasRows, {
          onConflict: "provider_code_norm,alias_code_norm",
          ignoreDuplicates: false,
        })
        .select("id");

      if (aliasError) {
        result.errors.push(`Alias insert error: ${aliasError.message}`);
      } else {
        result.aliases_inserted = insertedAliases?.length ?? 0;
      }
    }

    // 4) Verify resolution
    const { data: resolutionStats, error: statsError } = await supabase
      .from("transfer_rules_resolved")
      .select("canonical_resolution_status")
      .eq("source_institution", "CLEP");

    const statusCounts: Record<string, number> = {};
    if (!statsError && resolutionStats) {
      for (const row of resolutionStats) {
        const status = row.canonical_resolution_status ?? "unknown";
        statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      }
    }

    return new Response(
      JSON.stringify({
        success: result.errors.length === 0,
        ...result,
        resolution_stats: statusCounts,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: result.errors.length === 0 ? 200 : 207,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
