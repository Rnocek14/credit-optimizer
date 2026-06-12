// =============================================================================
// assist-fetch-parse — Fetch one batch of pending ASSIST agreements and extract rules
// =============================================================================
// Claims `batchSize` pending rows from `articulation_agreements`, fetches the
// official ASSIST articulation JSON document for each, asks Lovable AI Gateway
// (Gemini) to extract a normalized list of course-to-course rules from the
// document, and writes them into:
//   - credit_transfer_rules (current snapshot, with full provenance fields)
//   - transfer_evidence     (immutable audit trail for each insert/change)
//
// Auth: requires header `x-cron-secret: <OPS_CRON_SECRET>` if configured.
//
// Body (optional): { batchSize?: number (default 5), agreementIds?: uuid[] }
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

interface AgreementRow {
  id: string;
  source_system: string;
  from_institution_code: string;
  to_institution_code: string;
  academic_year: string;
  major_code: string | null;
  major_name: string | null;
  source_url: string;
}

interface ExtractedRule {
  source_course_code: string;
  source_course_title?: string;
  target_course_code: string | null;
  target_course_title?: string | null;
  acceptance_status: "accepted" | "elective" | "rejected";
  notes?: string;
}

async function callGeminiExtract(
  articulationDocText: string,
  agreement: AgreementRow,
): Promise<ExtractedRule[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const prompt = `You are extracting course articulation rules from an ASSIST.org agreement.

Source institution code: ${agreement.from_institution_code}
Target institution code: ${agreement.to_institution_code}
Major: ${agreement.major_name ?? agreement.major_code ?? "unknown"}
Academic year: ${agreement.academic_year}

The document below describes how courses from the sending (community college) institution articulate to courses at the receiving (4-year) institution. Extract one rule per source course. If multiple source courses combine to satisfy a target, repeat the target on each row.

Return STRICT JSON only, no prose, in this exact shape:
{
  "rules": [
    {
      "source_course_code": "ENGL 1A",
      "source_course_title": "English Composition",
      "target_course_code": "ENGL 101",
      "target_course_title": "Freshman Composition",
      "acceptance_status": "accepted",
      "notes": "Direct equivalent"
    }
  ]
}

If a source course is accepted but does not match a specific target course, use acceptance_status="elective" and target_course_code=null.
If a source course is explicitly NOT accepted, use acceptance_status="rejected".
Only include rules you can identify with high confidence from the text.

DOCUMENT:
${articulationDocText.slice(0, 60000)}
`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You output only valid JSON. No markdown, no commentary." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";

  let parsed: { rules?: ExtractedRule[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  return Array.isArray(parsed.rules) ? parsed.rules : [];
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
  try { body = await req.json(); } catch { /* empty */ }
  const batchSize = Math.min(Number(body.batchSize ?? 5), 20);
  const specificIds = body.agreementIds as string[] | undefined;

  // Open run record
  const { data: runRow, error: runErr } = await supabase
    .from("assist_ingestion_runs")
    .insert({
      source_system: "ASSIST",
      run_type: "manual",
      status: "running",
      parameters: { batchSize, specificIds },
    })
    .select("id")
    .single();
  if (runErr) return json(500, { error: "run_create_failed", detail: runErr.message });
  const runId = runRow.id as string;

  // Claim a batch
  let query = supabase
    .from("articulation_agreements")
    .select("id, source_system, from_institution_code, to_institution_code, academic_year, major_code, major_name, source_url")
    .eq("source_system", "ASSIST")
    .limit(batchSize);

  if (specificIds && specificIds.length) {
    query = query.in("id", specificIds);
  } else {
    query = query.eq("status", "pending");
  }

  const { data: agreements, error: claimErr } = await query;
  if (claimErr) {
    await supabase.from("assist_ingestion_runs").update({
      status: "failed", completed_at: new Date().toISOString(),
      error_log: { fatal: claimErr.message },
    }).eq("id", runId);
    return json(500, { error: "claim_failed", detail: claimErr.message });
  }

  let fetched = 0, parsed = 0, rulesInserted = 0, evidenceRows = 0, errorCount = 0;
  const errors: string[] = [];

  for (const ag of (agreements ?? []) as AgreementRow[]) {
    try {
      // Mark fetching
      await supabase.from("articulation_agreements")
        .update({ status: "fetching" }).eq("id", ag.id);

      // Parse the ASSIST key from source_url to call the articulation API
      // source_url contains viewByKey=<base64-ish key>
      const keyMatch = ag.source_url.match(/viewByKey=([^&]+)/);
      const key = keyMatch ? decodeURIComponent(keyMatch[1]) : null;
      if (!key) throw new Error("no_assist_key_in_source_url");

      const apiUrl = `${ASSIST_BASE}/articulation/Agreements?Key=${encodeURIComponent(key)}`;
      const docRes = await fetch(apiUrl, {
        headers: { Accept: "application/json", "User-Agent": "Pivot-Articulation-Ingestor/1.0" },
      });
      if (!docRes.ok) throw new Error(`fetch ${docRes.status}`);
      const docJson = await docRes.json();
      const docText = JSON.stringify(docJson);
      fetched++;

      await supabase.from("articulation_agreements").update({
        status: "fetched",
        fetched_at: new Date().toISOString(),
        raw_markdown: docText.slice(0, 200_000),
      }).eq("id", ag.id);

      // Extract rules via Gemini
      const extracted = await callGeminiExtract(docText, ag);
      parsed++;

      // Insert rules + evidence
      for (const r of extracted) {
        if (!r.source_course_code) continue;

        const ruleRow = {
          source_institution: ag.from_institution_code,
          source_institution_norm: ag.from_institution_code.toUpperCase(),
          source_course_code: r.source_course_code,
          source_course_code_norm: r.source_course_code.replace(/\s+/g, "").toUpperCase(),
          target_institution: ag.to_institution_code,
          target_institution_norm: ag.to_institution_code.toUpperCase(),
          target_course_code: r.target_course_code,
          acceptance_status: r.acceptance_status,
          rule_source: "ASSIST",
          provenance_system: "ASSIST",
          articulation_agreement_id: ag.id,
          evidence_url: ag.source_url,
          evidence_source_type: "state_articulation",
          confidence: 0.95,
          data_quality: "catalog_verified",
          verified: true,
          verification_source: "ASSIST",
          last_verified_at: new Date().toISOString(),
          is_active: true,
          rule_type: "course-to-course",
          status: "active",
          provenance_notes: r.notes ?? null,
        };

        const { data: inserted, error: insErr } = await supabase
          .from("credit_transfer_rules")
          .insert(ruleRow)
          .select("id")
          .single();

        if (insErr) {
          // Likely a unique-key clash — log but don't fail the whole batch
          errorCount++;
          errors.push(`rule insert ${r.source_course_code}: ${insErr.message}`);
          continue;
        }

        rulesInserted++;

        // Evidence audit row
        const { error: evErr } = await supabase.from("transfer_evidence").insert({
          rule_id: inserted.id,
          evidence_type: "state_articulation",
          evidence_url: ag.source_url,
          evidence_text: `ASSIST ${ag.academic_year} ${ag.major_name ?? ag.major_code}: ${r.source_course_code} -> ${r.target_course_code ?? "elective"}`,
          evidence_data: { extracted: r, agreement_id: ag.id },
          captured_at: new Date().toISOString(),
          captured_by: "assist-fetch-parse",
        });
        if (!evErr) evidenceRows++;
      }

      await supabase.from("articulation_agreements").update({
        status: "parsed",
        parsed_at: new Date().toISOString(),
        rules_extracted: extracted.length,
      }).eq("id", ag.id);
    } catch (e) {
      errorCount++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`agreement ${ag.id}: ${msg}`);
      await supabase.from("articulation_agreements")
        .update({ status: "error", fetch_error: msg })
        .eq("id", ag.id);
    }
  }

  await supabase.from("assist_ingestion_runs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    agreements_fetched: fetched,
    agreements_parsed: parsed,
    rules_inserted: rulesInserted,
    evidence_rows_inserted: evidenceRows,
    errors_count: errorCount,
    error_log: errors.length ? { errors: errors.slice(0, 100) } : null,
  }).eq("id", runId);

  return json(200, {
    success: true,
    run_id: runId,
    fetched, parsed, rules_inserted: rulesInserted, evidence_rows: evidenceRows,
    errors_count: errorCount, sample_errors: errors.slice(0, 5),
  });
});
