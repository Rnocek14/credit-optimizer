// =============================================================================
// assist-discover — Enumerates California ASSIST articulation agreements
// =============================================================================
// Uses ASSIST.org's public JSON API to walk (sending institution × receiving
// institution × academic year × major) and upserts one `articulation_agreements`
// row per combination with status='pending'. The fetch/parse worker picks
// these up separately.
//
// Auth: requires header `x-cron-secret: <OPS_CRON_SECRET>` if configured.
//
// Body (all optional):
//   { receivingInstitutionIds?: number[],   // ASSIST numeric IDs; default: all CSU+UC
//     sendingInstitutionIds?: number[],     // default: all CCC
//     academicYearIds?: number[],           // default: most recent year
//     maxPairs?: number,                    // safety cap on (sending,receiving) pairs
//     runId?: string }                      // optional caller-supplied run id
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSIST_BASE = "https://assist.org/api";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assistJson<T>(path: string): Promise<T> {
  const res = await fetch(`${ASSIST_BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": "Pivot-Articulation-Ingestor/1.0" },
  });
  if (!res.ok) {
    throw new Error(`ASSIST ${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

interface AssistInstitution {
  id: number;
  names: { name: string }[];
  code?: string;
  category?: number; // 1=CCC, 2=CSU, 3=UC (varies)
  isCommunityCollege?: boolean;
  isUniversity?: boolean;
}
interface AssistYear {
  Id: number;
  FallYear: number;
  AcademicYear: string;
}

function institutionName(inst: AssistInstitution): string {
  return inst.names?.[0]?.name ?? inst.code ?? `inst-${inst.id}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const opsSecret = Deno.env.get("OPS_CRON_SECRET");
  if (opsSecret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== opsSecret) return json(401, { error: "unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body OK
  }

  const maxPairs = Number(body.maxPairs ?? 25);
  const receivingFilter = body.receivingInstitutionIds as number[] | undefined;
  const sendingFilter = body.sendingInstitutionIds as number[] | undefined;
  const yearFilter = body.academicYearIds as number[] | undefined;

  // 1) Open a run record
  const { data: runRow, error: runErr } = await supabase
    .from("assist_ingestion_runs")
    .insert({
      source_system: "ASSIST",
      run_type: "manual",
      status: "running",
      parameters: { maxPairs, receivingFilter, sendingFilter, yearFilter },
    })
    .select("id")
    .single();

  if (runErr) return json(500, { error: "run_create_failed", detail: runErr.message });
  const runId = runRow.id as string;

  let discovered = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    // 2) Pull catalogs
    const [institutions, years] = await Promise.all([
      assistJson<AssistInstitution[]>("/institutions"),
      assistJson<AssistYear[]>("/AcademicYears"),
    ]);

    const yearsSorted = [...years].sort((a, b) => b.FallYear - a.FallYear);
    const targetYears = yearFilter
      ? yearsSorted.filter((y) => yearFilter.includes(y.Id))
      : yearsSorted.slice(0, 1); // default: most recent

    const receivings = institutions.filter((i) => {
      if (receivingFilter) return receivingFilter.includes(i.id);
      return i.isUniversity === true;
    });
    const sendings = institutions.filter((i) => {
      if (sendingFilter) return sendingFilter.includes(i.id);
      return i.isCommunityCollege === true;
    });

    let pairCount = 0;
    outer: for (const year of targetYears) {
      for (const recv of receivings) {
        for (const send of sendings) {
          if (pairCount >= maxPairs) break outer;
          pairCount++;

          try {
            // 3) For each pair+year, fetch list of majors
            const path = `/agreements?receivingInstitutionId=${recv.id}&sendingInstitutionId=${send.id}&academicYearId=${year.Id}&categoryCode=major`;
            const majors = await assistJson<
              { key: string; major: { code?: string; name?: string } }[]
            >(path);

            for (const m of majors ?? []) {
              const sourceUrl = `https://assist.org/transfer/results?year=${year.Id}&institution=${send.id}&agreement=${recv.id}&agreementType=to&viewAgreementsOptions=true&view=agreement&viewBy=major&viewSendingAgreements=false&viewByKey=${encodeURIComponent(m.key)}`;

              const { error: upErr } = await supabase
                .from("articulation_agreements")
                .upsert(
                  {
                    source_system: "ASSIST",
                    from_institution_code: `ASSIST:${send.id}`,
                    to_institution_code: `ASSIST:${recv.id}`,
                    academic_year: year.AcademicYear ?? String(year.FallYear),
                    major_code: m.key,
                    major_name: m.major?.name ?? null,
                    agreement_type: "major-prep",
                    source_url: sourceUrl,
                    status: "pending",
                  },
                  { onConflict: "source_system,from_institution_code,to_institution_code,academic_year,major_code" }
                );

              if (upErr) {
                errorCount++;
                errors.push(`upsert ${send.id}->${recv.id} ${m.key}: ${upErr.message}`);
              } else {
                discovered++;
              }
            }
          } catch (e) {
            errorCount++;
            errors.push(`pair ${send.id}->${recv.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    await supabase
      .from("assist_ingestion_runs")
      .update({
        status: errorCount > 0 && discovered === 0 ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        agreements_discovered: discovered,
        errors_count: errorCount,
        error_log: errors.length ? { errors: errors.slice(0, 100) } : null,
      })
      .eq("id", runId);

    return json(200, {
      success: true,
      run_id: runId,
      agreements_discovered: discovered,
      errors_count: errorCount,
      sample_errors: errors.slice(0, 5),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("assist_ingestion_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        agreements_discovered: discovered,
        errors_count: errorCount + 1,
        error_log: { fatal: msg, errors: errors.slice(0, 50) },
      })
      .eq("id", runId);
    return json(500, { error: "discover_failed", detail: msg, run_id: runId });
  }
});
