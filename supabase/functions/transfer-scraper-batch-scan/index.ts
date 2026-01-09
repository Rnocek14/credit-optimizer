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
    const maxPriority = body?.maxPriority ?? 2; // Default to priority 1-2 only
    const concurrency = Math.min(body?.concurrency ?? 1, 3); // Max 3 concurrent
    const delayMs = body?.delayMs ?? 500; // Delay between institutions

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    console.log(`Batch scan starting: tier=${tier}, maxPriority=${maxPriority}, concurrency=${concurrency}`);

    // Get Tier-A institution codes from scrape_url_templates
    const institutionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/scrape_url_templates?select=institution_code&order=institution_code.asc`,
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
    const institutions = [...new Set(institutionsData.map((r: { institution_code: string }) => r.institution_code))];

    console.log(`Found ${institutions.length} institutions to scan`);

    const results: BatchScanResult[] = [];
    let totalSucceeded = 0;
    let totalFailed = 0;

    // Process institutions with controlled concurrency
    for (let i = 0; i < institutions.length; i += concurrency) {
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
          result.templates_scanned = scanData.total || 0;
          result.succeeded = scanData.succeeded || 0;
          result.failed = scanData.failed || 0;
          
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

    const summary = {
      tier,
      maxPriority,
      total_institutions: institutions.length,
      successful_institutions: results.filter(r => r.status === 'success').length,
      total_templates_succeeded: totalSucceeded,
      total_templates_failed: totalFailed,
      results,
    };

    console.log(`Batch scan complete: ${summary.successful_institutions}/${summary.total_institutions} institutions succeeded`);

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
