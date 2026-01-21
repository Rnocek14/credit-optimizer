// supabase/functions/canonical-enrichment-worker/index.ts
// Deterministic enrichment worker - fetches evidence, validates, writes titles
// v2: Added cron secret auth, stored-mode URL, finalUrl domain validation, missing_fields check
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type Job = {
  queue_id: string;
  source_course_id: string;
  provider_code: string;
  canonical_code: string;
  missing_fields: string[] | null;
  attempts: number;
};

type ProviderRegistry = {
  provider_code_norm: string;
  display_name: string | null;
  root_url: string | null;
  allowed_domains: string[] | null;
  canonical_url_mode: "root_only" | "pattern" | "stored" | null;
  canonical_url_pattern: string | null;
  title_min_length: number | null;
  forbidden_title_patterns: string[] | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function domainOf(urlStr: string): string | null {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function domainAllowed(urlStr: string, allowed: string[] | null): boolean {
  if (!allowed || allowed.length === 0) return false;
  const host = domainOf(urlStr);
  if (!host) return false;
  return allowed.some((d) => {
    const dom = d.toLowerCase();
    return host === dom || host.endsWith("." + dom);
  });
}

function buildFetchUrl(reg: ProviderRegistry, canonicalCode: string): string | null {
  const mode = reg.canonical_url_mode ?? "root_only";
  const root = reg.root_url ?? null;

  if (mode === "stored") {
    return null; // Caller must fetch from source_courses.canonical_url
  }

  if (mode === "pattern") {
    const pat = reg.canonical_url_pattern;
    if (!pat) return root;
    return pat.replaceAll("{code}", canonicalCode);
  }

  return root; // root_only
}

function extractTitleFromHtml(html: string): string | null {
  // Try <h1> first (often more specific than <title>)
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match?.[1]) {
    const h1 = h1Match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (h1.length > 0) return h1;
  }

  // Fall back to <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (title.length > 0) return title;
  }

  return null;
}

function detectBlocked(rawText: string): boolean {
  const lower = rawText.toLowerCase();
  return lower.includes("captcha") || 
         lower.includes("cloudflare") || 
         lower.includes("access denied") ||
         lower.includes("please verify you are a human") ||
         lower.includes("checking your browser");
}

function validateTitle(
  title: string | null,
  minLength: number,
  forbidden: string[]
): { valid: boolean; reason?: string } {
  if (!title) return { valid: false, reason: "NO_TITLE_FOUND" };
  
  if (title.length < minLength) {
    return { valid: false, reason: `TITLE_TOO_SHORT:${title.length}<${minLength}` };
  }

  const lower = title.toLowerCase();
  for (const pat of forbidden) {
    if (lower.includes(pat.toLowerCase())) {
      return { valid: false, reason: `FORBIDDEN_PATTERN:${pat}` };
    }
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ===== AUTH GATE: Require cron secret if configured =====
  const cronSecret = Deno.env.get("ENRICHMENT_CRON_SECRET");
  if (cronSecret) {
    const providedSecret = req.headers.get("x-cron-secret");
    if (!providedSecret || providedSecret !== cronSecret) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const workerId = Deno.env.get("ENRICHMENT_WORKER_ID") ?? `worker-${Date.now()}`;
  const fetchTimeout = parseInt(Deno.env.get("FETCH_TIMEOUT_MS") ?? "15000", 10);
  const maxBodyBytes = parseInt(Deno.env.get("MAX_BODY_BYTES") ?? "1500000", 10);

  // Parse batch size from request
  let batchSize = 5;
  try {
    const body = await req.json();
    if (body?.batch_size && typeof body.batch_size === "number") {
      batchSize = Math.min(Math.max(body.batch_size, 1), 25);
    }
  } catch {
    // Use default batch size
  }

  // 1) Claim jobs
  const { data: jobs, error: claimError } = await supabase.rpc("claim_enrichment_jobs", {
    p_batch_size: batchSize,
    p_worker_id: workerId,
  });

  if (claimError) {
    console.error("claim_enrichment_jobs error:", claimError);
    return jsonResponse({ error: "Failed to claim jobs", detail: claimError.message }, 500);
  }

  if (!jobs || jobs.length === 0) {
    return jsonResponse({ message: "No jobs to process", processed: 0 });
  }

  console.log(`Claimed ${jobs.length} jobs for worker ${workerId}`);

  // 2) Load provider registry
  const providerCodes = [...new Set(jobs.map((j: Job) => j.provider_code))];
  const { data: registries, error: regError } = await supabase
    .from("provider_registry")
    .select("*")
    .in("provider_code_norm", providerCodes);

  if (regError) {
    console.error("provider_registry fetch error:", regError);
    for (const job of jobs) {
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "REGISTRY_FETCH_FAILED",
        p_error_message: regError.message,
      });
    }
    return jsonResponse({ error: "Failed to fetch registry", processed: 0 }, 500);
  }

  const regMap = new Map<string, ProviderRegistry>(
    (registries ?? []).map((r: ProviderRegistry) => [r.provider_code_norm, r])
  );

  const results: { queue_id: string; status: string; error?: string }[] = [];

  // Helper to complete a job as failed and store evidence
  async function completeFail(
    job: Job,
    reg: ProviderRegistry | null,
    fetchUrl: string | null,
    finalUrl: string | null,
    httpStatus: number,
    rawText: string | null,
    contentHash: string | null,
    errorCode: string,
    errorMessage: string,
    validation?: Record<string, unknown>
  ) {
    // Store evidence (with error check)
    const { error: evErr } = await supabase.from("canonical_enrichment_evidence").insert({
      queue_id: job.queue_id,
      source_course_id: job.source_course_id,
      provider_code: job.provider_code,
      canonical_code: job.canonical_code,
      fetch_url: fetchUrl ?? "",
      final_url: finalUrl,
      http_status: httpStatus,
      content_sha256: contentHash,
      raw_text: rawText?.slice(0, 50000) ?? null,
      content_length: rawText?.length ?? 0,
      extractor_version: "v2",
      parse_result: { error: errorMessage },
      validation: validation ?? { passed: false, reason: errorCode },
      validation_passed: false,
    });

    if (evErr) {
      console.error(`Evidence write failed for ${job.queue_id}:`, evErr);
      // Still try to complete job, but with evidence error
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "EVIDENCE_WRITE_FAILED",
        p_error_message: evErr.message,
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: "EVIDENCE_WRITE_FAILED" });
      return;
    }

    await supabase.rpc("complete_enrichment_job", {
      p_queue_id: job.queue_id,
      p_success: false,
      p_error_code: errorCode,
      p_error_message: errorMessage,
    });
    results.push({ queue_id: job.queue_id, status: "failed", error: errorCode });
  }

  // 3) Process each job
  for (const job of jobs as Job[]) {
    const reg = regMap.get(job.provider_code);

    if (!reg) {
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "REGISTRY_MISSING",
        p_error_message: `No registry entry for provider ${job.provider_code}`,
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: "REGISTRY_MISSING" });
      continue;
    }

    // ===== CHECK: Does this job actually need canonical_title? =====
    const needsTitle = (job.missing_fields ?? []).includes("canonical_title");
    if (!needsTitle) {
      // Nothing to do - mark as success
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: true,
      });
      results.push({ queue_id: job.queue_id, status: "succeeded" });
      continue;
    }

    // ===== BUILD FETCH URL (with stored-mode support) =====
    let fetchUrl = buildFetchUrl(reg, job.canonical_code);
    const mode = reg.canonical_url_mode ?? "root_only";

    // Handle stored-mode: fetch URL from source_courses
    if (!fetchUrl && mode === "stored") {
      const { data: sc, error: scErr } = await supabase
        .from("source_courses")
        .select("canonical_url")
        .eq("id", job.source_course_id)
        .maybeSingle();

      if (scErr || !sc?.canonical_url) {
        await completeFail(job, reg, null, null, 0, null, null, "NO_FETCH_URL", 
          "stored mode but no source_courses.canonical_url");
        continue;
      }
      fetchUrl = sc.canonical_url;
    }

    if (!fetchUrl) {
      await completeFail(job, reg, null, null, 0, null, null, "NO_FETCH_URL",
        "Could not build fetch URL from registry");
      continue;
    }

    // ===== VALIDATE DOMAIN (initial URL) =====
    if (!domainAllowed(fetchUrl, reg.allowed_domains)) {
      await completeFail(job, reg, fetchUrl, null, 0, null, null, "DOMAIN_NOT_ALLOWED",
        `Domain not in allowed list: ${domainOf(fetchUrl)}`);
      continue;
    }

    // ===== FETCH WITH TIMEOUT =====
    let response: Response;
    let finalUrl = fetchUrl;
    let rawText = "";
    let httpStatus = 0;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), fetchTimeout);

      response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "EnrichmentWorker/2.0 (+https://lovable.dev)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      clearTimeout(timeout);
      finalUrl = response.url;
      httpStatus = response.status;

      if (response.ok) {
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > maxBodyBytes) {
          rawText = "";
        } else {
          rawText = await response.text();
          if (rawText.length > maxBodyBytes) {
            rawText = rawText.slice(0, maxBodyBytes);
          }
        }
      }
    } catch (fetchErr) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await completeFail(job, reg, fetchUrl, null, 0, null, null, "FETCH_FAILED", errMsg);
      continue;
    }

    // ===== VALIDATE FINAL URL DOMAIN (after redirects) =====
    if (!domainAllowed(finalUrl, reg.allowed_domains)) {
      const contentHash = rawText.length > 0 ? await sha256Hex(rawText) : null;
      await completeFail(job, reg, fetchUrl, finalUrl, httpStatus, rawText, contentHash,
        "FINAL_URL_DOMAIN_NOT_ALLOWED", `Redirect to non-allowed domain: ${domainOf(finalUrl)}`);
      continue;
    }

    // ===== DETECT BLOCKED (captcha, cloudflare, etc.) =====
    if (rawText && detectBlocked(rawText)) {
      const contentHash = rawText.length > 0 ? await sha256Hex(rawText) : null;
      await completeFail(job, reg, fetchUrl, finalUrl, httpStatus, rawText, contentHash,
        "BLOCKED", "Detected captcha/cloudflare/access-denied page");
      continue;
    }

    // ===== EXTRACT + VALIDATE TITLE =====
    const contentHash = rawText.length > 0 ? await sha256Hex(rawText) : null;
    const extractedTitle = extractTitleFromHtml(rawText);
    const minLen = reg.title_min_length ?? 6;
    const forbidden = reg.forbidden_title_patterns ?? ["404", "not found", "access denied", "sign in", "captcha", "error"];
    
    const validation = httpStatus === 200
      ? validateTitle(extractedTitle, minLen, forbidden)
      : { valid: false, reason: `HTTP_STATUS:${httpStatus}` };

    // ===== STORE EVIDENCE (with error check) =====
    const { error: evErr } = await supabase.from("canonical_enrichment_evidence").insert({
      queue_id: job.queue_id,
      source_course_id: job.source_course_id,
      provider_code: job.provider_code,
      canonical_code: job.canonical_code,
      fetch_url: fetchUrl,
      final_url: finalUrl,
      http_status: httpStatus,
      content_sha256: contentHash,
      raw_text: rawText.slice(0, 50000),
      content_length: rawText.length,
      extractor_version: "v2",
      parse_result: { title_extracted: extractedTitle },
      validation: validation,
      validation_passed: validation.valid,
      field_written: validation.valid ? "canonical_title" : null,
      value_written: validation.valid ? extractedTitle : null,
    });

    if (evErr) {
      console.error(`Evidence write failed for ${job.queue_id}:`, evErr);
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "EVIDENCE_WRITE_FAILED",
        p_error_message: evErr.message,
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: "EVIDENCE_WRITE_FAILED" });
      continue;
    }

    if (!validation.valid) {
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "VALIDATION_FAILED",
        p_error_message: validation.reason ?? "Unknown validation failure",
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: validation.reason });
      continue;
    }

    // ===== WRITE TO SOURCE_COURSES (only if title was missing) =====
    const { error: updateError } = await supabase
      .from("source_courses")
      .update({ canonical_title: extractedTitle, updated_at: new Date().toISOString() })
      .eq("id", job.source_course_id)
      .is("canonical_title", null);

    if (updateError) {
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "WRITE_FAILED",
        p_error_message: updateError.message,
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: "WRITE_FAILED" });
      continue;
    }

    // ===== SUCCESS! =====
    await supabase.rpc("complete_enrichment_job", {
      p_queue_id: job.queue_id,
      p_success: true,
    });
    results.push({ queue_id: job.queue_id, status: "succeeded" });
    console.log(`Enriched ${job.provider_code}:${job.canonical_code} with title: ${extractedTitle}`);
  }

  const succeeded = results.filter((r) => r.status === "succeeded").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return jsonResponse({
    worker_id: workerId,
    processed: results.length,
    succeeded,
    failed,
    results,
  });
});
