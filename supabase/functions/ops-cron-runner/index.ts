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

    // =========================================
    // 1. Self-healing: reset stuck policy runs
    // =========================================
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

    // =========================================
    // 2. Policy change scan (cooldown-guarded)
    // =========================================
    let policyScanTriggered = false;
    let policyScanResult: Record<string, unknown> | null = null;
    let policyScanHttpStatus: number | null = null;

    try {
      // Check if scan is due (360 min = 6 hours cooldown)
      const { data: shouldRun, error: shouldRunErr } = await supabase
        .rpc("claim_policy_scan_run", { p_cooldown_minutes: 360 });

      if (shouldRunErr) {
        console.error("claim_policy_scan_run error:", shouldRunErr.message);
      } else if (shouldRun) {
        console.log("Policy scan due — invoking policy-change-scan");
        policyScanTriggered = true;

        // Invoke the policy-change-scan edge function
        const scanResponse = await fetch(`${supabaseUrl}/functions/v1/policy-change-scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,
          },
          body: JSON.stringify({ 
            source: "ops-cron-runner",
            max_templates: 50  // Process up to 50 stale templates per run
          }),
        });

        policyScanHttpStatus = scanResponse.status;

        try {
          policyScanResult = await scanResponse.json();
        } catch {
          policyScanResult = { raw_body: await scanResponse.text() };
        }

        if (!scanResponse.ok) {
          console.error("policy-change-scan failed:", scanResponse.status, policyScanResult);
        } else {
          console.log("policy-change-scan completed:", policyScanResult);
        }
      } else {
        console.log("Policy scan not due (cooldown active)");
      }
    } catch (scanErr) {
      console.error("Policy scan invocation failed:", scanErr);
      policyScanResult = {
        error: "scan_invocation_failed",
        detail: scanErr instanceof Error ? scanErr.message : String(scanErr),
      };
    }

    // =========================================
    // 3. Enrichment worker (if queued work)
    // =========================================
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

    // =========================================
    // 4. Operational health dashboard
    // =========================================
    const { data: health, error: healthError } = await supabase
      .from("operational_health_dashboard")
      .select("*")
      .single();

    if (healthError) {
      console.error("Health query error:", healthError.message);
    }

    // =========================================
    // 5. Template health check (invariant)
    // =========================================
    let templateHealth: { null_last_scraped: number; total: number } | null = null;
    try {
      const { data: templateStats } = await supabase
        .from("scrape_url_templates")
        .select("last_scraped_at", { count: "exact" });
      
      if (templateStats) {
        const nullCount = templateStats.filter(t => t.last_scraped_at === null).length;
        templateHealth = {
          null_last_scraped: nullCount,
          total: templateStats.length,
        };
      }
    } catch (templateErr) {
      console.error("Template health check failed:", templateErr);
    }

    // =========================================
    // Response
    // =========================================
    const workerFailed =
      workerCalled &&
      ((workerHttpStatus && workerHttpStatus >= 400) ||
       (workerResult && "error" in workerResult));

    const policyScanFailed = 
      policyScanTriggered &&
      ((policyScanHttpStatus && policyScanHttpStatus >= 400) ||
       (policyScanResult && "error" in policyScanResult));

    return json(workerFailed || policyScanFailed ? 500 : 200, {
      // Self-healing
      stuck_runs_reset: stuckRunsReset.length > 0 ? stuckRunsReset : null,
      
      // Policy scan
      policy_scan_triggered: policyScanTriggered,
      policy_scan_http_status: policyScanHttpStatus,
      policy_scan_result: policyScanResult,
      
      // Enrichment
      enrichment_queued_count: queuedCount,
      enrichment_worker_called: workerCalled,
      enrichment_worker_http_status: workerHttpStatus,
      enrichment_worker_result: workerResult,
      
      // Health
      template_health: templateHealth,
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
