import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function PolicyScraperPage() {
  const [connectionStatus, setConnectionStatus] = useState<Status>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  
  const [url, setUrl] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState<Status>('idle');
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState('');

  const testConnection = async () => {
    setConnectionStatus('loading');
    setConnectionMessage('');
    
    try {
      const { data, error } = await supabase.functions.invoke('policy-scraper', {
        body: { action: 'ping' }
      });

      if (error) throw error;

      if (data?.success) {
        setConnectionStatus('success');
        setConnectionMessage(data.message);
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMessage(err.message || 'Connection failed');
    }
  };

  const scrapeUrl = async () => {
    if (!url.trim()) return;
    
    setScrapeStatus('loading');
    setScrapeResult(null);
    setScrapeError('');

    try {
      const { data, error } = await supabase.functions.invoke('policy-scraper', {
        body: { action: 'scrape', url: url.trim() }
      });

      if (error) throw error;

      if (data?.success) {
        setScrapeStatus('success');
        setScrapeResult(data);
      } else {
        throw new Error(data?.error || 'Scrape failed');
      }
    } catch (err: any) {
      setScrapeStatus('error');
      setScrapeError(err.message || 'Scrape failed');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Policy Scraper</h1>

      {/* Connection Test */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">1. Test Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testConnection} disabled={connectionStatus === 'loading'}>
            {connectionStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          
          {connectionStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>{connectionMessage}</span>
            </div>
          )}
          
          {connectionStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>{connectionMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* URL Scraper */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">2. Scrape URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.edu/transfer-policy"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={scrapeUrl} disabled={scrapeStatus === 'loading' || !url.trim()}>
              {scrapeStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Globe className="mr-2 h-4 w-4" />
              Scrape
            </Button>
          </div>

          {scrapeStatus === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {scrapeError}
            </div>
          )}

          {scrapeStatus === 'success' && scrapeResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">
                  {scrapeResult.contentLength} characters extracted
                </Badge>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Preview (first 500 chars):</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {scrapeResult.preview}
                </p>
              </div>

              <details className="border rounded-lg">
                <summary className="p-4 cursor-pointer font-medium">
                  View Full Content
                </summary>
                <div className="p-4 border-t max-h-96 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {scrapeResult.fullContent}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
