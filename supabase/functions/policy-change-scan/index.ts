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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body: ScanRequest = await req.json().catch(() => ({}));
    const {
      institution,
      limit = 50,
      stale_days = 7,
      dry_run = false,
    } = body;

    console.log(`[policy-change-scan] Starting: institution=${institution || 'all'}, limit=${limit}, stale_days=${stale_days}, dry_run=${dry_run}`);

    // Calculate stale threshold
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - stale_days);

    // Build query for templates to scan
    let query = supabase
      .from('scrape_url_templates')
      .select('id, institution_code, url, last_hash, last_scraped_at')
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .limit(limit);

    // Filter by institution if specified
    if (institution) {
      query = query.eq('institution_code', institution);
    }

    // Filter to only stale templates (not scraped recently)
    // Note: Templates with null last_scraped_at are always considered stale
    query = query.or(`last_scraped_at.is.null,last_scraped_at.lt.${staleThreshold.toISOString()}`);

    const { data: templates, error: templatesError } = await query;

    if (templatesError) {
      throw new Error(`Failed to load templates: ${templatesError.message}`);
    }

    if (!templates || templates.length === 0) {
      console.log('[policy-change-scan] No stale templates found');
      return new Response(
        JSON.stringify({
          success: true,
          scanned: 0,
          changed: [],
          triggered: false,
          message: 'No stale templates to scan',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[policy-change-scan] Found ${templates.length} stale templates to scan`);

    // Track changed institutions
    const changedInstitutions = new Set<string>();
    const scanResults: Array<{
      template_id: string;
      institution_code: string;
      url: string;
      status: string;
      content_changed: boolean;
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
          continue;
        }

        const crawlData = await crawlResponse.json();

        // Check if content changed
        if (crawlData.content_changed) {
          console.log(`[policy-change-scan] Change detected: ${template.institution_code} - ${template.url}`);
          changedInstitutions.add(template.institution_code);
        }

        scanResults.push({
          template_id: template.id,
          institution_code: template.institution_code,
          url: template.url,
          status: 'success',
          content_changed: crawlData.content_changed || false,
        });

        // Small delay between crawls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

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
      }
    }

    const changedList = Array.from(changedInstitutions);
    let triggered = false;

    // Debounce check: Only trigger if no active refresh for these institutions
    if (changedList.length > 0 && !dry_run) {
      // Check for existing running tasks for any of the changed institutions
      const { data: existingTasks } = await supabase
        .from('policy_refresh_tasks')
        .select('institution')
        .in('institution', changedList)
        .in('status', ['queued', 'running']);

      const alreadyQueued = new Set((existingTasks || []).map(t => t.institution));
      const toTrigger = changedList.filter(inst => !alreadyQueued.has(inst));

      if (toTrigger.length > 0) {
        console.log(`[policy-change-scan] Triggering refresh for: ${toTrigger.join(', ')}`);

        // Call policy-refresh-start with the changed institutions
        const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/policy-refresh-start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            institutions: toTrigger,
            run_type: 'auto_change',
          }),
        });

        if (refreshResponse.ok) {
          triggered = true;
          console.log(`[policy-change-scan] Successfully triggered refresh for ${toTrigger.length} institutions`);
        } else {
          const errorText = await refreshResponse.text();
          console.error(`[policy-change-scan] Failed to trigger refresh: ${errorText}`);
        }
      } else {
        console.log(`[policy-change-scan] All changed institutions already have active refreshes`);
      }
    }

    const summary = {
      success: true,
      scanned: templates.length,
      changed: changedList,
      changed_count: changedList.length,
      triggered,
      dry_run,
      scan_results: scanResults.slice(0, 20), // Limit results in response
    };

    console.log(`[policy-change-scan] Complete: scanned=${templates.length}, changed=${changedList.length}, triggered=${triggered}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[policy-change-scan] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
