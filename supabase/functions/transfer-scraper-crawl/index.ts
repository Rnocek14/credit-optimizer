import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CrawlRequest {
  scrape_job_id?: string;
  url: string;
  institution: string;
  job_type: 'policy' | 'provider' | 'degree' | 'articulation';
  source_type?: 'catalog' | 'policy' | 'degree' | 'partner' | 'faq' | 'marketing';
  priority?: number;
}

function detectSourceType(url: string): 'catalog' | 'policy' | 'degree' | 'partner' | 'faq' | 'marketing' {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('smartcatalog') || urlLower.includes('catalog')) return 'catalog';
  if (urlLower.includes('policy') || urlLower.includes('transfer-credit') || urlLower.includes('admissions')) return 'policy';
  if (urlLower.includes('program') || urlLower.includes('degree') || urlLower.includes('major')) return 'degree';
  if (urlLower.includes('partner') || urlLower.includes('articulation')) return 'partner';
  if (urlLower.includes('faq') || urlLower.includes('help') || urlLower.includes('questions')) return 'faq';
  return 'marketing';
}

async function scrapeWithFirecrawl(url: string): Promise<{ markdown: string; html: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  console.log(`Calling Firecrawl for: ${url}`);

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 2000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Firecrawl error:', data);
    throw new Error(data.error || `Firecrawl failed: ${response.status}`);
  }

  const markdown = data.data?.markdown || data.markdown || '';
  const html = data.data?.html || data.html || '';

  console.log(`Firecrawl success: ${markdown.length} chars markdown, ${html.length} chars html`);

  return { markdown, html };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const body: CrawlRequest = await req.json();
    const { 
      scrape_job_id: providedJobId,
      url, 
      institution, 
      job_type, 
      source_type: providedSourceType,
      priority = 5,
    } = body;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceType = providedSourceType || detectSourceType(url);
    let scrapeJobId: string;

    if (providedJobId) {
      const { data: existing, error: existErr } = await supabase
        .from('scrape_jobs')
        .select('id, url')
        .eq('id', providedJobId)
        .maybeSingle();

      if (existErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to verify job', details: existErr }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'scrape_job_id not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updErr } = await supabase
        .from('scrape_jobs')
        .update({
          url,
          institution,
          job_type,
          source_type: sourceType,
          scrape_method: 'firecrawl',
          status: 'processing',
          priority,
          last_attempt_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', providedJobId);

      if (updErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to update scrape job', details: updErr }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      scrapeJobId = providedJobId;
    } else {
      const { data: job, error: jobError } = await supabase
        .from('scrape_jobs')
        .insert({
          url,
          institution,
          job_type,
          source_type: sourceType,
          scrape_method: 'firecrawl',
          status: 'processing',
          priority,
        })
        .select('id')
        .single();

      if (jobError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create scrape job', details: jobError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      scrapeJobId = job.id;
    }

    try {
      const { markdown, html } = await scrapeWithFirecrawl(url);

      if (markdown.length < 50) {
        throw new Error(`Extracted text too short (${markdown.length} chars). Page may be blocked.`);
      }

      const { data: existingContent } = await supabase
        .from('scraped_content')
        .select('id')
        .eq('scrape_job_id', scrapeJobId)
        .maybeSingle();

      if (existingContent?.id) {
        const { error: updateContentError } = await supabase
          .from('scraped_content')
          .update({
            url,
            raw_html: html.length > 500000 ? html.slice(0, 500000) : html,
            extracted_text: markdown,
            source_type: sourceType,
            scraped_at: new Date().toISOString(),
            ai_extracted_data: null,
            confidence_breakdown: null,
            total_confidence_score: null,
            extracted_at: null,
            extraction_model: null,
            extraction_prompt_version: null,
          })
          .eq('id', existingContent.id);

        if (updateContentError) {
          throw new Error(`Failed to update content: ${updateContentError.message}`);
        }
      } else {
        const { error: contentError } = await supabase
          .from('scraped_content')
          .insert({
            scrape_job_id: scrapeJobId,
            url,
            raw_html: html.length > 500000 ? html.slice(0, 500000) : html,
            extracted_text: markdown,
            source_type: sourceType,
          });

        if (contentError) {
          throw new Error(`Failed to store content: ${contentError.message}`);
        }
      }

      await supabase
        .from('scrape_jobs')
        .update({ 
          status: 'completed',
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', scrapeJobId);

      return new Response(
        JSON.stringify({
          success: true,
          scrape_job_id: scrapeJobId,
          url,
          content_length: html.length,
          extracted_text_length: markdown.length,
          source_type: sourceType,
          message: `Successfully crawled ${markdown.length} chars from ${url}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      
      await supabase
        .from('scrape_jobs')
        .update({ 
          status: 'failed',
          error_message: errorMessage,
          last_attempt_at: new Date().toISOString(),
          retry_count: 1,
        })
        .eq('id', scrapeJobId);

      return new Response(
        JSON.stringify({ 
          success: false,
          scrape_job_id: scrapeJobId,
          error: errorMessage,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Crawl error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
