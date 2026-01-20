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

    // 1) Canonical courses for Study.com
    // Using SDC-<SLUG> as canonical codes (Study.com's internal structure)
    const canonicals = [
      // Business & Accounting
      { provider_code: "STUDYCOM", canonical_code: "SDC-FIN-ACCT", canonical_title: "Financial Accounting", canonical_url: "https://study.com/academy/course/financial-accounting.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-MGT-ACCT", canonical_title: "Managerial Accounting", canonical_url: "https://study.com/academy/course/managerial-accounting.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-BUS-LAW", canonical_title: "Business Law", canonical_url: "https://study.com/academy/course/business-law.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-BUS-ETH", canonical_title: "Business Ethics", canonical_url: "https://study.com/academy/course/business-ethics.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-BUS-ANALYTICS", canonical_title: "Business Analytics", canonical_url: "https://study.com/academy/course/business-analytics.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-CORP-FIN", canonical_title: "Corporate Finance", canonical_url: "https://study.com/academy/course/corporate-finance.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-FINANCE", canonical_title: "Introduction to Finance", canonical_url: "https://study.com/academy/course/introduction-to-finance.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-INTL-BUS", canonical_title: "International Business", canonical_url: "https://study.com/academy/course/international-business.html" },
      
      // Management & Marketing
      { provider_code: "STUDYCOM", canonical_code: "SDC-PRIN-MGMT", canonical_title: "Principles of Management", canonical_url: "https://study.com/academy/course/principles-of-management.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-PRIN-MKT", canonical_title: "Principles of Marketing", canonical_url: "https://study.com/academy/course/principles-of-marketing.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-HR-MGMT", canonical_title: "Human Resource Management", canonical_url: "https://study.com/academy/course/human-resource-management.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-SUPPLY-CHAIN", canonical_title: "Supply Chain Management", canonical_url: "https://study.com/academy/course/supply-chain-management.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-PROJ-MGMT", canonical_title: "Project Management", canonical_url: "https://study.com/academy/course/project-management.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-DIGITAL-MKT", canonical_title: "Digital Marketing", canonical_url: "https://study.com/academy/course/digital-marketing.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-CONSUMER-BEH", canonical_title: "Consumer Behavior", canonical_url: "https://study.com/academy/course/consumer-behavior.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-ENTREPRENEUR", canonical_title: "Entrepreneurship", canonical_url: "https://study.com/academy/course/entrepreneurship.html" },
      
      // Economics
      { provider_code: "STUDYCOM", canonical_code: "SDC-MACRO-ECON", canonical_title: "Macroeconomics", canonical_url: "https://study.com/academy/course/macroeconomics.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-MICRO-ECON", canonical_title: "Microeconomics", canonical_url: "https://study.com/academy/course/microeconomics.html" },
      
      // Math & Statistics
      { provider_code: "STUDYCOM", canonical_code: "SDC-COLLEGE-ALG", canonical_title: "College Algebra", canonical_url: "https://study.com/academy/course/college-algebra.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-CALC-I", canonical_title: "Calculus I", canonical_url: "https://study.com/academy/course/calculus.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-CALC-II", canonical_title: "Calculus II", canonical_url: "https://study.com/academy/course/calculus-ii.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-INTRO-STATS", canonical_title: "Introduction to Statistics", canonical_url: "https://study.com/academy/course/statistics.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-DISCRETE-MATH", canonical_title: "Discrete Mathematics", canonical_url: "https://study.com/academy/course/discrete-mathematics.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-DATA-DECISIONS", canonical_title: "Data-Driven Decision Making", canonical_url: "https://study.com/academy/course/data-driven-decision-making.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-RESEARCH-METH", canonical_title: "Research Methods", canonical_url: "https://study.com/academy/course/research-methods.html" },
      
      // Computer Science & IT
      { provider_code: "STUDYCOM", canonical_code: "SDC-INTRO-CS", canonical_title: "Introduction to Computer Science", canonical_url: "https://study.com/academy/course/computer-science.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-INTRO-IT", canonical_title: "Introduction to Information Technology", canonical_url: "https://study.com/academy/course/information-technology.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-INFO-SYS", canonical_title: "Information Systems", canonical_url: "https://study.com/academy/course/information-systems.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-INFO-SEC", canonical_title: "Information Security", canonical_url: "https://study.com/academy/course/information-security.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-CYBER-SEC", canonical_title: "Cybersecurity", canonical_url: "https://study.com/academy/course/cybersecurity.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-DATABASE", canonical_title: "Database Management", canonical_url: "https://study.com/academy/course/database-management.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-INTRO-DB", canonical_title: "Introduction to Databases", canonical_url: "https://study.com/academy/course/intro-to-databases.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-DATA-STRUCT", canonical_title: "Data Structures", canonical_url: "https://study.com/academy/course/data-structures.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-ALGORITHMS", canonical_title: "Algorithms", canonical_url: "https://study.com/academy/course/algorithms.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-COMP-ARCH", canonical_title: "Computer Architecture", canonical_url: "https://study.com/academy/course/computer-architecture.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-AI-ML", canonical_title: "Artificial Intelligence & Machine Learning", canonical_url: "https://study.com/academy/course/artificial-intelligence.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-CLOUD-COMP", canonical_title: "Cloud Computing", canonical_url: "https://study.com/academy/course/cloud-computing.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-DEVOPS", canonical_title: "DevOps", canonical_url: "https://study.com/academy/course/devops.html" },
      
      // Social Sciences
      { provider_code: "STUDYCOM", canonical_code: "SDC-INTRO-PSYCH", canonical_title: "Introduction to Psychology", canonical_url: "https://study.com/academy/course/psychology.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-INTRO-SOC", canonical_title: "Introduction to Sociology", canonical_url: "https://study.com/academy/course/sociology.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-ETHICS", canonical_title: "Ethics", canonical_url: "https://study.com/academy/course/ethics.html" },
      
      // Science
      { provider_code: "STUDYCOM", canonical_code: "SDC-BIO-101", canonical_title: "Biology 101", canonical_url: "https://study.com/academy/course/biology.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-ENV-SCI", canonical_title: "Environmental Science", canonical_url: "https://study.com/academy/course/environmental-science.html" },
      
      // English & Communication
      { provider_code: "STUDYCOM", canonical_code: "SDC-ENG-COMP-I", canonical_title: "English Composition I", canonical_url: "https://study.com/academy/course/english-composition.html" },
      { provider_code: "STUDYCOM", canonical_code: "SDC-ENG-COMP", canonical_title: "English Composition", canonical_url: "https://study.com/academy/course/english-composition.html" },
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
      .eq("provider_code_norm", "STUDYCOM");

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

    // 3) Alias mappings (handle variants)
    const aliasMappings = [
      // Direct matches (alias = canonical)
      { alias_code: "SDC-FIN-ACCT", canonical_code: "SDC-FIN-ACCT", confidence: 1.0 },
      { alias_code: "SDC-MGT-ACCT", canonical_code: "SDC-MGT-ACCT", confidence: 1.0 },
      { alias_code: "SDC-BUS-LAW", canonical_code: "SDC-BUS-LAW", confidence: 1.0 },
      { alias_code: "SDC-BUS-ETH", canonical_code: "SDC-BUS-ETH", confidence: 1.0 },
      { alias_code: "SDC-BUS-ETHICS", canonical_code: "SDC-BUS-ETH", confidence: 0.95 }, // variant
      { alias_code: "SDC-BUS-ANALYTICS", canonical_code: "SDC-BUS-ANALYTICS", confidence: 1.0 },
      { alias_code: "SDC-CORP-FIN", canonical_code: "SDC-CORP-FIN", confidence: 1.0 },
      { alias_code: "SDC-CORP-FINANCE", canonical_code: "SDC-CORP-FIN", confidence: 0.95 }, // variant
      { alias_code: "SDC-FINANCE", canonical_code: "SDC-FINANCE", confidence: 1.0 },
      { alias_code: "SDC-INTL-BUS", canonical_code: "SDC-INTL-BUS", confidence: 1.0 },
      { alias_code: "SDC-PRIN-MGMT", canonical_code: "SDC-PRIN-MGMT", confidence: 1.0 },
      { alias_code: "SDC-PRIN-MKT", canonical_code: "SDC-PRIN-MKT", confidence: 1.0 },
      { alias_code: "SDC-HR-MGMT", canonical_code: "SDC-HR-MGMT", confidence: 1.0 },
      { alias_code: "SDC-SUPPLY-CHAIN", canonical_code: "SDC-SUPPLY-CHAIN", confidence: 1.0 },
      { alias_code: "SDC-PROJ-MGMT", canonical_code: "SDC-PROJ-MGMT", confidence: 1.0 },
      { alias_code: "SDC-DIGITAL-MKT", canonical_code: "SDC-DIGITAL-MKT", confidence: 1.0 },
      { alias_code: "SDC-CONSUMER-BEH", canonical_code: "SDC-CONSUMER-BEH", confidence: 1.0 },
      { alias_code: "SDC-CONSUMER-BEHAV", canonical_code: "SDC-CONSUMER-BEH", confidence: 0.95 }, // variant
      { alias_code: "SDC-ENTREPRENEUR", canonical_code: "SDC-ENTREPRENEUR", confidence: 1.0 },
      { alias_code: "SDC-ENTREPRENEURSHIP", canonical_code: "SDC-ENTREPRENEUR", confidence: 0.95 }, // variant
      { alias_code: "SDC-MACRO-ECON", canonical_code: "SDC-MACRO-ECON", confidence: 1.0 },
      { alias_code: "SDC-MICRO-ECON", canonical_code: "SDC-MICRO-ECON", confidence: 1.0 },
      { alias_code: "SDC-COLLEGE-ALG", canonical_code: "SDC-COLLEGE-ALG", confidence: 1.0 },
      { alias_code: "SDC-CALC-I", canonical_code: "SDC-CALC-I", confidence: 1.0 },
      { alias_code: "SDC-CALC-II", canonical_code: "SDC-CALC-II", confidence: 1.0 },
      { alias_code: "SDC-INTRO-STATS", canonical_code: "SDC-INTRO-STATS", confidence: 1.0 },
      { alias_code: "SDC-DISCRETE-MATH", canonical_code: "SDC-DISCRETE-MATH", confidence: 1.0 },
      { alias_code: "SDC-DATA-DECISIONS", canonical_code: "SDC-DATA-DECISIONS", confidence: 1.0 },
      { alias_code: "SDC-RESEARCH-METH", canonical_code: "SDC-RESEARCH-METH", confidence: 1.0 },
      { alias_code: "SDC-INTRO-CS", canonical_code: "SDC-INTRO-CS", confidence: 1.0 },
      { alias_code: "SDC-INTRO-IT", canonical_code: "SDC-INTRO-IT", confidence: 1.0 },
      { alias_code: "SDC-INFO-SYS", canonical_code: "SDC-INFO-SYS", confidence: 1.0 },
      { alias_code: "SDC-INFO-SEC", canonical_code: "SDC-INFO-SEC", confidence: 1.0 },
      { alias_code: "SDC-CYBER-SEC", canonical_code: "SDC-CYBER-SEC", confidence: 1.0 },
      { alias_code: "SDC-DATABASE", canonical_code: "SDC-DATABASE", confidence: 1.0 },
      { alias_code: "SDC-INTRO-DB", canonical_code: "SDC-INTRO-DB", confidence: 1.0 },
      { alias_code: "SDC-DATA-STRUCT", canonical_code: "SDC-DATA-STRUCT", confidence: 1.0 },
      { alias_code: "SDC-ALGORITHMS", canonical_code: "SDC-ALGORITHMS", confidence: 1.0 },
      { alias_code: "SDC-COMP-ARCH", canonical_code: "SDC-COMP-ARCH", confidence: 1.0 },
      { alias_code: "SDC-AI-ML", canonical_code: "SDC-AI-ML", confidence: 1.0 },
      { alias_code: "SDC-CLOUD-COMP", canonical_code: "SDC-CLOUD-COMP", confidence: 1.0 },
      { alias_code: "SDC-DEVOPS", canonical_code: "SDC-DEVOPS", confidence: 1.0 },
      { alias_code: "SDC-INTRO-PSYCH", canonical_code: "SDC-INTRO-PSYCH", confidence: 1.0 },
      { alias_code: "SDC-INTRO-SOC", canonical_code: "SDC-INTRO-SOC", confidence: 1.0 },
      { alias_code: "SDC-ETHICS", canonical_code: "SDC-ETHICS", confidence: 1.0 },
      { alias_code: "SDC-BIO-101", canonical_code: "SDC-BIO-101", confidence: 1.0 },
      { alias_code: "SDC-ENV-SCI", canonical_code: "SDC-ENV-SCI", confidence: 1.0 },
      { alias_code: "SDC-ENG-COMP-I", canonical_code: "SDC-ENG-COMP-I", confidence: 1.0 },
      { alias_code: "SDC-ENG-COMP", canonical_code: "SDC-ENG-COMP", confidence: 1.0 },
      // Legacy format (BIO101L etc)
      { alias_code: "BIO101L", canonical_code: "SDC-BIO-101", confidence: 0.85 },
    ];

    const aliasRows = aliasMappings.map((m) => {
      const sourceId = canonicalMap.get(m.canonical_code.toUpperCase());
      if (!sourceId) {
        result.errors.push(`Missing canonical for alias ${m.alias_code} -> ${m.canonical_code}`);
        return null;
      }
      return {
        source_course_id: sourceId,
        provider_code: "STUDYCOM",
        alias_code: m.alias_code,
        alias_kind: "internal_normalized",
        confidence: m.confidence,
        evidence_url: `https://study.com/academy/course/${m.canonical_code.toLowerCase().replace('sdc-', '')}.html`,
        evidence_source_type: "provider_page",
        evidence_locator: `Study.com course page for ${m.canonical_code}`,
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
      .eq("source_institution", "STUDYCOM");

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
