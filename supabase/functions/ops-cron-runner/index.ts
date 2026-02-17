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

function safeStringify(obj: unknown, maxLen = 1500): string {
  let s = "";
  try { s = JSON.stringify(obj); } catch { s = String(obj); }
  return s.length > maxLen ? s.slice(0, maxLen) + "…(truncated)" : s;
}

// =========================================
// PROMOTION CONFIG HELPERS
// =========================================
type PromotionConfig = {
  min_confidence: number;
  min_evidence_count: number;
  require_allowlisted_domain: boolean;
  limit: number;
  dry_run: boolean;
};

const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  min_confidence: 0.85,
  min_evidence_count: 1,
  require_allowlisted_domain: true,
  limit: 200,
  dry_run: false,
};

// deno-lint-ignore no-explicit-any
async function loadPromotionConfig(supabase: any): Promise<PromotionConfig> {
  const { data, error } = await supabase
    .from("ops_kv")
    .select("value")
    .eq("key", "transfer_edge_promotion_config")
    .maybeSingle();

  if (error) {
    console.error("[PROMOTION] config read error:", error.message);
    return DEFAULT_PROMOTION_CONFIG;
  }

  const v = (data?.value ?? {}) as Record<string, unknown>;
  return {
    min_confidence: typeof v.min_confidence === "number" ? v.min_confidence : DEFAULT_PROMOTION_CONFIG.min_confidence,
    min_evidence_count: typeof v.min_evidence_count === "number" ? v.min_evidence_count : DEFAULT_PROMOTION_CONFIG.min_evidence_count,
    require_allowlisted_domain: typeof v.require_allowlisted_domain === "boolean" ? v.require_allowlisted_domain : DEFAULT_PROMOTION_CONFIG.require_allowlisted_domain,
    limit: typeof v.limit === "number" ? v.limit : DEFAULT_PROMOTION_CONFIG.limit,
    dry_run: typeof v.dry_run === "boolean" ? v.dry_run : DEFAULT_PROMOTION_CONFIG.dry_run,
  };
}

// deno-lint-ignore no-explicit-any
async function writeOpsKv(supabase: any, key: string, value: unknown) {
  const { error } = await supabase
    .from("ops_kv")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) console.error(`[OPS_KV] upsert failed for ${key}:`, error.message);
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
    // 0. HEARTBEAT: Write "runner started" signal FIRST
    // =========================================
    // This guarantees we have a "cron attempted" breadcrumb even if
    // subsequent steps fail. Allows golden_scan_report() to distinguish
    // "cron never ran" vs "cron ran but step X failed".
    let heartbeatWritten = false;
    try {
      const { error: heartbeatError } = await supabase
        .from("ops_kv")
        .upsert({
          key: "ops_cron_runner_heartbeat",
          value: { last_seen_at: checkedAt },
        }, { onConflict: "key" });
      
      if (heartbeatError) {
        console.error("Heartbeat write error:", heartbeatError.message);
      } else {
        heartbeatWritten = true;
        console.log("Runner heartbeat written:", checkedAt);
      }
    } catch (hbErr) {
      console.error("Heartbeat write failed:", hbErr);
    }

    // =========================================
    // 0.4 BACKFILL: rules → inferred edges (auto-create)
    // =========================================
    let backfillResult: Record<string, unknown> | null = null;
    let backfillExecuted = false;
    let backfillError: string | null = null;

    try {
      console.log("[BACKFILL] starting: rules → inferred edges");

      const { data, error } = await supabase.rpc("backfill_inferred_edges_from_rules", {
        p_limit: 100,
      });

      backfillExecuted = true;

      if (error) {
        console.error("[BACKFILL] RPC error:", error.message);
        backfillError = error.message;
      } else {
        backfillResult = data as Record<string, unknown>;
        console.log("[BACKFILL] result:", {
          inserted_count: data?.inserted_count,
          evidence_inserted: data?.evidence_inserted,
          skipped_existing: data?.skipped_existing,
        });

        await writeOpsKv(supabase, "backfill_last_result", {
          at: checkedAt,
          result: data,
        });
      }
    } catch (e: unknown) {
      backfillExecuted = true;
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[BACKFILL] failed:", msg);
      backfillError = msg;
    }

    // =========================================
    // 0.5 TRANSFER EDGE PROMOTION (inferred → verified)
    // =========================================
    let promotionResult: Record<string, unknown> | null = null;
    let promotionExecuted = false;
    let promotionError: string | null = null;
    let promotionConfig: PromotionConfig | null = null;

    try {
      promotionConfig = await loadPromotionConfig(supabase);
      console.log("[PROMOTION] starting with config:", promotionConfig);

      const { data, error } = await supabase.rpc("promote_eligible_edges", {
        p_min_confidence: promotionConfig.min_confidence,
        p_min_evidence_count: promotionConfig.min_evidence_count,
        p_require_allowlisted_domain: promotionConfig.require_allowlisted_domain,
        p_limit: promotionConfig.limit,
        p_dry_run: promotionConfig.dry_run,
        p_promoted_by: "auto:ops-cron-runner",
        p_reason: "Auto-promotion: allowlisted evidence + confidence thresholds met",
      });

      promotionExecuted = true;

      if (error) {
        console.error("[PROMOTION] RPC error:", error.message);
        promotionError = error.message;
        await writeOpsKv(supabase, "transfer_edge_promotion_last_error", {
          at: checkedAt,
          message: error.message,
        });
      } else {
        promotionResult = data as Record<string, unknown>;
        console.log("[PROMOTION] result:", {
          dry_run: data?.dry_run,
          promoted_count: data?.promoted_count,
          would_promote_count: data?.would_promote_count,
        });

        await writeOpsKv(supabase, "transfer_edge_promotion_last_result", {
          at: checkedAt,
          result: data,
        });
        await writeOpsKv(supabase, "transfer_edge_promotion_last_ran_at", {
          last_ran_at: checkedAt,
        });
      }
    } catch (e: unknown) {
      promotionExecuted = true;
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[PROMOTION] failed:", msg);
      promotionError = msg;
      await writeOpsKv(supabase, "transfer_edge_promotion_last_error", {
        at: checkedAt,
        message: msg,
      });
    }

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
      const [totalResult, nullResult] = await Promise.all([
        supabase
          .from("scrape_url_templates")
          .select("id", { head: true, count: "exact" }),
        supabase
          .from("scrape_url_templates")
          .select("id", { head: true, count: "exact" })
          .is("last_scraped_at", null),
      ]);
      
      templateHealth = {
        null_last_scraped: nullResult.count ?? 0,
        total: totalResult.count ?? 0,
      };
    } catch (templateErr) {
      console.error("Template health check failed:", templateErr);
    }

    // =========================================
    // 6. Invariant checks (A-C) with severity
    // =========================================
    type InvariantCheck = {
      id: string;
      name: string;
      severity: "warn" | "fail";
      count: number;
      detail?: string;
    };
    const invariantChecks: InvariantCheck[] = [];
    let invariantsOk = true;

    try {
      // Run all invariant queries in parallel
      const [waivedPacksResult, badProvenanceResult, verifiedNoEvidenceResult] = await Promise.all([
        // A) Active packs with confidence waivers (warning - expected short term)
        supabase
          .from("institution_policy_packs")
          .select("institution", { head: true, count: "exact" })
          .eq("status", "active")
          .eq("policy_data->>confidence_waived", "true"),
        
        // B) Active packs missing provenance fields (hard fail - should be impossible)
        supabase.rpc("count_active_packs_missing_provenance"),
        
        // C) Verified transfer rules missing evidence (hard fail)
        supabase
          .from("credit_transfer_rules")
          .select("id", { head: true, count: "exact" })
          .eq("acceptance_status", "accepted")
          .is("evidence_url", null),
      ]);

      // A) Waived packs (warning)
      const waivedCount = waivedPacksResult.count ?? 0;
      if (waivedCount > 0) {
        invariantChecks.push({
          id: "waived_active_packs",
          name: "Active packs with confidence waivers",
          severity: "warn",
          count: waivedCount,
          detail: "Expected to decrease as scraper populates confidence scores",
        });
      }

      // B) Bad provenance (fail)
      const badProvCount = typeof badProvenanceResult.data === "number" 
        ? badProvenanceResult.data 
        : 0;
      if (badProvCount > 0) {
        invariantChecks.push({
          id: "missing_provenance_fields",
          name: "Active packs missing provenance verification",
          severity: "fail",
          count: badProvCount,
          detail: "Gate 7 bypass detected - investigate immediately",
        });
        invariantsOk = false;
      }

      // C) Verified without evidence (fail)
      const noEvidenceCount = verifiedNoEvidenceResult.count ?? 0;
      if (noEvidenceCount > 0) {
        invariantChecks.push({
          id: "verified_missing_evidence",
          name: "Accepted rules missing evidence_url",
          severity: "fail",
          count: noEvidenceCount,
          detail: "Compliance violation - will auto-repair",
        });
        invariantsOk = false;
      }
    } catch (invErr) {
      console.error("Invariant checks failed:", invErr);
      invariantChecks.push({
        id: "invariant_error",
        name: "Invariant check execution failed",
        severity: "fail",
        count: 0,
        detail: invErr instanceof Error ? invErr.message : String(invErr),
      });
      invariantsOk = false;
    }

    // =========================================
    // 7. Auto-repair: Downgrade active→draft if missing evidence
    // =========================================
    let autoRepairResult: { downgraded_count: number; executed: boolean } | null = null;
    try {
      // First check if repair is needed (using corrected RPC)
      const { data: needsRepairCount } = await supabase.rpc("count_active_rules_missing_evidence");
      const repairNeeded = typeof needsRepairCount === "number" && needsRepairCount > 0;
      
      if (repairNeeded) {
        console.log(`[AUTO-REPAIR] Found ${needsRepairCount} active rules without evidence - repairing`);
        
        // Execute the repair RPC (downgrades to draft)
        const { data: repairedCount, error: repairError } = await supabase.rpc("repair_active_rules_missing_evidence");
        
        if (repairError) {
          console.error("[AUTO-REPAIR] Repair failed:", repairError.message);
          autoRepairResult = { downgraded_count: 0, executed: false };
        } else {
          console.log(`[AUTO-REPAIR] Downgraded ${repairedCount} rules to draft status`);
          autoRepairResult = { downgraded_count: repairedCount ?? 0, executed: true };
        }
      } else {
        autoRepairResult = { downgraded_count: 0, executed: false };
      }
    } catch (repairErr) {
      console.error("Auto-repair failed:", repairErr);
      autoRepairResult = { downgraded_count: 0, executed: false };
    }

    // =========================================
    // 8. Golden Scan Report + Snapshot Storage
    // =========================================
    let goldenScanResult: Record<string, unknown> | null = null;
    let snapshotStored = false;
    try {
      const { data: scanReport, error: scanError } = await supabase
        .rpc("golden_scan_report", { p_include_institution_details: false });
      
      if (scanError) {
        console.error("Golden scan report error:", scanError.message);
      } else if (scanReport) {
        goldenScanResult = scanReport as Record<string, unknown>;
        // Safely count blockers/warnings (JSONB arrays from PostgREST)
        const blockersCount = Array.isArray(scanReport.blockers) ? scanReport.blockers.length : 0;
        const warningsCount = Array.isArray(scanReport.warnings) ? scanReport.warnings.length : 0;
        console.log("Golden scan completed:", {
          ok: scanReport.ok,
          blockers: blockersCount,
          warnings: warningsCount,
        });
        
        // Build composite report with promotion data
        const compositeReport = {
          golden_scan: scanReport,
          backfill: {
            executed: backfillExecuted,
            result: backfillResult,
            error: backfillError,
          },
          transfer_edge_promotion: {
            executed: promotionExecuted,
            config: promotionConfig,
            result: promotionResult,
            error: promotionError,
          },
        };
        
        // Store snapshot for historical tracking
        const { error: insertError } = await supabase
          .from("ops_audit_snapshots")
          .insert({
            report: compositeReport,
            snapshot_type: "golden_scan",
            triggered_by: "ops-cron-runner",
          });
        
        if (insertError) {
          console.error("Snapshot insert error:", insertError.message);
        } else {
          snapshotStored = true;
          console.log("Audit snapshot stored successfully");
        }
      }
    } catch (goldenErr) {
      console.error("Golden scan failed:", goldenErr);
    }

    // =========================================
    // Response
    // =========================================
    // Collect errors for clean monitoring
    const errors: Array<{ scope: string; detail: string }> = [];
    
    const workerFailed =
      workerCalled &&
      ((workerHttpStatus && workerHttpStatus >= 400) ||
       (workerResult && "error" in workerResult));
    if (workerFailed) {
      errors.push({ scope: "enrichment", detail: `HTTP ${workerHttpStatus}: ${safeStringify(workerResult)}` });
    }

    const policyScanFailed = 
      policyScanTriggered &&
      ((policyScanHttpStatus && policyScanHttpStatus >= 400) ||
       (policyScanResult && "error" in policyScanResult));
    if (policyScanFailed) {
      errors.push({ scope: "policy_scan", detail: `HTTP ${policyScanHttpStatus}: ${safeStringify(policyScanResult)}` });
    }

    // Include invariant failures in errors
    if (!invariantsOk) {
      const failedInvariants = invariantChecks.filter(c => c.severity === "fail");
      for (const inv of failedInvariants) {
        errors.push({ 
          scope: `invariant:${inv.id}`, 
          detail: `${inv.name} (count: ${inv.count})` 
        });
      }
    }

    // Include backfill errors if any
    if (backfillError) {
      errors.push({ 
        scope: "backfill", 
        detail: `Edge backfill failed: ${backfillError}` 
      });
    }

    // Include promotion errors if any
    if (promotionError) {
      errors.push({ 
        scope: "promotion", 
        detail: `Edge promotion failed: ${promotionError}` 
      });
    }

    // Dual-status: ok = core infra ran, subtasks_ok = all steps succeeded
    // This prevents dashboards from going "red" when only one non-critical subtask failed
    const coreOk = heartbeatWritten; // Core infra check: heartbeat must succeed
    const subtasksOk = errors.length === 0;

    // Always return 200 so cron schedulers don't treat subtask failures as "cron broken"
    return json(200, {
      ok: coreOk,
      subtasks_ok: subtasksOk,
      errors: errors.length > 0 ? errors : null,
      
      // Backfill: rules → inferred edges
      backfill: {
        executed: backfillExecuted,
        inserted_count: (backfillResult as Record<string, unknown>)?.inserted_count ?? null,
        evidence_inserted: (backfillResult as Record<string, unknown>)?.evidence_inserted ?? null,
        skipped_existing: (backfillResult as Record<string, unknown>)?.skipped_existing ?? null,
        error: backfillError,
      },
      
      // Transfer edge promotion
      transfer_edge_promotion: {
        executed: promotionExecuted,
        promoted_count: (promotionResult as Record<string, unknown>)?.promoted_count ?? null,
        would_promote_count: (promotionResult as Record<string, unknown>)?.would_promote_count ?? null,
        dry_run: (promotionResult as Record<string, unknown>)?.dry_run ?? null,
        skips: (promotionResult as Record<string, unknown>)?.skips ?? null,
        error: promotionError,
      },
      
      // Invariants
      invariants: {
        ok: invariantsOk,
        checks: invariantChecks.length > 0 ? invariantChecks : null,
      },
      
      // Auto-repair results
      auto_repair: autoRepairResult,
      
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
      
      // Golden Scan (audit snapshot)
      golden_scan: goldenScanResult,
      golden_scan_snapshot_stored: snapshotStored,
      
      // Heartbeat
      heartbeat_written: heartbeatWritten,
      
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
