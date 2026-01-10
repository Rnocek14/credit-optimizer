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

    // URL diagnostic classification helper - tightened to avoid false error_page
    function classifyContent(text: string, length: number): 'ok' | 'too_short' | 'js_junk' | 'error_page' {
      if (length < 200) return 'too_short';
      
      const t = text.toLowerCase();
      
      // Check for error pages - require STRONG evidence (not just "404" substring)
      // Must have 404 AND explicit "not found" language, or explicit denial phrases
      const is404Error = t.includes('404') && (
        t.includes('page not found') || 
        t.includes('not found') ||
        t.includes('error 404') ||
        t.includes('404 error')
      );
      
      const isAccessDenied = 
        t.includes('access denied') ||
        t.includes('request blocked') ||
        t.includes('you have been blocked') ||
        t.includes('permission denied') ||
        (t.includes('403') && t.includes('forbidden'));
      
      // Only classify as error_page if we have strong evidence
      if (is404Error || isAccessDenied) return 'error_page';
      
      // Check for JS junk (VWO, A/B testing scripts, etc.)
      const jsPatterns = ['VWO.', 'vwo_$', 'function(', 'catch(e)', '{}catch', 'var _vwo'];
      const jsMatchCount = jsPatterns.filter(p => text.includes(p)).length;
      if (jsMatchCount >= 2) return 'js_junk';
      
      return 'ok';
    }

    // Policy keyword detection - count how many policy-relevant terms appear
    const POLICY_KEYWORDS = [
      'transfer', 'residency', 'maximum', 'minimum', 'credits', 
      'must complete', 'in residence', 'institutional credit',
      'credit limit', 'total credits', 'semester hours', 'credit hours',
      'may be transferred', 'accepted for transfer', 'credit policy'
    ];
    
    // High-signal phrases that strongly indicate policy content
    const HIGH_SIGNAL_PHRASES = [
      'maximum number of credits', 'may be transferred', 'must complete at',
      'residency requirement', 'in residence', 'institutional credits',
      'transfer credit limit', 'credits accepted', 'semester hours required',
      'up to', 'no more than', 'maximum of', 'may transfer up to',
      'must complete a minimum of', 'minimum number of'
    ];
    
    function countPolicyKeywords(text: string): number {
      const t = text.toLowerCase();
      const baseHits = POLICY_KEYWORDS.filter(kw => t.includes(kw.toLowerCase())).length;
      const highSignalHits = HIGH_SIGNAL_PHRASES.filter(phrase => t.includes(phrase.toLowerCase())).length;
      
      // Add numeric pattern detection: "XX credits" or "XX semester hours"
      const numericCreditMatches = (t.match(/\b\d{1,3}\b\s*(credit|credits|semester hours|credit hours)\b/g) || []).length;
      
      // Base + high-signal (2x weight) + numeric patterns (capped at 10)
      return baseHits + (highSignalHits * 2) + Math.min(10, numericCreditMatches);
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
            
            // Use larger slice for classification (first 8k chars) to avoid misclassifying
            // based on nav boilerplate or late-appearing JS junk
            const headContent = extractedText.slice(0, 8000);
            r.content_class = classifyContent(headContent, r.text_length || 0);
            
            // Store shorter sample for diagnostics display
            (r as any).sample = headContent.slice(0, 300);
            
            // Count policy keywords on head content for relevance scoring
            (r as any).keyword_hits = countPolicyKeywords(headContent);
          } else {
            // Fallback to length-only classification
            r.content_class = (r.text_length || 0) < 200 ? 'too_short' : 'ok';
            (r as any).keyword_hits = 0;
          }
        } catch {
          // Fallback classification
          r.content_class = (r.text_length || 0) < 200 ? 'too_short' : 'ok';
          (r as any).keyword_hits = 0;
        }
      }
    }

    // Find best policy URL (highest keyword hits among 'ok' content with keyword_hits > 0)
    const okResultsWithKeywords = results.filter(
      r => r.content_class === 'ok' && ((r as any).keyword_hits ?? 0) > 0
    );
    
    let bestPolicyUrl: string | null = null;
    if (okResultsWithKeywords.length > 0) {
      // Sort by keyword_hits descending and pick the best
      const sorted = [...okResultsWithKeywords].sort(
        (a, b) => ((b as any).keyword_hits ?? 0) - ((a as any).keyword_hits ?? 0)
      );
      bestPolicyUrl = sorted[0].url;
    }

    // Build URL diagnostics for merge (with samples and keyword hits)
    const urlDiagnostics = results.map(r => ({
      url: r.url,
      page_type: r.page_type,
      text_length: r.text_length,
      content_class: r.content_class,
      keyword_hits: (r as any).keyword_hits || 0,
      status: r.status,
      scrape_job_id: r.scrape_job_id,
      sample: (r as any).sample || null,
    }));
    
    // Find best policy result details
    const bestResult = okResultsWithKeywords.length > 0
      ? [...okResultsWithKeywords].sort((a, b) => ((b as any).keyword_hits ?? 0) - ((a as any).keyword_hits ?? 0))[0]
      : null;

    // Add diagnostic summary with best policy URL and enhanced metrics
    const diagnosticSummary = {
      total_urls: results.length,
      ok_count: results.filter(r => r.content_class === 'ok').length,
      too_short_count: results.filter(r => r.content_class === 'too_short').length,
      js_junk_count: results.filter(r => r.content_class === 'js_junk').length,
      error_page_count: results.filter(r => r.content_class === 'error_page').length,
      max_text_length: Math.max(0, ...results.map(r => r.text_length || 0)),
      min_text_length: Math.min(...results.filter(r => (r.text_length || 0) > 0).map(r => r.text_length || 0)) || 0,
      max_keyword_hits: Math.max(0, ...results.map(r => (r as any).keyword_hits || 0)),
      best_policy_url: bestPolicyUrl,
      best_policy_keyword_hits: bestResult ? ((bestResult as any).keyword_hits ?? 0) : 0,
      best_policy_text_length: bestResult ? (bestResult.text_length ?? 0) : 0,
    };

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
            diagnostic_summary: diagnosticSummary,
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
