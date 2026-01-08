import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function ContentScraperPage() {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  const [url, setUrl] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState('');

  const testConnection = async () => {
    setConnectionStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('content-scraper', {
        body: { action: 'ping' }
      });

      if (error) throw error;

      setConnectionStatus('success');
      setConnectionMessage(data.message || 'Connected!');
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMessage(err.message || 'Connection failed');
    }
  };

  const scrapeUrl = async () => {
    if (!url) return;
    
    setScrapeStatus('loading');
    setScrapeResult(null);
    setScrapeError('');

    try {
      const { data, error } = await supabase.functions.invoke('content-scraper', {
        body: { action: 'scrape', url }
      });

      if (error) throw error;

      if (data.success) {
        setScrapeStatus('success');
        setScrapeResult(data);
      } else {
        throw new Error(data.error || 'Scrape failed');
      }
    } catch (err: any) {
      setScrapeStatus('error');
      setScrapeError(err.message || 'Scrape failed');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Content Scraper</h1>
      <p className="text-muted-foreground mb-8">
        Using proven patterns from your working Lake Geneva scraper
      </p>

      {/* Connection Test */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testConnection} disabled={connectionStatus === 'loading'}>
            {connectionStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>

          {connectionStatus === 'success' && (
            <div className="mt-4 flex items-center text-green-600">
              <CheckCircle className="mr-2 h-5 w-5" />
              {connectionMessage}
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="mt-4 flex items-center text-red-600">
              <XCircle className="mr-2 h-5 w-5" />
              {connectionMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scrape URL */}
      <Card>
        <CardHeader>
          <CardTitle>Scrape URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="https://example.com/page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={scrapeUrl} disabled={scrapeStatus === 'loading' || !url}>
              {scrapeStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Scrape
            </Button>
          </div>

          {scrapeStatus === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {scrapeError}
            </div>
          )}

          {scrapeResult && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="font-medium text-green-700">
                  Successfully scraped {scrapeResult.contentLength?.toLocaleString()} characters
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Preview (first 500 chars):</h4>
                <pre className="p-3 bg-muted rounded text-sm overflow-x-auto whitespace-pre-wrap">
                  {scrapeResult.preview}
                </pre>
              </div>

              <details>
                <summary className="cursor-pointer font-medium">Full Content</summary>
                <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {scrapeResult.fullContent}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
