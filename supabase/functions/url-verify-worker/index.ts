// URL Verification Worker - Firecrawl-based link integrity system
// Implements 3-tier verification with confidence gating
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Confidence thresholds - stricter than typical to ensure 100% credibility
const AUTO_FIX_THRESHOLD = 0.95; // Only auto-fix when very high confidence
const REVIEW_THRESHOLD = 0.70;   // Queue for review if moderate confidence
const MIN_TITLE_SIMILARITY = 0.85; // Title must be highly similar

// Provider domain mappings for validation
const PROVIDER_DOMAINS: Record<string, string[]> = {
  'CLEP': ['clep.collegeboard.org', 'collegeboard.org'],
  'SOPHIA': ['sophia.org', 'www.sophia.org'],
  'STUDY_COM': ['study.com', 'www.study.com'],
  'DSST': ['getcollegecredit.com', 'dantes.doded.mil'],
};

interface VerifyRequest {
  source_code?: string;  // Verify all for this provider
  all?: boolean;         // Verify all unknown URLs
  id?: string;           // Verify single record
  recheck_valid?: boolean; // Re-verify already valid URLs older than X days
  recheck_days?: number;   // Days threshold for recheck (default 30)
}

interface AltCredit {
  id: string;
  source_code: string;
  identifier: string;
  title: string;
  provider_url: string | null;
  url_status: string | null;
  url_checked_at: string | null;
}

interface SearchCandidate {
  url: string;
  title: string;
  description: string;
  confidence: number;
  reasons: string[];
}

interface VerifyResult {
  id: string;
  source_code: string;
  identifier: string;
  title: string;
  original_url: string | null;
  action: 'valid' | 'auto_fixed' | 'needs_review' | 'invalid';
  new_url?: string;
  confidence?: number;
  suggested_urls?: SearchCandidate[];
  reason: string;
}

// Levenshtein distance for title similarity
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const a = title1.toLowerCase().trim();
  const b = title2.toLowerCase().trim();
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function isValidProviderDomain(url: string, sourceCode: string): boolean {
  const domain = extractDomain(url);
  const validDomains = PROVIDER_DOMAINS[sourceCode] || [];
  return validDomains.some(d => domain.includes(d.replace('www.', '')));
}

function isGenericListingPage(url: string, content?: string): boolean {
  // Check URL patterns that indicate listing/search pages
  const genericPatterns = [
    '/search',
    '/browse',
    '/catalog',
    '/courses$', // Just /courses without specific course
    '/all-courses',
    '/online-courses$',
    '?q=',
    '?search=',
  ];
  
  const lowerUrl = url.toLowerCase();
  for (const pattern of genericPatterns) {
    if (pattern.endsWith('$')) {
      if (lowerUrl.endsWith(pattern.slice(0, -1))) return true;
    } else if (lowerUrl.includes(pattern)) {
      return true;
    }
  }
  
  // If we have content, check for listing page indicators
  if (content) {
    const listingIndicators = [
      'showing results for',
      'search results',
      'browse all courses',
      'filter by',
      'sort by',
    ];
    const lowerContent = content.toLowerCase();
    for (const indicator of listingIndicators) {
      if (lowerContent.includes(indicator)) return true;
    }
  }
  
  return false;
}

async function firecrawlScrape(url: string, apiKey: string): Promise<{ success: boolean; statusCode?: number; markdown?: string; title?: string; error?: string }> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        statusCode: response.status,
        error: data.error || `HTTP ${response.status}` 
      };
    }
    
    // Check for 404 in response metadata
    const statusCode = data.data?.metadata?.statusCode || data.metadata?.statusCode || 200;
    
    if (statusCode === 404 || statusCode >= 400) {
      return { success: false, statusCode, error: `Page returned ${statusCode}` };
    }
    
    return {
      success: true,
      statusCode: 200,
      markdown: data.data?.markdown || data.markdown,
      title: data.data?.metadata?.title || data.metadata?.title,
    };
  } catch (error) {
    console.error('[url-verify-worker] Scrape error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function firecrawlSearch(query: string, apiKey: string, limit = 5): Promise<{ success: boolean; results?: Array<{ url: string; title: string; description: string }>; error?: string }> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }
    
    return {
      success: true,
      results: data.data || [],
    };
  } catch (error) {
    console.error('[url-verify-worker] Search error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function scoreSearchCandidate(
  result: { url: string; title: string; description: string },
  courseTitle: string,
  sourceCode: string
): SearchCandidate {
  const reasons: string[] = [];
  let score = 0;
  
  // 1. Domain must match provider (hard requirement)
  if (!isValidProviderDomain(result.url, sourceCode)) {
    return { ...result, confidence: 0, reasons: ['Domain does not match provider'] };
  }
  reasons.push('Domain matches provider');
  score += 0.3;
  
  // 2. Check if it's a generic listing page (disqualifying)
  if (isGenericListingPage(result.url)) {
    return { ...result, confidence: 0, reasons: ['URL appears to be a generic listing page'] };
  }
  reasons.push('Not a listing page');
  score += 0.1;
  
  // 3. Title similarity (critical)
  const titleSim = calculateTitleSimilarity(courseTitle, result.title);
  if (titleSim >= 0.95) {
    reasons.push(`Title exact/near-exact match (${(titleSim * 100).toFixed(0)}%)`);
    score += 0.4;
  } else if (titleSim >= MIN_TITLE_SIMILARITY) {
    reasons.push(`Title similar (${(titleSim * 100).toFixed(0)}%)`);
    score += 0.25;
  } else {
    reasons.push(`Title similarity too low (${(titleSim * 100).toFixed(0)}%)`);
    // Don't add score, but don't disqualify
  }
  
  // 4. Description contains course title
  const descLower = (result.description || '').toLowerCase();
  const titleLower = courseTitle.toLowerCase();
  if (descLower.includes(titleLower)) {
    reasons.push('Description contains course title');
    score += 0.2;
  }
  
  // 5. URL slug contains key words from title
  const urlLower = result.url.toLowerCase();
  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
  const matchingWords = titleWords.filter(w => urlLower.includes(w));
  if (matchingWords.length >= 2 || matchingWords.length === titleWords.length) {
    reasons.push(`URL contains title keywords: ${matchingWords.join(', ')}`);
    score += 0.1;
  }
  
  return {
    url: result.url,
    title: result.title,
    description: result.description,
    confidence: Math.min(score, 1.0),
    reasons,
  };
}

async function verifyAndFixUrl(
  record: AltCredit,
  apiKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<VerifyResult> {
  const { id, source_code, identifier, title, provider_url } = record;
  
  console.log(`[url-verify-worker] Verifying: ${source_code}/${identifier} - ${provider_url}`);
  
  // If no URL, mark as invalid
  if (!provider_url) {
    await supabase
      .from('alt_credits')
      .update({
        url_status: 'invalid',
        url_checked_at: new Date().toISOString(),
        url_notes: JSON.stringify({ error: 'No URL provided' }),
      })
      .eq('id', id);
    
    return {
      id, source_code, identifier, title,
      original_url: null,
      action: 'invalid',
      reason: 'No URL provided',
    };
  }
  
  // TIER A: Try to scrape the existing URL
  const scrapeResult = await firecrawlScrape(provider_url, apiKey);
  
  if (scrapeResult.success) {
    // Additional check: verify page content contains course title
    const markdown = scrapeResult.markdown || '';
    const pageTitle = scrapeResult.title || '';
    const titleInContent = markdown.toLowerCase().includes(title.toLowerCase());
    const titleInPageTitle = calculateTitleSimilarity(title, pageTitle) >= 0.7;
    
    if (titleInContent || titleInPageTitle) {
      // URL works and content matches - mark as valid
      await supabase
        .from('alt_credits')
        .update({
          url_status: 'valid',
          url_http_status: 200,
          url_checked_at: new Date().toISOString(),
          url_notes: JSON.stringify({ 
            verification_method: 'scrape_verified',
            page_title: pageTitle,
            content_match: titleInContent,
          }),
        })
        .eq('id', id);
      
      return {
        id, source_code, identifier, title,
        original_url: provider_url,
        action: 'valid',
        confidence: 1.0,
        reason: 'URL verified via scrape with content match',
      };
    } else {
      // URL loads but content doesn't match - suspicious, queue for review
      console.log(`[url-verify-worker] URL loads but content mismatch: ${provider_url}`);
    }
  }
  
  // TIER B: URL failed or content mismatch - search for correct URL
  console.log(`[url-verify-worker] Searching for correct URL for: ${title}`);
  
  const providerDomain = PROVIDER_DOMAINS[source_code]?.[0] || '';
  const searchQuery = `"${title}" site:${providerDomain}`;
  const searchResult = await firecrawlSearch(searchQuery, apiKey, 5);
  
  if (!searchResult.success || !searchResult.results?.length) {
    // No search results - mark as invalid
    await supabase
      .from('alt_credits')
      .update({
        url_status: 'invalid',
        url_http_status: scrapeResult.statusCode || 404,
        url_checked_at: new Date().toISOString(),
        url_notes: JSON.stringify({ 
          error: 'Original URL failed and no alternatives found',
          scrape_error: scrapeResult.error,
        }),
      })
      .eq('id', id);
    
    return {
      id, source_code, identifier, title,
      original_url: provider_url,
      action: 'invalid',
      reason: `Original URL failed (${scrapeResult.error}) and no alternatives found`,
    };
  }
  
  // Score all candidates
  const candidates = searchResult.results
    .map(r => scoreSearchCandidate(r, title, source_code))
    .filter(c => c.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
  
  if (candidates.length === 0) {
    // No valid candidates after filtering
    await supabase
      .from('alt_credits')
      .update({
        url_status: 'invalid',
        url_http_status: 404,
        url_checked_at: new Date().toISOString(),
        url_notes: JSON.stringify({ 
          error: 'No valid candidates found from search',
          raw_results: searchResult.results.length,
        }),
      })
      .eq('id', id);
    
    return {
      id, source_code, identifier, title,
      original_url: provider_url,
      action: 'invalid',
      reason: 'Search found results but none matched provider/title requirements',
    };
  }
  
  const bestCandidate = candidates[0];
  
  // TIER B1: High confidence - auto-fix
  if (bestCandidate.confidence >= AUTO_FIX_THRESHOLD) {
    // Before auto-fixing, verify the new URL actually works
    const verifyNewUrl = await firecrawlScrape(bestCandidate.url, apiKey);
    
    if (verifyNewUrl.success) {
      // Double-check content contains title
      const markdown = verifyNewUrl.markdown || '';
      if (markdown.toLowerCase().includes(title.toLowerCase().split(' ')[0])) {
        await supabase
          .from('alt_credits')
          .update({
            provider_url: bestCandidate.url,
            url_status: 'valid',
            url_http_status: 200,
            url_checked_at: new Date().toISOString(),
            url_notes: JSON.stringify({ 
              verification_method: 'search_auto_fix',
              original_url: provider_url,
              confidence: bestCandidate.confidence,
              reasons: bestCandidate.reasons,
              verified_by: 'worker',
            }),
          })
          .eq('id', id);
        
        return {
          id, source_code, identifier, title,
          original_url: provider_url,
          new_url: bestCandidate.url,
          action: 'auto_fixed',
          confidence: bestCandidate.confidence,
          reason: `Auto-fixed with ${(bestCandidate.confidence * 100).toFixed(0)}% confidence`,
        };
      }
    }
    
    // New URL verification failed - queue for review instead
    bestCandidate.confidence = Math.min(bestCandidate.confidence, REVIEW_THRESHOLD + 0.1);
  }
  
  // TIER B2: Moderate confidence - queue for review
  if (bestCandidate.confidence >= REVIEW_THRESHOLD) {
    await supabase
      .from('alt_credits')
      .update({
        url_status: 'needs_review',
        url_http_status: scrapeResult.statusCode || 404,
        url_checked_at: new Date().toISOString(),
        url_notes: JSON.stringify({ 
          verification_method: 'search_needs_review',
          original_url: provider_url,
          suggested_urls: candidates.slice(0, 3).map(c => ({
            url: c.url,
            title: c.title,
            confidence: c.confidence,
            reasons: c.reasons,
          })),
        }),
      })
      .eq('id', id);
    
    return {
      id, source_code, identifier, title,
      original_url: provider_url,
      action: 'needs_review',
      confidence: bestCandidate.confidence,
      suggested_urls: candidates.slice(0, 3),
      reason: `Queued for review - best match has ${(bestCandidate.confidence * 100).toFixed(0)}% confidence`,
    };
  }
  
  // TIER C: Low confidence - mark as invalid
  await supabase
    .from('alt_credits')
    .update({
      url_status: 'invalid',
      url_http_status: 404,
      url_checked_at: new Date().toISOString(),
      url_notes: JSON.stringify({ 
        error: 'No high-confidence match found',
        best_confidence: bestCandidate.confidence,
        candidates_found: candidates.length,
      }),
    })
    .eq('id', id);
  
  return {
    id, source_code, identifier, title,
    original_url: provider_url,
    action: 'invalid',
    confidence: bestCandidate.confidence,
    reason: `Best candidate only ${(bestCandidate.confidence * 100).toFixed(0)}% confidence - below threshold`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }
    
    const body: VerifyRequest = req.method === 'POST' ? await req.json() : {};
    
    console.log('[url-verify-worker] Starting verification with params:', body);
    
    // Build query based on request parameters
    let query = supabase
      .from('alt_credits')
      .select('id, source_code, identifier, title, provider_url, url_status, url_checked_at');
    
    if (body.id) {
      // Single record verification
      query = query.eq('id', body.id);
    } else if (body.source_code) {
      // Provider-specific verification
      query = query
        .eq('source_code', body.source_code)
        .or('url_status.is.null,url_status.eq.unknown');
    } else if (body.recheck_valid) {
      // Re-verify old valid URLs
      const daysAgo = body.recheck_days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      
      query = query
        .eq('url_status', 'valid')
        .lt('url_checked_at', cutoffDate.toISOString());
    } else if (body.all) {
      // All unknown URLs
      query = query.or('url_status.is.null,url_status.eq.unknown');
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Must specify: id, source_code, all, or recheck_valid' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }
    
    const { data: records, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }
    
    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No records to verify',
          stats: { total: 0, valid: 0, auto_fixed: 0, needs_review: 0, invalid: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    
    console.log(`[url-verify-worker] Found ${records.length} records to verify`);
    
    const results: VerifyResult[] = [];
    const stats = { total: records.length, valid: 0, auto_fixed: 0, needs_review: 0, invalid: 0 };
    
    // Process records sequentially to avoid rate limits
    for (const record of records) {
      const result = await verifyAndFixUrl(record as AltCredit, apiKey, supabase);
      results.push(result);
      stats[result.action]++;
      
      // Small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[url-verify-worker] Verification complete:', stats);
    
    return new Response(
      JSON.stringify({
        success: true,
        stats,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
    
  } catch (err) {
    console.error('[url-verify-worker] Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
