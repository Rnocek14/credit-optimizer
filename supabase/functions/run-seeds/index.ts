const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function extractMainContent(html: string): string {
  let content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return content.substring(0, 50000);
}

async function handlePing(): Promise<Response> {
  return json(200, { 
    success: true, 
    message: 'pong', 
    timestamp: new Date().toISOString() 
  });
}

async function handleScrape(url: string): Promise<Response> {
  if (!url) {
    return json(400, { error: 'URL is required' });
  }

  try {
    console.log(`Scraping: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return json(response.status, { 
        error: `Failed to fetch URL: ${response.statusText}` 
      });
    }

    const html = await response.text();
    const content = extractMainContent(html);

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    console.log(`Extracted ${content.length} chars from ${url}`);

    return json(200, {
      success: true,
      url,
      title,
      description,
      preview: content.slice(0, 500),
      fullContent: content,
      contentLength: content.length,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scrape error:', message);
    return json(500, { error: `Scraping failed: ${message}` });
  }
}

async function handleSeed(): Promise<Response> {
  return json(200, { 
    success: true, 
    message: 'Seed action - use dedicated seed functions for data operations',
    timestamp: new Date().toISOString()
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'seed';

    console.log(`run-seeds called with action: ${action}`);

    switch (action) {
      case 'ping':
        return await handlePing();
      case 'scrape':
        return await handleScrape(body.url);
      case 'seed':
        return await handleSeed();
      default:
        return json(400, { error: `Unknown action: ${action}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('run-seeds error:', message);
    return json(500, { error: message });
  }
});
