// =============================================================================
// TRANSFER-SCRAPER-CRAWL - URL Fetching & Text Extraction
// =============================================================================
// This Edge Function fetches HTML from university transfer pages and stores
// the raw content for later AI extraction.
//
// Key behaviors:
// - Accepts URL + institution + job_type
// - Checks robots.txt compliance (advisory)
// - Fetches with browser-like headers
// - Extracts clean text from HTML
// - Stores in scraped_content table
// - Respects rate limiting (caller's responsibility)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------

interface CrawlRequest {
  url: string;
  institution: string;
  job_type: 'policy' | 'provider' | 'degree' | 'articulation';
  source_type?: 'catalog' | 'policy' | 'degree' | 'partner' | 'faq' | 'marketing';
  priority?: number;
  skip_robots_check?: boolean;
}

interface CrawlResult {
  success: boolean;
  scrape_job_id: string;
  url: string;
  content_length: number;
  extracted_text_length: number;
  source_type: string;
  message: string;
}

// -----------------------------------------------------------------------------
// ROBOTS.TXT CHECKING (Advisory)
// -----------------------------------------------------------------------------

async function checkRobotsTxt(url: string): Promise<{ allowed: boolean; checked_at: string }> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'LifePath-TransferBot/1.0 (Educational Research)' },
    });
    
    if (!response.ok) {
      // No robots.txt = allowed
      return { allowed: true, checked_at: new Date().toISOString() };
    }
    
    const text = await response.text();
    const path = urlObj.pathname;
    
    // Simple check - look for Disallow rules that match our path
    const lines = text.split('\n');
    let inUserAgentBlock = false;
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.replace('user-agent:', '').trim();
        inUserAgentBlock = agent === '*' || agent.includes('bot');
      }
      
      if (inUserAgentBlock && trimmed.startsWith('disallow:')) {
        const disallowed = trimmed.replace('disallow:', '').trim();
        if (disallowed && path.startsWith(disallowed)) {
          return { allowed: false, checked_at: new Date().toISOString() };
        }
      }
    }
    
    return { allowed: true, checked_at: new Date().toISOString() };
  } catch (error) {
    console.warn('Robots.txt check failed:', error);
    return { allowed: true, checked_at: new Date().toISOString() };
  }
}

// -----------------------------------------------------------------------------
// SOURCE TYPE DETECTION
// -----------------------------------------------------------------------------

function detectSourceType(url: string): 'catalog' | 'policy' | 'degree' | 'partner' | 'faq' | 'marketing' {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('smartcatalog') || urlLower.includes('catalog')) return 'catalog';
  if (urlLower.includes('policy') || urlLower.includes('transfer-credit') || urlLower.includes('admissions')) return 'policy';
  if (urlLower.includes('program') || urlLower.includes('degree') || urlLower.includes('major')) return 'degree';
  if (urlLower.includes('partner') || urlLower.includes('articulation')) return 'partner';
  if (urlLower.includes('faq') || urlLower.includes('help') || urlLower.includes('questions')) return 'faq';
  
  return 'marketing'; // Default to lowest authority
}

// -----------------------------------------------------------------------------
// HTML TEXT EXTRACTION
// -----------------------------------------------------------------------------

function extractTextFromHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) return '';
    
    // Remove script, style, nav, footer, header elements
    const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'noscript'];
    for (const selector of removeSelectors) {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el: any) => el.parentNode?.removeChild(el));
    }
    
    // Get main content if available
    const main = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('.content') || doc.body;
    if (!main) return '';
    
    // Extract text
    let text = main.textContent || '';
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Remove very short lines (likely navigation artifacts)
    const lines = text.split('\n').filter(line => line.trim().length > 20);
    
    return lines.join('\n');
  } catch (error) {
    console.error('HTML parsing error:', error);
    return '';
  }
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
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
      url, 
      institution, 
      job_type, 
      source_type: providedSourceType,
      priority = 5,
      skip_robots_check = false 
    } = body;

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect source type
    const sourceType = providedSourceType || detectSourceType(url);

    // Check robots.txt (advisory, don't block)
    let robotsCheck = { allowed: true, checked_at: new Date().toISOString() };
    if (!skip_robots_check) {
      robotsCheck = await checkRobotsTxt(url);
      if (!robotsCheck.allowed) {
        console.warn(`Robots.txt disallows ${url}, proceeding anyway (educational use)`);
      }
    }

    // Create scrape job
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        url,
        institution,
        job_type,
        source_type: sourceType,
        allowed_scrape: robotsCheck.allowed,
        scrape_method: 'html',
        robots_checked_at: robotsCheck.checked_at,
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

    const scrapeJobId = job.id;

    try {
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const extractedText = extractTextFromHtml(html);

      if (extractedText.length < 100) {
        throw new Error(`Extracted text too short (${extractedText.length} chars). Possible scraping block.`);
      }

      // Store scraped content
      const { error: contentError } = await supabase
        .from('scraped_content')
        .insert({
          scrape_job_id: scrapeJobId,
          url,
          raw_html: html.length > 500000 ? html.slice(0, 500000) : html, // Limit storage
          extracted_text: extractedText,
          source_type: sourceType,
        });

      if (contentError) {
        throw new Error(`Failed to store content: ${contentError.message}`);
      }

      // Update job status to completed
      await supabase
        .from('scrape_jobs')
        .update({ 
          status: 'completed',
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', scrapeJobId);

      const result: CrawlResult = {
        success: true,
        scrape_job_id: scrapeJobId,
        url,
        content_length: html.length,
        extracted_text_length: extractedText.length,
        source_type: sourceType,
        message: `Successfully crawled and extracted ${extractedText.length} chars from ${url}`,
      };

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      // Update job status to failed
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      
      await supabase
        .from('scrape_jobs')
        .update({ 
          status: 'failed',
          error_message: errorMessage,
          last_attempt_at: new Date().toISOString(),
          retry_count: 1, // Will be incremented on retry
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
