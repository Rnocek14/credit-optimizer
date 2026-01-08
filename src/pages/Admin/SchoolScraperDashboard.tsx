import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Globe, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { PolicyReviewForm } from '@/components/school-scraper/PolicyReviewForm';

const INSTITUTION_CODES = ['TESU', 'WGU', 'UMGC', 'COSC', 'SNHU', 'EXCELSIOR', 'PURDUE_GLOBAL'] as const;

type JobStatus = 'pending' | 'scraping' | 'extracting' | 'review' | 'completed' | 'failed';

interface ScrapeJob {
  id: string;
  institution_code: string;
  target_urls: string[];
  status: JobStatus;
  scraped_content: Array<{ url: string; text: string; error?: string; fetchedAt: string }> | null;
  extracted_data: Record<string, unknown> | null;
  overall_confidence: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface UrlTemplate {
  id: string;
  institution_code: string;
  url: string;
  page_type: string;
  priority: number;
}

function getStatusIcon(status: JobStatus) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'review': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'scraping':
    case 'extracting': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function getConfidenceBadge(confidence: number | null) {
  if (confidence === null) return null;
  
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  if (confidence >= 90) variant = 'default';
  else if (confidence >= 70) variant = 'secondary';
  else if (confidence >= 50) variant = 'outline';
  else variant = 'destructive';
  
  return (
    <Badge variant={variant} className="ml-2">
      {confidence}% confidence
    </Badge>
  );
}

export default function SchoolScraperDashboard() {
  const queryClient = useQueryClient();
  const [selectedInstitution, setSelectedInstitution] = useState<string>('TESU');
  const [customUrls, setCustomUrls] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<ScrapeJob | null>(null);
  const [newTemplateUrl, setNewTemplateUrl] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('catalog');

  // Fetch jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['scrape-jobs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('school_scrape_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ScrapeJob[];
    },
  });

  // Fetch URL templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['scrape-templates', selectedInstitution],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scrape_url_templates')
        .select('*')
        .eq('institution_code', selectedInstitution)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as UrlTemplate[];
    },
  });

  // Start scrape mutation
  const startScrapeMutation = useMutation({
    mutationFn: async ({ institutionCode, urls }: { institutionCode: string; urls?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('school-scraper', {
        body: { 
          institutionCode, 
          customUrls: urls?.length ? urls : undefined 
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Scrape started`, {
        description: `Job ID: ${data.jobId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
    },
    onError: (error) => {
      toast.error('Failed to start scrape', {
        description: (error as Error).message,
      });
    },
  });

  // Add template mutation
  const addTemplateMutation = useMutation({
    mutationFn: async ({ url, pageType }: { url: string; pageType: string }) => {
      const { error } = await (supabase as any)
        .from('scrape_url_templates')
        .insert({
          institution_code: selectedInstitution,
          url,
          page_type: pageType,
          priority: (templates?.length || 0) + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('URL template added');
      setNewTemplateUrl('');
      queryClient.invalidateQueries({ queryKey: ['scrape-templates'] });
    },
    onError: (error) => {
      toast.error('Failed to add template', {
        description: (error as Error).message,
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('scrape_url_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('URL template deleted');
      queryClient.invalidateQueries({ queryKey: ['scrape-templates'] });
    },
  });

  const handleStartScrape = () => {
    const urls = customUrls.split('\n').map(u => u.trim()).filter(Boolean);
    startScrapeMutation.mutate({ 
      institutionCode: selectedInstitution, 
      urls: urls.length > 0 ? urls : undefined 
    });
  };

  const reviewJobs = jobs?.filter(j => j.status === 'review') || [];
  const recentJobs = jobs?.slice(0, 10) || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">School Policy Scraper</h1>
          <p className="text-muted-foreground">
            AI-powered extraction of institution transfer policies with human review
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {reviewJobs.length} pending review
        </Badge>
      </div>

      <Tabs defaultValue="scrape" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scrape">
            <Globe className="w-4 h-4 mr-2" />
            Scrape
          </TabsTrigger>
          <TabsTrigger value="review">
            <FileText className="w-4 h-4 mr-2" />
            Review Queue ({reviewJobs.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Plus className="w-4 h-4 mr-2" />
            URL Templates
          </TabsTrigger>
        </TabsList>

        {/* Scrape Tab */}
        <TabsContent value="scrape" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Start New Scrape</CardTitle>
              <CardDescription>
                Select an institution and optionally provide custom URLs to scrape
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTION_CODES.map(code => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleStartScrape}
                  disabled={startScrapeMutation.isPending}
                >
                  {startScrapeMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Start Scrape
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Custom URLs (optional, one per line)</label>
                <textarea
                  className="w-full h-24 p-2 border rounded-md text-sm font-mono bg-background"
                  placeholder="https://example.edu/catalog/transfer-credit..."
                  value={customUrls}
                  onChange={(e) => setCustomUrls(e.target.value)}
                />
              </div>

              {templates && templates.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <strong>{templates.length}</strong> URL templates configured for {selectedInstitution}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No jobs yet</div>
              ) : (
                <div className="space-y-2">
                  {recentJobs.map(job => (
                    <div 
                      key={job.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <div className="font-medium">{job.institution_code}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(job.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{job.status}</Badge>
                        {getConfidenceBadge(job.overall_confidence)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          {reviewJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>No jobs pending review</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reviewJobs.map(job => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {job.institution_code}
                        {getConfidenceBadge(job.overall_confidence)}
                      </CardTitle>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>Review Extraction</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>Review {job.institution_code} Extraction</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[70vh]">
                            <PolicyReviewForm job={job} />
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <CardDescription>
                      Scraped {job.target_urls.length} URLs on {new Date(job.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      {(job.extracted_data as any)?.uncertainFields?.length > 0 && (
                        <div className="text-yellow-600">
                          ⚠️ Uncertain fields: {(job.extracted_data as any).uncertainFields.join(', ')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>URL Templates for {selectedInstitution}</CardTitle>
              <CardDescription>
                Configure which pages to scrape for each institution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.edu/catalog/..."
                  value={newTemplateUrl}
                  onChange={(e) => setNewTemplateUrl(e.target.value)}
                  className="flex-1"
                />
                <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="catalog">Catalog</SelectItem>
                    <SelectItem value="transfer_policy">Transfer Policy</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="residency">Residency</SelectItem>
                    <SelectItem value="gened">Gen Ed</SelectItem>
                    <SelectItem value="tuition">Tuition</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => addTemplateMutation.mutate({ url: newTemplateUrl, pageType: newTemplateType })}
                  disabled={!newTemplateUrl || addTemplateMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {templatesLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : templates?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No URL templates configured for {selectedInstitution}
                </div>
              ) : (
                <div className="space-y-2">
                  {templates?.map(template => (
                    <div 
                      key={template.id}
                      className="flex items-center justify-between p-2 border rounded group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Badge variant="outline" className="shrink-0">{template.page_type}</Badge>
                        <span className="text-sm truncate font-mono">{template.url}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={template.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Job Details: {selectedJob.institution_code}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Status:</strong> {selectedJob.status}
                  </div>
                  <div>
                    <strong>Confidence:</strong> {selectedJob.overall_confidence ?? 'N/A'}%
                  </div>
                  <div>
                    <strong>Created:</strong> {new Date(selectedJob.created_at).toLocaleString()}
                  </div>
                  <div>
                    <strong>URLs:</strong> {selectedJob.target_urls.length}
                  </div>
                </div>

                {selectedJob.error_message && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded">
                    {selectedJob.error_message}
                  </div>
                )}

                {selectedJob.extracted_data && (
                  <div>
                    <h4 className="font-medium mb-2">Extracted Data</h4>
                    <pre className="p-3 bg-muted rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(selectedJob.extracted_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
