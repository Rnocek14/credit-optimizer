// supabase/functions/canonical-enrichment-worker/index.ts
// Deterministic enrichment worker - fetches evidence, validates, writes titles
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    return null; // Worker uses source_courses.canonical_url if present
  }

  if (mode === "pattern") {
    const pat = reg.canonical_url_pattern;
    if (!pat) return root;
    return pat.replaceAll("{code}", canonicalCode);
  }

  return root; // root_only
}

function extractTitleFromHtml(html: string): string | null {
  // Try <title> first
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].trim().replace(/\s+/g, ' ');
    if (title.length > 0) return title;
  }

  // Try <h1>
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match?.[1]) {
    const h1 = h1Match[1].trim().replace(/\s+/g, ' ');
    if (h1.length > 0) return h1;
  }

  return null;
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
    // Mark all jobs as failed
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

    // Build fetch URL
    const fetchUrl = buildFetchUrl(reg, job.canonical_code);
    if (!fetchUrl) {
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "NO_FETCH_URL",
        p_error_message: "Could not build fetch URL from registry",
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: "NO_FETCH_URL" });
      continue;
    }

    // Validate domain
    if (!domainAllowed(fetchUrl, reg.allowed_domains)) {
      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "DOMAIN_NOT_ALLOWED",
        p_error_message: `Domain not in allowed list: ${domainOf(fetchUrl)}`,
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: "DOMAIN_NOT_ALLOWED" });
      continue;
    }

    // Fetch with timeout
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
          "User-Agent": "EnrichmentWorker/1.0 (+https://lovable.dev)",
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
      
      // Log evidence of failed fetch
      await supabase.from("canonical_enrichment_evidence").insert({
        queue_id: job.queue_id,
        source_course_id: job.source_course_id,
        provider_code: job.provider_code,
        canonical_code: job.canonical_code,
        fetch_url: fetchUrl,
        final_url: null,
        http_status: 0,
        content_sha256: null,
        raw_text: null,
        content_length: 0,
        extractor_version: "v1",
        parse_result: { error: errMsg },
        validation: { passed: false, reason: "FETCH_FAILED" },
        validation_passed: false,
      });

      await supabase.rpc("complete_enrichment_job", {
        p_queue_id: job.queue_id,
        p_success: false,
        p_error_code: "FETCH_FAILED",
        p_error_message: errMsg,
      });
      results.push({ queue_id: job.queue_id, status: "failed", error: "FETCH_FAILED" });
      continue;
    }

    // Calculate content hash
    const contentHash = rawText.length > 0 ? await sha256Hex(rawText) : null;

    // Extract title
    const extractedTitle = extractTitleFromHtml(rawText);
    const minLen = reg.title_min_length ?? 6;
    const forbidden = reg.forbidden_title_patterns ?? ["404", "not found", "access denied", "sign in", "captcha", "error"];
    
    const validation = httpStatus === 200
      ? validateTitle(extractedTitle, minLen, forbidden)
      : { valid: false, reason: `HTTP_STATUS:${httpStatus}` };

    // Store evidence
    await supabase.from("canonical_enrichment_evidence").insert({
      queue_id: job.queue_id,
      source_course_id: job.source_course_id,
      provider_code: job.provider_code,
      canonical_code: job.canonical_code,
      fetch_url: fetchUrl,
      final_url: finalUrl,
      http_status: httpStatus,
      content_sha256: contentHash,
      raw_text: rawText.slice(0, 50000), // Limit stored text
      content_length: rawText.length,
      extractor_version: "v1",
      parse_result: { title_extracted: extractedTitle },
      validation: validation,
      validation_passed: validation.valid,
      field_written: validation.valid ? "canonical_title" : null,
      value_written: validation.valid ? extractedTitle : null,
    });

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

    // Write to source_courses (only if title was missing)
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

    // Success!
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
