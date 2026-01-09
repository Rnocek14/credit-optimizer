const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const institution = body?.institution;

    if (!institution) {
      return new Response(
        JSON.stringify({ error: 'institution is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    console.log(`Auto-scan starting for: ${institution}`);

    // Load URL templates
    const templatesResponse = await fetch(
      `${supabaseUrl}/rest/v1/scrape_url_templates?institution_code=eq.${institution}&order=priority.asc`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!templatesResponse.ok) {
      const errorText = await templatesResponse.text();
      console.error('Templates query error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to load templates', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templates = await templatesResponse.json();

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No URL templates found for institution',
          institution,
          hint: 'Run the run-migrations function first to seed URL templates'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${templates.length} templates for ${institution}`);

    const results: Array<{
      url: string;
      page_type: string;
      status: string;
      scrape_job_id: string | null;
      confidence_score: number | null;
      action: string | null;
      error: string | null;
    }> = [];
    let succeeded = 0;
    let failed = 0;

    // Process each URL sequentially
    for (const template of templates) {
      const result = {
        url: template.url,
        page_type: template.page_type,
        status: 'success',
        scrape_job_id: null as string | null,
        confidence_score: null as number | null,
        action: null as string | null,
        error: null as string | null,
      };

      try {
        console.log(`Processing: ${template.url}`);

        // Step 1: Call crawl function
        const crawlResponse = await fetch(`${supabaseUrl}/functions/v1/transfer-scraper-crawl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            url: template.url,
            institution: institution,
            job_type: 'policy',
            priority: template.priority || 5,
          }),
        });

        if (!crawlResponse.ok) {
          const crawlError = await crawlResponse.text();
          throw new Error(`Crawl failed: ${crawlError}`);
        }

        const crawlData = await crawlResponse.json();
        result.scrape_job_id = crawlData.scrape_job_id;
        console.log(`Crawled: ${template.url} -> job ${crawlData.scrape_job_id}`);

        // Step 2: Call extract function
        const extractResponse = await fetch(`${supabaseUrl}/functions/v1/transfer-scraper-extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            scrape_job_id: crawlData.scrape_job_id,
          }),
        });

        if (!extractResponse.ok) {
          const extractError = await extractResponse.text();
          result.status = 'extract_failed';
          result.error = `Extract failed: ${extractError}`;
          failed++;
          results.push(result);
          continue;
        }

        const extractData = await extractResponse.json();
        result.confidence_score = extractData.total_score;
        result.action = extractData.action;
        console.log(`Extracted: ${template.url} -> score ${extractData.total_score}`);

        // Step 3: Call validate function (only if not held)
        if (extractData.action !== 'hold') {
          const validateResponse = await fetch(`${supabaseUrl}/functions/v1/transfer-scraper-validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              scrape_job_id: crawlData.scrape_job_id,
            }),
          });

          if (!validateResponse.ok) {
            const validateError = await validateResponse.text();
            result.status = 'validate_failed';
            result.error = `Validate failed: ${validateError}`;
            failed++;
            results.push(result);
            continue;
          }

          const validateData = await validateResponse.json();
          result.action = validateData.action_taken;
          console.log(`Validated: ${template.url} -> ${validateData.action_taken}`);
        }

        succeeded++;
        results.push(result);

        // Small delay between URLs
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`Error processing ${template.url}:`, errorMsg);
        result.status = 'crawl_failed';
        result.error = errorMsg;
        failed++;
        results.push(result);
      }
    }

    const scanResult = {
      institution,
      total: templates.length,
      succeeded,
      failed,
      results,
    };

    console.log(`Auto-scan complete: ${succeeded}/${templates.length} succeeded`);

    return new Response(
      JSON.stringify(scanResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-scan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
