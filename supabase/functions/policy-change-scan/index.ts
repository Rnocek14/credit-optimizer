// =============================================================================
// POLICY-CHANGE-SCAN - Lightweight change detection + auto-requeue
// =============================================================================
// Scans templates for content changes and triggers policy-refresh-start
// when changes are detected. Designed for cron scheduling.
//
// Inputs:
// - institution?: string (optional; scan specific institution)
// - limit?: number (optional; max templates to scan, default 50)
// - stale_days?: number (optional; only scan templates not scraped in N days, default 7)
// - dry_run?: boolean (optional; if true, don't trigger refresh, just report)
// - cooldown_hours?: number (optional; skip institutions refreshed within N hours, default 6)
//
// Outputs:
// - scanned: number of templates scanned
// - changed: string[] (institution codes with detected changes)
// - triggered: boolean (whether policy-refresh-start was called)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ScanRequest {
  institution?: string;
  limit?: number;
  stale_days?: number;
  dry_run?: boolean;
  cooldown_hours?: number;
}

interface CrawlResponse {
  success: boolean;
  content_changed?: boolean;
  first_hash?: boolean;
  old_hash_present?: boolean;
  http_status?: number;
  content_length?: number;
  extracted_text_length?: number;
  error?: string;
}

interface AuditRecord {
  template_id: string;
  institution_code: string;
  url: string;
  hash_before: string | null;
  hash_after: string | null;
  content_changed: boolean;
  first_hash: boolean;
  scan_run_id: string;
  http_status?: number;
  content_length?: number;
  trigger_attempted: boolean;
  trigger_succeeded?: boolean;
  skip_reason?: string;
  batch_run_id?: string;
  task_id?: string;
}

// Skip reason precedence (highest to lowest priority)
type SkipReason = 
  | 'crawl_failed' 
  | 'error' 
  | 'first_hash' 
  | 'no_change' 
  | 'active_task' 
  | 'cooldown' 
  | 'dry_run' 
  | 'trigger_failed';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize scanRunId inside handler for safety
  let scanRunId = '';

  try {
    scanRunId = crypto.randomUUID();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: ScanRequest = await req.json().catch(() => ({}));
    const {
      institution,
      limit = 50,
      stale_days = 7,
      dry_run = false,
      cooldown_hours = 6,
    } = body;

    console.log(`[policy-change-scan] Starting run ${scanRunId}: institution=${institution || 'all'}, limit=${limit}, stale_days=${stale_days}, dry_run=${dry_run}, cooldown_hours=${cooldown_hours}`);

    // Track scan start time for timing validation
    const scanStartedAt = new Date();

    // Calculate stale threshold
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - stale_days);

    // Build query for templates to scan - use two separate queries for reliability
    // Query 1: Templates with null last_scraped_at
    let nullQuery = supabase
      .from('scrape_url_templates')
      .select('id, institution_code, url, last_hash, last_scraped_at')
      .eq('status', 'active')
      .is('last_scraped_at', null)
      .order('priority', { ascending: true })
      .limit(limit);

    // Query 2: Templates with stale last_scraped_at - order by stalest first for fairness
    let staleQuery = supabase
      .from('scrape_url_templates')
      .select('id, institution_code, url, last_hash, last_scraped_at')
      .eq('status', 'active')
      .lt('last_scraped_at', staleThreshold.toISOString())
      .order('last_scraped_at', { ascending: true, nullsFirst: true }) // Stalest first for fairness
      .order('priority', { ascending: true })
      .limit(limit);

    // Filter by institution if specified
    if (institution) {
      nullQuery = nullQuery.eq('institution_code', institution);
      staleQuery = staleQuery.eq('institution_code', institution);
    }

    const [nullResult, staleResult] = await Promise.all([nullQuery, staleQuery]);

    if (nullResult.error) {
      console.error('[policy-change-scan] Error fetching null templates:', nullResult.error);
    }
    if (staleResult.error) {
      console.error('[policy-change-scan] Error fetching stale templates:', staleResult.error);
    }

    // Merge and dedupe by id
    const allTemplates = [...(nullResult.data || []), ...(staleResult.data || [])];
    const seenIds = new Set<string>();
    const templates = allTemplates.filter(t => {
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    }).slice(0, limit);

    if (templates.length === 0) {
      console.log('[policy-change-scan] No stale templates found');
      return new Response(
        JSON.stringify({
          success: true,
          scan_run_id: scanRunId,
          scanned: 0,
          changed: [],
          triggered: false,
          message: 'No stale templates to scan',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[policy-change-scan] Found ${templates.length} stale templates to scan`);

    // Track changed institutions and audit records
    const changedInstitutions = new Set<string>();
    const auditRecords: AuditRecord[] = [];
    const scanResults: Array<{
      template_id: string;
      institution_code: string;
      url: string;
      status: string;
      content_changed: boolean;
      first_hash?: boolean;
      error?: string;
    }> = [];

    // Process each template
    for (const template of templates) {
      try {
        console.log(`[policy-change-scan] Crawling: ${template.url}`);

        // Call transfer-scraper-crawl with template_id for hash comparison
        const crawlResponse = await fetch(`${supabaseUrl}/functions/v1/transfer-scraper-crawl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({
            url: template.url,
            institution: template.institution_code,
            job_type: 'policy',
            template_id: template.id,
          }),
        });

        if (!crawlResponse.ok) {
          const errorText = await crawlResponse.text();
          console.error(`[policy-change-scan] Crawl failed for ${template.url}: ${errorText}`);
          scanResults.push({
            template_id: template.id,
            institution_code: template.institution_code,
            url: template.url,
            status: 'crawl_failed',
            content_changed: false,
            error: errorText,
          });
          auditRecords.push({
            template_id: template.id,
            institution_code: template.institution_code,
            url: template.url,
            hash_before: template.last_hash,
            hash_after: null,
            content_changed: false,
            first_hash: false,
            scan_run_id: scanRunId,
            trigger_attempted: false,
            skip_reason: 'crawl_failed',
          });
          continue;
        }

        const crawlData: CrawlResponse = await crawlResponse.json();

        // Check if content changed (first_hash means new template, don't trigger)
        const isFirstHash = crawlData.first_hash === true;
        const isChange = crawlData.content_changed === true && !isFirstHash;
        
        if (isChange) {
          console.log(`[policy-change-scan] Change detected: ${template.institution_code} - ${template.url}`);
          changedInstitutions.add(template.institution_code);
        }

        scanResults.push({
          template_id: template.id,
          institution_code: template.institution_code,
          url: template.url,
          status: 'success',
          content_changed: isChange,
          first_hash: isFirstHash,
        });

        // Determine hash_after: fetch template row if content changed to get updated hash
        // transfer-scraper-crawl doesn't return new_hash, so we need to query it
        // Validate timing to ensure we're reading the updated value, not stale data
        let hashAfter: string | null = null;
        if (isChange || isFirstHash) {
          const { data: updatedTemplate } = await supabase
            .from('scrape_url_templates')
            .select('last_hash, last_scraped_at')
            .eq('id', template.id)
            .maybeSingle();
          // Only trust the hash if it was updated during/after this scan started
          if (updatedTemplate?.last_scraped_at && new Date(updatedTemplate.last_scraped_at) >= scanStartedAt) {
            hashAfter = updatedTemplate.last_hash;
          } else {
            console.warn(`[policy-change-scan] hash_after not yet updated for template ${template.id}, last_scraped_at=${updatedTemplate?.last_scraped_at}`);
            hashAfter = null;
          }
        }

        // Initial skip_reason based on crawl result
        let skipReason: SkipReason | undefined;
        if (isFirstHash) {
          skipReason = 'first_hash';
        } else if (!isChange) {
          skipReason = 'no_change';
        }

        auditRecords.push({
          template_id: template.id,
          institution_code: template.institution_code,
          url: template.url,
          hash_before: template.last_hash,
          hash_after: hashAfter,
          content_changed: isChange,
          first_hash: isFirstHash,
          scan_run_id: scanRunId,
          http_status: crawlData.http_status,
          content_length: crawlData.content_length || crawlData.extracted_text_length,
          trigger_attempted: false,
          skip_reason: skipReason,
        });

        // Delay between crawls to avoid rate limiting (750ms for safety)
        await new Promise(resolve => setTimeout(resolve, 750));

      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`[policy-change-scan] Error processing ${template.url}: ${errorMsg}`);
        scanResults.push({
          template_id: template.id,
          institution_code: template.institution_code,
          url: template.url,
          status: 'error',
          content_changed: false,
          error: errorMsg,
        });
        auditRecords.push({
          template_id: template.id,
          institution_code: template.institution_code,
          url: template.url,
          hash_before: template.last_hash,
          hash_after: null,
          content_changed: false,
          first_hash: false,
          scan_run_id: scanRunId,
          trigger_attempted: false,
          skip_reason: 'error',
        });
      }
    }

    const changedList = Array.from(changedInstitutions);
    let triggered = false;
    let skippedActive: string[] = [];
    let skippedCooldown: string[] = [];
    let triggeredInstitutions: string[] = [];
    let batchRunId: string | null = null;

    // Debounce check: Only trigger if no active refresh for these institutions
    if (changedList.length > 0 && !dry_run) {
      // Check 1: Existing running/queued tasks (active refreshes)
      const { data: existingTasks } = await supabase
        .from('policy_refresh_tasks')
        .select('institution')
        .in('institution', changedList)
        .in('status', ['queued', 'running']);

      const alreadyQueued = new Set((existingTasks || []).map(t => t.institution));
      skippedActive = changedList.filter(inst => alreadyQueued.has(inst));

      // Check 2: Recently refreshed institutions (cooldown period)
      const cooldownThreshold = new Date();
      cooldownThreshold.setHours(cooldownThreshold.getHours() - cooldown_hours);

      const { data: recentTasks } = await supabase
        .from('policy_refresh_tasks')
        .select('institution')
        .in('institution', changedList)
        .gte('created_at', cooldownThreshold.toISOString())
        .in('status', ['complete']); // Only successful refreshes count for cooldown

      const recentlyRefreshed = new Set((recentTasks || []).map(t => t.institution));
      
      // Filter out both active and recently refreshed
      const toTrigger = changedList.filter(inst => 
        !alreadyQueued.has(inst) && !recentlyRefreshed.has(inst)
      );
      skippedCooldown = changedList.filter(inst => 
        !alreadyQueued.has(inst) && recentlyRefreshed.has(inst)
      );
      triggeredInstitutions = toTrigger;

      // Update audit records with skip reasons for debounced institutions
      // Use precedence: keep existing skip_reason if already set (crawl_failed, error, first_hash, no_change)
      for (const record of auditRecords) {
        if (record.content_changed && !record.skip_reason) {
          if (alreadyQueued.has(record.institution_code)) {
            record.skip_reason = 'active_task';
          } else if (recentlyRefreshed.has(record.institution_code)) {
            record.skip_reason = 'cooldown';
          }
        }
      }

      if (toTrigger.length > 0) {
        console.log(`[policy-change-scan] Triggering refresh for: ${toTrigger.join(', ')}`);

        // Call policy-refresh-start with the changed institutions
        const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/policy-refresh-start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({
            institutions: toTrigger,
            run_type: 'auto_change',
          }),
        });

        if (refreshResponse.ok) {
          triggered = true;
          const refreshData = await refreshResponse.json();
          batchRunId = refreshData.run_id || null;
          console.log(`[policy-change-scan] Successfully triggered refresh for ${toTrigger.length} institutions, run_id=${batchRunId}`);
          
          // Update audit records for triggered institutions - clear skip_reason
          for (const record of auditRecords) {
            if (toTrigger.includes(record.institution_code) && record.content_changed) {
              record.trigger_attempted = true;
              record.trigger_succeeded = true;
              record.batch_run_id = batchRunId || undefined;
              record.skip_reason = undefined; // Triggered successfully, no skip
            }
          }
        } else {
          const errorText = await refreshResponse.text();
          console.error(`[policy-change-scan] Failed to trigger refresh: ${errorText}`);
          
          // Mark as attempted but failed
          for (const record of auditRecords) {
            if (toTrigger.includes(record.institution_code) && record.content_changed) {
              record.trigger_attempted = true;
              record.trigger_succeeded = false;
              record.skip_reason = 'trigger_failed';
            }
          }
        }
      } else {
        console.log(`[policy-change-scan] All changed institutions skipped (active: ${skippedActive.length}, cooldown: ${skippedCooldown.length})`);
      }
    } else if (dry_run && changedList.length > 0) {
      // Mark dry run in audit records - only if not already skipped
      for (const record of auditRecords) {
        if (record.content_changed && !record.skip_reason) {
          record.skip_reason = 'dry_run';
        }
      }
    }

    // Write audit records in chunks to prevent single-row failures from nuking everything
    let totalWritten = 0;
    let totalFailed = 0;
    
    if (auditRecords.length > 0) {
      const CHUNK_SIZE = 100;

      for (let i = 0; i < auditRecords.length; i += CHUNK_SIZE) {
        const chunk = auditRecords.slice(i, i + CHUNK_SIZE);
        const { error: auditError } = await supabase
          .from('policy_change_audit')
          .insert(chunk.map(r => ({
            template_id: r.template_id,
            institution_code: r.institution_code,
            url: r.url,
            hash_before: r.hash_before,
            hash_after: r.hash_after,
            content_changed: r.content_changed,
            first_hash: r.first_hash,
            scan_run_id: r.scan_run_id,
            http_status: r.http_status,
            content_length: r.content_length,
            trigger_attempted: r.trigger_attempted,
            trigger_succeeded: r.trigger_succeeded,
            skip_reason: r.skip_reason,
            batch_run_id: r.batch_run_id,
          })));
        
        if (auditError) {
          console.error(`[policy-change-scan] Failed to write audit chunk ${i}-${i + chunk.length}:`, auditError);
          totalFailed += chunk.length;
        } else {
          totalWritten += chunk.length;
        }
      }
      
      console.log(`[policy-change-scan] Wrote ${totalWritten} audit records (${totalFailed} failed)`);
    }

    const summary = {
      success: true,
      scan_run_id: scanRunId,
      scanned: templates.length,
      changed: changedList,
      changed_count: changedList.length,
      triggered,
      triggered_institutions: triggeredInstitutions,
      batch_run_id: batchRunId,
      dry_run,
      skipped_active: skippedActive,
      skipped_cooldown: skippedCooldown,
      cooldown_hours,
      audit_records_written: totalWritten,
      audit_records_failed: totalFailed,
      scan_results: scanResults.slice(0, 20), // Limit results in response
    };

    console.log(`[policy-change-scan] Complete: scanned=${templates.length}, changed=${changedList.length}, triggered=${triggered}, skipped_active=${skippedActive.length}, skipped_cooldown=${skippedCooldown.length}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[policy-change-scan] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', scan_run_id: scanRunId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
