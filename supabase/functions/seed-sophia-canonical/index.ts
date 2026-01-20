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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ============ ADMIN AUTHENTICATION GUARD ============
  // Use anon client for auth verification (proper trust boundary)
  // Use service role client only for DB writes
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("[seed-sophia-canonical] SECURITY: Missing or invalid authorization header");
    return new Response(
      JSON.stringify({ error: "Unauthorized: Missing authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  
  // Anon client for auth verification only
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  // Service role client for privileged DB operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the user from the JWT using anon client
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    console.error("[seed-sophia-canonical] SECURITY: Invalid token", authError);
    return new Response(
      JSON.stringify({ error: "Unauthorized: Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user has admin role (use admin client for RPC)
  const { data: userRole, error: roleError } = await supabaseAdmin.rpc("get_user_role", {
    user_uuid: user.id,
  });

  if (roleError || userRole !== "admin") {
    console.warn(`[seed-sophia-canonical] SECURITY: Non-admin user blocked`, {
      userId: user.id,
      email: user.email,
      role: userRole,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({ error: "Forbidden: Admin role required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[seed-sophia-canonical] Admin ${user.email} authorized for canonical seeding`);
  // ============ END ADMIN AUTHENTICATION GUARD ============

  try {
    const result: SeedResult = {
      canonicals_inserted: 0,
      aliases_inserted: 0,
      errors: [],
    };

    // 1) Canonical courses (ACE IDs from SUNY Empire Sophia page)
    const canonicals = [
      { provider_code: "SOPHIA", canonical_code: "SOPH-0001", canonical_title: "College Algebra", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0002", canonical_title: "Human Biology", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0003", canonical_title: "Introduction to Chemistry", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0006", canonical_title: "Art History I", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0007", canonical_title: "Art History II", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0010", canonical_title: "Financial Accounting", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0011", canonical_title: "Microeconomics", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0012", canonical_title: "Macroeconomics", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0014", canonical_title: "Introduction to Business", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0015", canonical_title: "English Composition I", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0016", canonical_title: "Environmental Science", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0020", canonical_title: "Introduction to Ethics", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0021", canonical_title: "Introduction to Philosophy", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0022", canonical_title: "U.S. History I", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0023", canonical_title: "U.S. History II", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0024", canonical_title: "Public Speaking", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0025", canonical_title: "Principles of Management", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0026", canonical_title: "Project Management", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0027", canonical_title: "Introduction to Statistics", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0028", canonical_title: "Critical Thinking", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0029", canonical_title: "Introduction to Information Technology", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0030", canonical_title: "English Composition II", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0031", canonical_title: "Foundations of Leadership", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0032", canonical_title: "Business Law", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0048", canonical_title: "Introduction to Psychology", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0051", canonical_title: "Introduction to Sociology", canonical_url: "https://sunyempire.sophia.org/" },
      { provider_code: "SOPHIA", canonical_code: "SOPH-0079", canonical_title: "Managerial Accounting", canonical_url: "https://sunyempire.sophia.org/" },
    ];

    // Insert canonicals with upsert
    const { data: insertedCanonicals, error: canonicalError } = await supabaseAdmin
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
    const { data: allCanonicals, error: fetchError } = await supabaseAdmin
      .from("source_courses")
      .select("id, canonical_code, provider_code_norm, canonical_code_norm, canonical_url")
      .eq("provider_code_norm", "SOPHIA");

    if (fetchError) {
      result.errors.push(`Fetch canonicals error: ${fetchError.message}`);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Build lookup maps: id + url
    const canonicalMap = new Map<string, string>();
    const canonicalUrlMap = new Map<string, string>();
    for (const c of allCanonicals ?? []) {
      canonicalMap.set(c.canonical_code_norm, c.id);
      canonicalUrlMap.set(c.canonical_code_norm, c.canonical_url ?? "https://sunyempire.sophia.org/");
    }

    // 3) Alias mappings (internal codes → canonical)
    // Includes primary aliases + common variants found in legacy data
    const aliasMappings = [
      // Primary aliases (SOPHIA-* format)
      { alias_code: "SOPHIA-ART-HIST-I", canonical_code: "SOPH-0006", confidence: 0.95 },
      { alias_code: "SOPHIA-ART-HIST", canonical_code: "SOPH-0006", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-ART-HIST-II", canonical_code: "SOPH-0007", confidence: 0.95 }, // Part II (add canonical if needed)
      { alias_code: "SOPHIA-BUS-LAW", canonical_code: "SOPH-0032", confidence: 0.95 },
      { alias_code: "SOPHIA-COLLEGE-ALG", canonical_code: "SOPH-0001", confidence: 0.95 },
      { alias_code: "SOPHIA-ENG-COMP-I-II", canonical_code: "SOPH-0015", confidence: 0.70 }, // Combined → Comp I
      { alias_code: "SOPHIA-ENG-COMP-II", canonical_code: "SOPH-0030", confidence: 0.95 }, // Comp II explicit
      { alias_code: "SOPHIA-ENV-SCI", canonical_code: "SOPH-0016", confidence: 0.95 },
      { alias_code: "SOPHIA-FIN-ACCT", canonical_code: "SOPH-0010", confidence: 0.95 },
      { alias_code: "SOPHIA-HUMAN-BIO", canonical_code: "SOPH-0002", confidence: 0.95 },
      { alias_code: "SOPHIA-INTRO-BUS", canonical_code: "SOPH-0014", confidence: 0.95 },
      { alias_code: "SOPHIA-INTRO-ETHICS", canonical_code: "SOPH-0020", confidence: 0.95 },
      { alias_code: "SOPHIA-INTRO-PSYCH", canonical_code: "SOPH-0048", confidence: 0.95 },
      { alias_code: "SOPHIA-INTRO-SOC", canonical_code: "SOPH-0051", confidence: 0.95 },
      { alias_code: "SOPHIA-MACRO-ECON", canonical_code: "SOPH-0012", confidence: 0.95 },
      { alias_code: "SOPHIA-MACROECON", canonical_code: "SOPH-0012", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-MACROECONOMICS", canonical_code: "SOPH-0012", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-MGT-ACCT", canonical_code: "SOPH-0079", confidence: 0.95 },
      { alias_code: "SOPHIA-MICRO-ECON", canonical_code: "SOPH-0011", confidence: 0.95 },
      { alias_code: "SOPHIA-MICROECON", canonical_code: "SOPH-0011", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-MICROECONOMICS", canonical_code: "SOPH-0011", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-PUBLIC-SPEAK", canonical_code: "SOPH-0024", confidence: 0.95 },
      { alias_code: "SOPHIA-US-HIST-I", canonical_code: "SOPH-0022", confidence: 0.95 },
      { alias_code: "SOPHIA-US-HIST-II", canonical_code: "SOPH-0023", confidence: 0.95 }, // Part II
      { alias_code: "SOPHIA-STATISTICS", canonical_code: "SOPH-0027", confidence: 0.95 },
      { alias_code: "SOPHIA-STATS", canonical_code: "SOPH-0027", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-INTRO-STATS", canonical_code: "SOPH-0027", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-PROJ-MGMT", canonical_code: "SOPH-0026", confidence: 0.95 },
      { alias_code: "SOPHIA-PROJECT-MGMT", canonical_code: "SOPH-0026", confidence: 0.90 }, // variant
      { alias_code: "SOPHIA-COMM", canonical_code: "SOPH-0024", confidence: 0.85 }, // likely public speaking
      { alias_code: "SOPHIA-CRITICAL", canonical_code: "SOPH-0028", confidence: 0.90 }, // critical thinking
      { alias_code: "SOPHIA-INTRO-PHILO", canonical_code: "SOPH-0021", confidence: 0.95 },
      { alias_code: "SOPHIA-INFO-SYS", canonical_code: "SOPH-0029", confidence: 0.95 },
      { alias_code: "SOPHIA-INTRO-IT", canonical_code: "SOPH-0029", confidence: 0.85 }, // likely same as info sys
      { alias_code: "SOPHIA-INTRO-CHEM", canonical_code: "SOPH-0003", confidence: 0.95 },
      { alias_code: "SOPHIA-LEADERSHIP", canonical_code: "SOPH-0031", confidence: 0.95 },
      { alias_code: "SOPHIA-MGMT-PRIN", canonical_code: "SOPH-0025", confidence: 0.95 },
      // Short code variants (legacy format - SOPH-* prefix)
      { alias_code: "SOPH-COMM-101", canonical_code: "SOPH-0024", confidence: 0.85 },
      { alias_code: "SOPH-ENG-101", canonical_code: "SOPH-0015", confidence: 0.90 },
      { alias_code: "SOPH-ENG-102", canonical_code: "SOPH-0030", confidence: 0.90 },
      { alias_code: "SOPH-STAT-201", canonical_code: "SOPH-0027", confidence: 0.90 },
      { alias_code: "SOPH-ALG-101", canonical_code: "SOPH-0001", confidence: 0.90 },
      { alias_code: "SOPH-PSY-101", canonical_code: "SOPH-0048", confidence: 0.90 },
      { alias_code: "SOPH-SOC-101", canonical_code: "SOPH-0051", confidence: 0.90 },
      
      // ========== BATCH B: Legacy short codes (ACC202, BUS100, etc.) ==========
      // These appear in credit_transfer_rules.source_course_code with source_institution='SOPHIA'
      { alias_code: "ACC202", canonical_code: "SOPH-0079", confidence: 0.98 },  // Managerial Accounting
      { alias_code: "ART101", canonical_code: "SOPH-0006", confidence: 0.98 },  // Art History I
      { alias_code: "BUS100", canonical_code: "SOPH-0014", confidence: 0.98 },  // Introduction to Business
      { alias_code: "BUS340", canonical_code: "SOPH-0032", confidence: 0.98 },  // Business Law
      { alias_code: "COMM101", canonical_code: "SOPH-0024", confidence: 0.98 }, // Public Speaking
      { alias_code: "CRIT101", canonical_code: "SOPH-0028", confidence: 0.98 }, // Critical Thinking
      { alias_code: "ECO201", canonical_code: "SOPH-0011", confidence: 0.98 },  // Microeconomics
      { alias_code: "ECO202", canonical_code: "SOPH-0012", confidence: 0.98 },  // Macroeconomics
      { alias_code: "ENG101", canonical_code: "SOPH-0015", confidence: 0.98 },  // English Composition I
      { alias_code: "ENG102", canonical_code: "SOPH-0030", confidence: 0.98 },  // English Composition II
      { alias_code: "ENV101", canonical_code: "SOPH-0016", confidence: 0.98 },  // Environmental Science
      { alias_code: "HIS101", canonical_code: "SOPH-0022", confidence: 0.98 },  // U.S. History I
      { alias_code: "HIS102", canonical_code: "SOPH-0023", confidence: 0.98 },  // U.S. History II
      { alias_code: "MAT121", canonical_code: "SOPH-0001", confidence: 0.98 },  // College Algebra
      { alias_code: "PHI101", canonical_code: "SOPH-0021", confidence: 0.98 },  // Introduction to Philosophy
      { alias_code: "PSY101", canonical_code: "SOPH-0048", confidence: 0.98 },  // Introduction to Psychology
      { alias_code: "SOC101", canonical_code: "SOPH-0051", confidence: 0.98 },  // Introduction to Sociology
      { alias_code: "STA201", canonical_code: "SOPH-0027", confidence: 0.98 },  // Introduction to Statistics
    ];

    const aliasRows = aliasMappings.map((m) => {
      const sourceId = canonicalMap.get(m.canonical_code.toUpperCase());
      const evidenceUrl = canonicalUrlMap.get(m.canonical_code.toUpperCase()) ?? "https://sunyempire.sophia.org/";
      if (!sourceId) {
        result.errors.push(`Missing canonical for alias ${m.alias_code} -> ${m.canonical_code}`);
        return null;
      }
      return {
        source_course_id: sourceId,
        provider_code: "SOPHIA",
        alias_code: m.alias_code,
        alias_kind: "internal_normalized",
        confidence: m.confidence,
        evidence_url: evidenceUrl,
        evidence_source_type: "institution_web",
        evidence_locator: `ACE ID ${m.canonical_code} on SUNY Empire Sophia list`,
      };
    }).filter(Boolean);

    if (aliasRows.length > 0) {
      const { data: insertedAliases, error: aliasError } = await supabaseAdmin
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
    const { data: resolutionStats, error: statsError } = await supabaseAdmin
      .from("transfer_rules_resolved")
      .select("canonical_resolution_status")
      .eq("source_institution", "SOPHIA");

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
        executed_by: user.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: result.errors.length === 0 ? 200 : 207,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
