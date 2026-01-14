// URL Verification Worker - Firecrawl-based link integrity system
// Implements 3-tier verification with confidence gating and strict guardrails
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

// Provider domain mappings - canonical search domains (no www)
const PROVIDER_SEARCH_DOMAINS: Record<string, string> = {
  'CLEP': 'clep.collegeboard.org',
  'SOPHIA': 'sophia.org',
  'STUDY_COM': 'study.com',
  'DSST': 'getcollegecredit.com',
};

// Valid domains for each provider (for validation)
const PROVIDER_VALID_DOMAINS: Record<string, string[]> = {
  'CLEP': ['clep.collegeboard.org', 'collegeboard.org'],
  'SOPHIA': ['sophia.org'],
  'STUDY_COM': ['study.com'],
  'DSST': ['getcollegecredit.com', 'dantes.doded.mil'],
};

// Provider-specific URL patterns that indicate a course page (not listing)
const PROVIDER_COURSE_PATTERNS: Record<string, RegExp[]> = {
  'SOPHIA': [
    /\/online-courses\/[^/]+\/[^/]+$/, // /online-courses/category/course-slug
    /\/online-courses\/[^/]+$/,         // /online-courses/course-slug (legacy)
  ],
  'STUDY_COM': [
    /\/academy\/course\/[^/]+\.html$/,  // /academy/course/course-name.html
    /\/academy\/lesson\/[^/]+\.html$/,  // lesson pages
  ],
  'CLEP': [
    /\/clep-exams\/[^/]+$/,             // /clep-exams/exam-name
  ],
};

// Provider-specific deny patterns (definitely not a course page)
const PROVIDER_DENY_PATTERNS: Record<string, RegExp[]> = {
  'SOPHIA': [
    /\/online-courses\/?$/,              // Just the courses listing
    /\/online-courses\/[^/]+\/?$/,       // Category page without course
  ],
  'STUDY_COM': [
    /\/academy\/search/,
    /\/academy\/courses\/?$/,
    /\/academy\/topic\//,
  ],
  'CLEP': [
    /\/clep-exams\/?$/,                  // Just the exams listing
  ],
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

// Normalize text for comparison (lowercase, remove punctuation, collapse whitespace)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim();
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
  const a = normalizeText(title1);
  const b = normalizeText(title2);
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

// Check if normalized full title appears in content
function contentContainsFullTitle(content: string, title: string): boolean {
  const normalizedContent = normalizeText(content);
  const normalizedTitle = normalizeText(title);
  return normalizedContent.includes(normalizedTitle);
}

function extractHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

// FIXED: Proper domain suffix check (not includes)
function isValidProviderDomain(url: string, sourceCode: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return false;
  
  const validDomains = PROVIDER_VALID_DOMAINS[sourceCode] || [];
  
  return validDomains.some(d => {
    const normalizedDomain = d.toLowerCase().replace(/^www\./, '');
    // Must be exact match or proper subdomain
    return hostname === normalizedDomain || hostname.endsWith('.' + normalizedDomain);
  });
}

// Check provider-specific URL patterns
function matchesProviderCoursePattern(url: string, sourceCode: string): boolean {
  const patterns = PROVIDER_COURSE_PATTERNS[sourceCode];
  if (!patterns) return true; // No patterns defined = allow
  return patterns.some(p => p.test(url));
}

function matchesProviderDenyPattern(url: string, sourceCode: string): boolean {
  const patterns = PROVIDER_DENY_PATTERNS[sourceCode];
  if (!patterns) return false;
  return patterns.some(p => p.test(url));
}

function isGenericListingPage(url: string, content?: string): boolean {
  // Check URL patterns that indicate listing/search pages
  const genericPatterns = [
    '/search',
    '/browse',
    '/catalog',
    '?q=',
    '?search=',
    '?query=',
  ];
  
  const lowerUrl = url.toLowerCase();
  for (const pattern of genericPatterns) {
    if (lowerUrl.includes(pattern)) return true;
  }
  
  // If we have content, check for listing page indicators
  if (content) {
    const listingIndicators = [
      'showing results for',
      'search results',
      'browse all courses',
      'filter by category',
      'sort by popularity',
      'results found',
    ];
    const lowerContent = content.toLowerCase();
    for (const indicator of listingIndicators) {
      if (lowerContent.includes(indicator)) return true;
    }
  }
  
  return false;
}

async function firecrawlScrape(url: string, apiKey: string): Promise<{ 
  success: boolean; 
  statusCode?: number; 
  markdown?: string; 
  title?: string; 
  error?: string 
}> {
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

async function firecrawlSearch(
  query: string, 
  apiKey: string, 
  limit = 5
): Promise<{ 
  success: boolean; 
  results?: Array<{ url: string; title: string; description: string }>; 
  error?: string 
}> {
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
  reasons.push('✓ Domain matches provider');
  score += 0.25;
  
  // 2. Check provider-specific deny patterns (disqualifying)
  if (matchesProviderDenyPattern(result.url, sourceCode)) {
    return { ...result, confidence: 0, reasons: ['URL matches provider deny pattern (listing page)'] };
  }
  
  // 3. Check if it's a generic listing page (disqualifying)
  if (isGenericListingPage(result.url)) {
    return { ...result, confidence: 0, reasons: ['URL appears to be a generic listing page'] };
  }
  reasons.push('✓ Not a listing page');
  score += 0.1;
  
  // 4. Provider-specific course pattern bonus
  if (matchesProviderCoursePattern(result.url, sourceCode)) {
    reasons.push('✓ URL matches provider course pattern');
    score += 0.1;
  }
  
  // 5. Title similarity (critical) - using normalized full title
  const titleSim = calculateTitleSimilarity(courseTitle, result.title);
  if (titleSim >= 0.95) {
    reasons.push(`✓ Title exact match (${(titleSim * 100).toFixed(0)}%)`);
    score += 0.35;
  } else if (titleSim >= MIN_TITLE_SIMILARITY) {
    reasons.push(`✓ Title similar (${(titleSim * 100).toFixed(0)}%)`);
    score += 0.25;
  } else if (titleSim >= 0.7) {
    reasons.push(`⚠ Title partially matches (${(titleSim * 100).toFixed(0)}%)`);
    score += 0.1;
  } else {
    reasons.push(`✗ Title similarity too low (${(titleSim * 100).toFixed(0)}%)`);
    // No score added, likely to fail threshold
  }
  
  // 6. Description contains full normalized course title
  if (contentContainsFullTitle(result.description || '', courseTitle)) {
    reasons.push('✓ Description contains full course title');
    score += 0.15;
  }
  
  // 7. URL slug contains key words from title (at least 2 significant words)
  const urlLower = result.url.toLowerCase();
  const titleWords = normalizeText(courseTitle).split(/\s+/).filter(w => w.length > 3);
  const matchingWords = titleWords.filter(w => urlLower.includes(w));
  if (matchingWords.length >= 2 || (titleWords.length > 0 && matchingWords.length === titleWords.length)) {
    reasons.push(`✓ URL contains title keywords: ${matchingWords.join(', ')}`);
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
        verification_method: 'no_url',
        url_notes: 'No URL provided',
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
    const markdown = scrapeResult.markdown || '';
    const pageTitle = scrapeResult.title || '';
    
    // FIXED: Check for FULL normalized title in content (not just first word)
    const fullTitleInContent = contentContainsFullTitle(markdown, title);
    const titleSimilarToPageTitle = calculateTitleSimilarity(title, pageTitle) >= 0.85;
    
    if (fullTitleInContent || titleSimilarToPageTitle) {
      // URL works and content matches - mark as valid
      await supabase
        .from('alt_credits')
        .update({
          url_status: 'valid',
          url_http_status: 200,
          url_checked_at: new Date().toISOString(),
          verification_method: 'scrape_verified',
          verified_by: 'worker',
          confidence_score: 1.0,
          url_notes: `Page title: "${pageTitle.slice(0, 100)}"`,
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
      // URL loads but content doesn't match - queue for review
      console.log(`[url-verify-worker] URL loads but content mismatch: ${provider_url}`);
      console.log(`[url-verify-worker] Expected: "${title}", Got page title: "${pageTitle}"`);
    }
  }
  
  // TIER B: URL failed or content mismatch - search for correct URL
  console.log(`[url-verify-worker] Searching for correct URL for: ${title}`);
  
  // FIXED: Use canonical search domain (no www)
  const searchDomain = PROVIDER_SEARCH_DOMAINS[source_code] || '';
  const searchQuery = `"${title}" site:${searchDomain}`;
  const searchResult = await firecrawlSearch(searchQuery, apiKey, 5);
  
  if (!searchResult.success || !searchResult.results?.length) {
    // No search results - mark as invalid
    await supabase
      .from('alt_credits')
      .update({
        url_status: 'invalid',
        url_http_status: scrapeResult.statusCode || 404,
        url_checked_at: new Date().toISOString(),
        verification_method: 'search_no_results',
        url_notes: `Original URL failed (${scrapeResult.error}), no alternatives found`,
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
        verification_method: 'search_no_valid_candidates',
        url_notes: `${searchResult.results.length} results found but none passed validation`,
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
  
  // TIER B1: High confidence - attempt auto-fix with STRICT verification
  if (bestCandidate.confidence >= AUTO_FIX_THRESHOLD) {
    // Before auto-fixing, verify the new URL actually works AND contains full title
    const verifyNewUrl = await firecrawlScrape(bestCandidate.url, apiKey);
    
    if (verifyNewUrl.success) {
      const newMarkdown = verifyNewUrl.markdown || '';
      const newPageTitle = verifyNewUrl.title || '';
      
      // CRITICAL: Require FULL normalized title in content (not just first word)
      const fullTitleInNewContent = contentContainsFullTitle(newMarkdown, title);
      const pageTitleMatches = calculateTitleSimilarity(title, newPageTitle) >= 0.90;
      
      // Also verify it's not a listing page based on content
      const isListing = isGenericListingPage(bestCandidate.url, newMarkdown);
      
      if ((fullTitleInNewContent || pageTitleMatches) && !isListing) {
        await supabase
          .from('alt_credits')
          .update({
            provider_url: bestCandidate.url,
            url_status: 'valid',
            url_http_status: 200,
            url_checked_at: new Date().toISOString(),
            verification_method: 'search_auto_fix',
            verified_by: 'worker',
            confidence_score: bestCandidate.confidence,
            suggested_urls: candidates.slice(0, 3),
            url_notes: `Auto-fixed from "${provider_url}". Reasons: ${bestCandidate.reasons.join('; ')}`,
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
      } else {
        console.log(`[url-verify-worker] Auto-fix blocked: content verification failed for ${bestCandidate.url}`);
        console.log(`[url-verify-worker] Full title in content: ${fullTitleInNewContent}, Page title matches: ${pageTitleMatches}, Is listing: ${isListing}`);
      }
    }
    
    // New URL verification failed - demote to review queue
    bestCandidate.confidence = Math.min(bestCandidate.confidence, REVIEW_THRESHOLD + 0.15);
  }
  
  // TIER B2: Moderate confidence - queue for review
  if (bestCandidate.confidence >= REVIEW_THRESHOLD) {
    await supabase
      .from('alt_credits')
      .update({
        url_status: 'needs_review',
        url_http_status: scrapeResult.statusCode || 404,
        url_checked_at: new Date().toISOString(),
        verification_method: 'search_needs_review',
        confidence_score: bestCandidate.confidence,
        suggested_urls: candidates.slice(0, 3),
        url_notes: `Best match: ${bestCandidate.url} (${(bestCandidate.confidence * 100).toFixed(0)}%)`,
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
      verification_method: 'search_low_confidence',
      confidence_score: bestCandidate.confidence,
      suggested_urls: candidates.slice(0, 3),
      url_notes: `Best confidence only ${(bestCandidate.confidence * 100).toFixed(0)}% - below ${(REVIEW_THRESHOLD * 100).toFixed(0)}% threshold`,
    })
    .eq('id', id);
  
  return {
    id, source_code, identifier, title,
    original_url: provider_url,
    action: 'invalid',
    confidence: bestCandidate.confidence,
    suggested_urls: candidates.slice(0, 3),
    reason: `Best match only ${(bestCandidate.confidence * 100).toFixed(0)}% confidence - below review threshold`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase: any = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const body: VerifyRequest = await req.json().catch(() => ({}));
    
    console.log('[url-verify-worker] Request:', JSON.stringify(body));
    
    // Build query based on request
    let query = supabase.from('alt_credits').select('*');
    
    if (body.id) {
      query = query.eq('id', body.id);
    } else if (body.source_code) {
      query = query.eq('source_code', body.source_code);
      if (!body.recheck_valid) {
        query = query.or('url_status.is.null,url_status.eq.unknown');
      }
    } else if (body.recheck_valid) {
      const daysAgo = body.recheck_days || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysAgo);
      query = query
        .eq('url_status', 'valid')
        .lt('url_checked_at', cutoff.toISOString());
    } else if (body.all) {
      query = query.or('url_status.is.null,url_status.eq.unknown');
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Must specify source_code, id, all, or recheck_valid' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { data: records, error: fetchError } = await query;
    
    if (fetchError) {
      console.error('[url-verify-worker] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No records to verify',
          verified: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[url-verify-worker] Verifying ${records.length} records...`);
    
    const results: VerifyResult[] = [];
    const summary = {
      valid: 0,
      auto_fixed: 0,
      needs_review: 0,
      invalid: 0,
    };
    
    // Process records sequentially to respect rate limits
    for (const record of records) {
      const result = await verifyAndFixUrl(record, apiKey, supabase);
      results.push(result);
      summary[result.action]++;
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[url-verify-worker] Verification complete:', summary);
    
    return new Response(
      JSON.stringify({
        success: true,
        verified: records.length,
        summary,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    console.error('[url-verify-worker] Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
