import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle,
  Search,
  Loader2,
  Link as LinkIcon,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface AltCreditRecord {
  id: string;
  source_code: string;
  identifier: string;
  title: string;
  provider_url: string | null;
  url_status: string | null;
  url_http_status: number | null;
  url_checked_at: string | null;
  url_notes: string | null;
}

interface SuggestedUrl {
  url: string;
  title: string;
  confidence: number;
  reasons: string[];
}

export default function UrlReviewQueue() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'needs_review' | 'invalid' | 'unknown' | 'valid'>('needs_review');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingProvider, setVerifyingProvider] = useState<string | null>(null);

  // Fetch alt_credits by status
  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ['alt-credits-review', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('alt_credits')
        .select('id, source_code, identifier, title, provider_url, url_status, url_http_status, url_checked_at, url_notes')
        .order('source_code', { ascending: true });

      if (activeTab === 'unknown') {
        query = query.or('url_status.is.null,url_status.eq.unknown');
      } else {
        query = query.eq('url_status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AltCreditRecord[];
    },
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['alt-credits-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alt_credits')
        .select('url_status');
      
      if (error) throw error;
      
      const counts = { unknown: 0, valid: 0, invalid: 0, needs_review: 0 };
      (data || []).forEach(r => {
        const status = r.url_status || 'unknown';
        if (status in counts) {
          counts[status as keyof typeof counts]++;
        } else {
          counts.unknown++;
        }
      });
      return counts;
    },
  });

  // Approve URL mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, newUrl }: { id: string; newUrl: string }) => {
      const { error } = await supabase
        .from('alt_credits')
        .update({
          provider_url: newUrl,
          url_status: 'valid',
          url_checked_at: new Date().toISOString(),
          url_notes: JSON.stringify({ 
            verification_method: 'admin_approved',
            verified_by: 'admin',
            approved_at: new Date().toISOString(),
          }),
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('URL approved and updated');
      queryClient.invalidateQueries({ queryKey: ['alt-credits-review'] });
      queryClient.invalidateQueries({ queryKey: ['alt-credits-stats'] });
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  // Reject/Mark invalid mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alt_credits')
        .update({
          url_status: 'invalid',
          url_checked_at: new Date().toISOString(),
          url_notes: JSON.stringify({ 
            verification_method: 'admin_rejected',
            verified_by: 'admin',
            rejected_at: new Date().toISOString(),
          }),
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('URL marked as invalid');
      queryClient.invalidateQueries({ queryKey: ['alt-credits-review'] });
      queryClient.invalidateQueries({ queryKey: ['alt-credits-stats'] });
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  // Trigger verification
  const handleVerify = async (provider?: string) => {
    setIsVerifying(true);
    setVerifyingProvider(provider || 'all');
    
    try {
      const result = await firecrawlApi.verifyUrls(
        provider ? { source_code: provider } : { all: true }
      );
      
      if (result.success && result.data) {
        toast.success(
          `Verification complete: ${result.data.stats.valid} valid, ${result.data.stats.auto_fixed} fixed, ${result.data.stats.needs_review} need review`
        );
        refetch();
        queryClient.invalidateQueries({ queryKey: ['alt-credits-stats'] });
      } else {
        toast.error(result.error || 'Verification failed');
      }
    } catch (error) {
      toast.error(`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsVerifying(false);
      setVerifyingProvider(null);
    }
  };

  const parseSuggestedUrls = (notes: string | null): SuggestedUrl[] => {
    if (!notes) return [];
    try {
      const parsed = JSON.parse(notes);
      return parsed.suggested_urls || [];
    } catch {
      return [];
    }
  };

  const getProviderColor = (source: string) => {
    switch (source) {
      case 'CLEP': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'SOPHIA': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'STUDY_COM': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'DSST': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">URL Review Queue</h1>
          <p className="text-muted-foreground">
            Review and approve alternative credit URLs for 100% link credibility
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => handleVerify('SOPHIA')}
            disabled={isVerifying}
          >
            {isVerifying && verifyingProvider === 'SOPHIA' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Verify Sophia
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleVerify('STUDY_COM')}
            disabled={isVerifying}
          >
            {isVerifying && verifyingProvider === 'STUDY_COM' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Verify Study.com
          </Button>
          <Button 
            onClick={() => handleVerify()}
            disabled={isVerifying}
          >
            {isVerifying && verifyingProvider === 'all' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Verify All Unknown
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('valid')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats?.valid || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Valid URLs</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('needs_review')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{stats?.needs_review || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Needs Review</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('invalid')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats?.invalid || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Invalid</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('unknown')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats?.unknown || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Unknown</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="needs_review">
            Needs Review ({stats?.needs_review || 0})
          </TabsTrigger>
          <TabsTrigger value="unknown">
            Unknown ({stats?.unknown || 0})
          </TabsTrigger>
          <TabsTrigger value="invalid">
            Invalid ({stats?.invalid || 0})
          </TabsTrigger>
          <TabsTrigger value="valid">
            Valid ({stats?.valid || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : records?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No records in this category
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {records?.map((record) => {
                const suggestedUrls = parseSuggestedUrls(record.url_notes);
                
                return (
                  <Card key={record.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getProviderColor(record.source_code)}>
                            {record.source_code}
                          </Badge>
                          <CardTitle className="text-lg">{record.title}</CardTitle>
                        </div>
                        {record.url_http_status && (
                          <Badge variant={record.url_http_status === 200 ? 'default' : 'destructive'}>
                            HTTP {record.url_http_status}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {record.identifier} • Last checked: {
                          record.url_checked_at 
                            ? new Date(record.url_checked_at).toLocaleDateString()
                            : 'Never'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Current URL */}
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="text-sm font-medium min-w-[80px]">Current:</span>
                          <code className="text-xs flex-1 truncate">
                            {record.provider_url || 'No URL'}
                          </code>
                          {record.provider_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={record.provider_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>

                        {/* Suggested URLs for needs_review */}
                        {suggestedUrls.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Suggested URLs:</p>
                            {suggestedUrls.map((suggestion, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50"
                              >
                                <Badge variant="outline" className="min-w-[60px]">
                                  {(suggestion.confidence * 100).toFixed(0)}%
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <code className="text-xs block truncate">
                                    {suggestion.url}
                                  </code>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {suggestion.reasons?.join(', ')}
                                  </p>
                                </div>
                                <Button size="sm" variant="ghost" asChild>
                                  <a href={suggestion.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => approveMutation.mutate({ 
                                    id: record.id, 
                                    newUrl: suggestion.url 
                                  })}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          {activeTab === 'needs_review' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => rejectMutation.mutate(record.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Mark Invalid
                            </Button>
                          )}
                          {activeTab === 'valid' && record.provider_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={record.provider_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open Link
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
