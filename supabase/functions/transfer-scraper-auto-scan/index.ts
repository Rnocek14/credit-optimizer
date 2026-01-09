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
    const maxPriority = body?.maxPriority ?? null; // Optional priority filter

    if (!institution) {
      return new Response(
        JSON.stringify({ error: 'institution is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    console.log(`Auto-scan starting for: ${institution}${maxPriority ? ` (priority <= ${maxPriority})` : ''}`);

    // Load URL templates with optional priority filter
    let templateUrl = `${supabaseUrl}/rest/v1/scrape_url_templates?institution_code=eq.${institution}&order=priority.asc`;
    if (maxPriority !== null) {
      templateUrl += `&priority=lte.${maxPriority}`;
    }

    const templatesResponse = await fetch(templateUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

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
      // Guardrail A: Log skip reason to policy_scan_findings for auditability
      const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      await fetch(`${supabaseUrl}/rest/v1/policy_scan_findings`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          institution,
          academic_year: currentYear,
          status: 'skipped',
          reason: 'no_templates',
          confidence_score: 0,
          requires_verification: false,
          urls_scanned: [],
          details: {
            skip_reason: 'no_templates',
            max_priority_filter: maxPriority,
            hint: 'Add URL templates for this institution',
          },
        }),
      });

      return new Response(
        JSON.stringify({ 
          error: 'No URL templates found for institution',
          institution,
          maxPriority,
          status: 'skipped',
          skip_reason: 'no_templates',
          hint: 'Run the run-migrations function first to seed URL templates'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${templates.length} templates for ${institution}`);

    // URL diagnostic classification helper
    function classifyContent(text: string, length: number): 'ok' | 'too_short' | 'js_junk' | 'error_page' {
      if (length < 200) return 'too_short';
      
      // Check for error pages
      const errorPatterns = ['404', 'Page Not Found', 'Access Denied', 'Request blocked', 'Error404'];
      if (errorPatterns.some(p => text.includes(p))) return 'error_page';
      
      // Check for JS junk (VWO, A/B testing scripts, etc.)
      const jsPatterns = ['VWO.', 'vwo_$', 'function(', 'catch(e)', '{}catch', 'var _vwo'];
      const jsMatchCount = jsPatterns.filter(p => text.includes(p)).length;
      if (jsMatchCount >= 2) return 'js_junk';
      
      return 'ok';
    }

    const results: Array<{
      url: string;
      page_type: string;
      status: string;
      scrape_job_id: string | null;
      confidence_score: number | null;
      action: string | null;
      error: string | null;
      text_length: number | null;
      content_class: 'ok' | 'too_short' | 'js_junk' | 'error_page' | null;
    }> = [];
    let succeeded = 0;
    let failed = 0;

    // Process each URL sequentially
    for (const template of templates) {
      const result: {
        url: string;
        page_type: string;
        status: string;
        scrape_job_id: string | null;
        confidence_score: number | null;
        action: string | null;
        error: string | null;
        text_length: number | null;
        content_class: 'ok' | 'too_short' | 'js_junk' | 'error_page' | null;
      } = {
        url: template.url,
        page_type: template.page_type,
        status: 'success',
        scrape_job_id: null,
        confidence_score: null,
        action: null,
        error: null,
        text_length: null,
        content_class: null,
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
        result.text_length = crawlData.extracted_text_length ?? null;
        console.log(`Crawled: ${template.url} -> job ${crawlData.scrape_job_id}, ${result.text_length} chars`);

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

    // Fetch content samples and classify each result
    for (const r of results) {
      if (r.scrape_job_id) {
        try {
          // Fetch the extracted text sample from scraped_content
          const sampleResponse = await fetch(
            `${supabaseUrl}/rest/v1/scraped_content?scrape_job_id=eq.${r.scrape_job_id}&select=extracted_text`,
            {
              headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
            }
          );
          
          if (sampleResponse.ok) {
            const sampleData = await sampleResponse.json();
            const extractedText = sampleData?.[0]?.extracted_text || '';
            const sample = extractedText.slice(0, 500);
            
            // Classify with actual content
            r.content_class = classifyContent(sample, r.text_length || 0);
            
            // Store sample in result for diagnostics (will be added to urlDiagnostics)
            (r as any).sample = sample.slice(0, 300);
          } else {
            // Fallback to length-only classification
            r.content_class = (r.text_length || 0) < 200 ? 'too_short' : 'ok';
          }
        } catch {
          // Fallback classification
          r.content_class = (r.text_length || 0) < 200 ? 'too_short' : 'ok';
        }
      }
    }

    // Build URL diagnostics for merge (with samples)
    const urlDiagnostics = results.map(r => ({
      url: r.url,
      page_type: r.page_type,
      text_length: r.text_length,
      content_class: r.content_class,
      status: r.status,
      scrape_job_id: r.scrape_job_id,
      sample: (r as any).sample || null,
    }));

    // Step 4: Call merge function to aggregate extractions (>= 1 job)
    const successfulJobIds = results
      .filter(r => r.status === 'success' && r.scrape_job_id)
      .map(r => r.scrape_job_id as string);

    let mergeResult = null;
    if (successfulJobIds.length >= 1) {
      console.log(`Merging ${successfulJobIds.length} successful extraction(s)...`);
      try {
        const mergeResponse = await fetch(`${supabaseUrl}/functions/v1/transfer-scraper-merge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            institution,
            scrape_job_ids: successfulJobIds,
            url_diagnostics: urlDiagnostics,
          }),
        });

        if (mergeResponse.ok) {
          mergeResult = await mergeResponse.json();
          console.log(`Merge complete: score=${mergeResult.total_score}, action=${mergeResult.action}`);
        }
      } catch (e) {
        console.error('Merge failed:', e);
      }
    }

    const scanResult = {
      institution,
      total: templates.length,
      succeeded,
      failed,
      results,
      merge: mergeResult,
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
