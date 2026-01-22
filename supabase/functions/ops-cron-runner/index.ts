import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checkedAt = new Date().toISOString();

  try {
    // Auth gate: require x-cron-secret if OPS_CRON_SECRET is configured
    const opsSecret = Deno.env.get("OPS_CRON_SECRET");
    if (opsSecret) {
      const provided = req.headers.get("x-cron-secret");
      if (!provided || provided !== opsSecret) {
        return json(401, { error: "unauthorized" });
      }
    }

    // Create service role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, { error: "missing_supabase_config", checked_at: checkedAt });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check enrichment queue for queued work
    const { count, error: countError } = await supabase
      .from("canonical_enrichment_queue")
      .select("id", { count: "exact", head: true })
      .eq("enrichment_status", "queued");

    const queuedCount = count ?? 0;

    if (countError) {
      console.error("Queue count error:", countError.message);
    }

    let workerCalled = false;
    let workerHttpStatus: number | null = null;
    let workerResult: Record<string, unknown> | null = null;

    // If there's work, invoke the enrichment worker
    if (queuedCount > 0) {
      const enrichmentSecret = Deno.env.get("ENRICHMENT_CRON_SECRET");
      
      if (!enrichmentSecret) {
        return json(500, {
          error: "missing_ENRICHMENT_CRON_SECRET",
          queued_count: queuedCount,
          worker_called: false,
          checked_at: checkedAt,
        });
      }

      try {
        const workerUrl = `${supabaseUrl}/functions/v1/canonical-enrichment-worker`;
        const response = await fetch(workerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": enrichmentSecret,
          },
          body: JSON.stringify({ batch_size: 25 }),
        });

        workerCalled = true;
        workerHttpStatus = response.status;

        try {
          workerResult = await response.json();
        } catch {
          workerResult = { raw_body: await response.text() };
        }
      } catch (fetchErr) {
        workerCalled = true;
        workerResult = {
          error: "worker_fetch_failed",
          detail: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        };
      }
    }

    // Self-healing: reset any stuck policy refresh runs (>60 min)
    let stuckRunsReset: Array<{ run_id: string; new_status: string; reason: string }> = [];
    try {
      const { data: resetResult, error: resetError } = await supabase
        .rpc("reset_stuck_policy_runs", { p_stuck_minutes: 60 });
      
      if (resetError) {
        console.error("Stuck runs reset error:", resetError.message);
      } else if (resetResult && resetResult.length > 0) {
        stuckRunsReset = resetResult;
        console.log(`Reset ${resetResult.length} stuck policy run(s)`);
      }
    } catch (resetErr) {
      console.error("Stuck runs reset failed:", resetErr);
    }

    // Always fetch operational health dashboard
    const { data: health, error: healthError } = await supabase
      .from("operational_health_dashboard")
      .select("*")
      .single();

    if (healthError) {
      console.error("Health query error:", healthError.message);
    }

    // Return 500 if worker was called but failed
    const workerFailed =
      workerCalled &&
      ((workerHttpStatus && workerHttpStatus >= 400) ||
       (workerResult && "error" in workerResult));

    return json(workerFailed ? 500 : 200, {
      worker_called: workerCalled,
      queued_count: queuedCount,
      worker_http_status: workerHttpStatus,
      worker_result: workerResult,
      stuck_runs_reset: stuckRunsReset.length > 0 ? stuckRunsReset : null,
      health: health ?? { error: healthError?.message },
      checked_at: checkedAt,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json(500, {
      error: "unexpected_error",
      detail: err instanceof Error ? err.message : String(err),
      checked_at: checkedAt,
    });
  }
});
