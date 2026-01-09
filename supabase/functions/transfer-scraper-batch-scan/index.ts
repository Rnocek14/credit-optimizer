const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchScanResult {
  institution: string;
  status: 'success' | 'failed' | 'skipped';
  templates_scanned: number;
  succeeded: number;
  failed: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const tier = body?.tier ?? 'tier_a';
    const maxPriority = body?.maxPriority ?? 2;
    const concurrency = Math.min(body?.concurrency ?? 1, 3);
    const delayMs = body?.delayMs ?? 500;
    
    // Resume parameters for chunked processing (avoid timeout)
    const startAfter = body?.startAfter as string | undefined;
    const limit = Math.min(body?.limit ?? 5, 10); // Default 5, max 10 per run
    
    // Early-stop: exit cleanly before edge timeout (default 25s, max 28s to stay under 30s limit)
    const maxRuntimeMs = Math.min(body?.maxRuntimeMs ?? 25000, 28000);
    const startedAt = Date.now();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    console.log(`Batch scan starting: tier=${tier}, maxPriority=${maxPriority}, concurrency=${concurrency}, limit=${limit}, maxRuntimeMs=${maxRuntimeMs}, startAfter=${startAfter || 'beginning'}`);

    // Get institutions by tier from institutions table
    const institutionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/institutions?select=code&institution_tier=eq.${tier}&order=code.asc`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!institutionsResponse.ok) {
      const errorText = await institutionsResponse.text();
      throw new Error(`Failed to load institutions: ${errorText}`);
    }

    const institutionsData = await institutionsResponse.json();
    let institutions: string[] = institutionsData.map((r: { code: string }) => r.code);
    const totalInTier = institutions.length;

    if (institutions.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No institutions found for tier',
          tier,
          hint: 'Check that institutions have institution_tier set correctly'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply resume filter: start after specified institution
    if (startAfter) {
      const idx = institutions.findIndex(c => c === startAfter);
      if (idx >= 0) {
        institutions = institutions.slice(idx + 1);
      } else {
        console.log(`Warning: startAfter='${startAfter}' not found in tier, starting from beginning`);
      }
    }

    // Apply limit for chunked processing
    institutions = institutions.slice(0, limit);

    if (institutions.length === 0) {
      return new Response(
        JSON.stringify({ 
          tier,
          maxPriority,
          startAfter,
          limit,
          total_in_tier: totalInTier,
          processed_this_run: 0,
          hasMore: false,
          message: 'No more institutions to process after startAfter position'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${institutions.length} of ${totalInTier} ${tier} institutions (startAfter=${startAfter || 'beginning'})`);

    const results: BatchScanResult[] = [];
    let totalSucceeded = 0;
    let totalFailed = 0;
    let stoppedEarly = false;

    // Process institutions with controlled concurrency
    for (let i = 0; i < institutions.length; i += concurrency) {
      // Early-stop check: exit cleanly before edge timeout
      const elapsed = Date.now() - startedAt;
      if (elapsed > maxRuntimeMs) {
        console.log(`Stopping early at ${elapsed}ms to avoid edge timeout (processed ${results.length} institutions)`);
        stoppedEarly = true;
        // Trim institutions to only those processed
        institutions = institutions.slice(0, i);
        break;
      }
      
      const batch = institutions.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (institution: string) => {
        const result: BatchScanResult = {
          institution,
          status: 'failed',
          templates_scanned: 0,
          succeeded: 0,
          failed: 0,
        };

        try {
          console.log(`Scanning: ${institution}`);
          
          const scanResponse = await fetch(`${supabaseUrl}/functions/v1/transfer-scraper-auto-scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey, // Required for Edge Function auth
            },
            body: JSON.stringify({
              institution,
              maxPriority,
            }),
          });

          if (!scanResponse.ok) {
            const errorText = await scanResponse.text();
            result.error = `Scan failed: ${errorText}`;
            return result;
          }

          const scanData = await scanResponse.json();
          result.status = 'success';
          result.templates_scanned = typeof scanData?.total === 'number' ? scanData.total : 0;
          result.succeeded = typeof scanData?.succeeded === 'number' ? scanData.succeeded : 0;
          result.failed = typeof scanData?.failed === 'number' ? scanData.failed : 0;
          
          console.log(`Completed: ${institution} - ${result.succeeded}/${result.templates_scanned} succeeded`);
          
        } catch (e) {
          result.error = e instanceof Error ? e.message : 'Unknown error';
          console.error(`Error scanning ${institution}:`, result.error);
        }

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      batchResults.forEach(r => {
        if (r.status === 'success') totalSucceeded += r.succeeded;
        totalFailed += r.failed;
      });

      // Delay between batches
      if (i + concurrency < institutions.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Determine if there are more institutions to process
    const lastProcessed = institutions[institutions.length - 1] ?? null;
    const allInstitutions: string[] = institutionsData.map((r: { code: string }) => r.code);
    const lastIdx = lastProcessed ? allInstitutions.indexOf(lastProcessed) : -1;
    const hasMore = lastIdx >= 0 && lastIdx < allInstitutions.length - 1;

    const summary = {
      tier,
      maxPriority,
      // Resume support
      startAfter: startAfter ?? null,
      lastProcessed,
      hasMore: hasMore || stoppedEarly, // If stopped early, there's definitely more
      nextStartAfter: (hasMore || stoppedEarly) ? lastProcessed : null,
      stoppedEarly,
      elapsedMs: Date.now() - startedAt,
      total_in_tier: totalInTier,
      processed_this_run: institutions.length,
      // Batch stats
      institutions_attempted: institutions.length,
      institutions_completed: results.length,
      successful_institutions: results.filter(r => r.status === 'success').length,
      failed_institutions: results.filter(r => r.status === 'failed').length,
      skipped_institutions: results.filter(r => r.status === 'skipped').length,
      total_templates_succeeded: totalSucceeded,
      total_templates_failed: totalFailed,
      results,
    };

    console.log(`Batch scan complete: ${summary.successful_institutions}/${summary.processed_this_run} institutions succeeded, hasMore=${hasMore}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch scan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
