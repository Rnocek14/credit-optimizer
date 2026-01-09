import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RefreshCw, Play, Sparkles, CheckCircle, XCircle, Plus, ExternalLink } from 'lucide-react';
import { useTransferScraper, ScrapeJob, ScrapedContent, ExtractionResult } from '@/hooks/useTransferScraper';

// -----------------------------------------------------------------------------
// Status Badge Component
// -----------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-yellow-500/20 text-yellow-600', label: 'Pending' },
    processing: { color: 'bg-blue-500/20 text-blue-600', label: 'Processing' },
    completed: { color: 'bg-green-500/20 text-green-600', label: 'Completed' },
    failed: { color: 'bg-red-500/20 text-red-600', label: 'Failed' },
    skipped: { color: 'bg-gray-500/20 text-gray-600', label: 'Skipped' },
  };
  const v = variants[status] || variants.pending;
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.color}`}>{v.label}</span>;
}

// -----------------------------------------------------------------------------
// Source Type Badge
// -----------------------------------------------------------------------------
function SourceTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    catalog: 'bg-purple-500/20 text-purple-600',
    policy: 'bg-blue-500/20 text-blue-600',
    degree: 'bg-green-500/20 text-green-600',
    partner: 'bg-orange-500/20 text-orange-600',
    faq: 'bg-gray-500/20 text-gray-600',
    marketing: 'bg-pink-500/20 text-pink-600',
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[type] || 'bg-muted'}`}>{type}</span>;
}

// -----------------------------------------------------------------------------
// Confidence Score Display
// -----------------------------------------------------------------------------
function ConfidenceDisplay({ score, action }: { score: number; action: string }) {
  const colorClass = score >= 85 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const actionLabel = action === 'auto_approve' ? 'Auto-Approve' : action === 'human_review' ? 'Needs Review' : 'Hold';
  
  return (
    <div className="flex items-center gap-2">
      <span className={`text-2xl font-bold ${colorClass}`}>{score}</span>
      <span className="text-sm text-muted-foreground">/ 100</span>
      <Badge variant={score >= 85 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}>
        {actionLabel}
      </Badge>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Dashboard Component
// -----------------------------------------------------------------------------
export default function TransferScraperDashboard() {
  const { toast } = useToast();
  const scraper = useTransferScraper();
  
  // State
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ScrapeJob | null>(null);
  const [content, setContent] = useState<ScrapedContent | null>(null);
  const [filters, setFilters] = useState({ institution: 'TESU', status: '', source_type: '' });
  
  // Add URL form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newJobType, setNewJobType] = useState<'policy' | 'provider' | 'degree'>('policy');
  
  // Validate modal state
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Load jobs on mount and filter change
  useEffect(() => {
    loadJobs();
  }, [filters.institution, filters.status, filters.source_type]);

  const loadJobs = async () => {
    const data = await scraper.listJobs({
      institution: filters.institution || undefined,
      status: filters.status || undefined,
      source_type: filters.source_type || undefined,
    });
    setJobs(data);
  };

  // Load content when job selected
  useEffect(() => {
    if (selectedJob) {
      loadContent(selectedJob.id);
    } else {
      setContent(null);
    }
  }, [selectedJob?.id]);

  const loadContent = async (jobId: string) => {
    const data = await scraper.getContentForJob(jobId);
    setContent(data);
  };

  // Actions
  const handleCrawl = async (job: ScrapeJob) => {
    try {
      await scraper.crawl({
        url: job.url,
        institution: job.institution,
        job_type: job.job_type as 'policy' | 'provider' | 'degree',
        priority: job.priority,
      });
      toast({ title: 'Crawl started', description: `Crawling ${job.url}` });
      await loadJobs();
      if (selectedJob?.id === job.id) {
        await loadContent(job.id);
      }
    } catch (e) {
      toast({ title: 'Crawl failed', description: scraper.error || 'Unknown error', variant: 'destructive' });
    }
  };

  const handleExtract = async (jobId: string) => {
    try {
      const result = await scraper.extract(jobId);
      toast({ 
        title: 'Extraction complete', 
        description: `Score: ${result.total_score}, Action: ${result.action}` 
      });
      await loadContent(jobId);
    } catch (e) {
      toast({ title: 'Extraction failed', description: scraper.error || 'Unknown error', variant: 'destructive' });
    }
  };

  const handleValidate = async (jobId: string, forceAction?: 'approve' | 'reject') => {
    try {
      const result = await scraper.validate({
        scrape_job_id: jobId,
        force_action: forceAction,
        reviewer_notes: reviewerNotes || undefined,
      });
      toast({ 
        title: `Validation: ${result.action_taken}`, 
        description: result.message 
      });
      setReviewerNotes('');
      await loadJobs();
    } catch (e) {
      toast({ title: 'Validation failed', description: scraper.error || 'Unknown error', variant: 'destructive' });
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim()) return;
    try {
      const id = await scraper.addToQueue({
        url: newUrl.trim(),
        institution: filters.institution || 'TESU',
        job_type: newJobType,
        priority: 5,
      });
      if (id) {
        toast({ title: 'URL added', description: 'Job queued successfully' });
        setNewUrl('');
        setShowAddForm(false);
        await loadJobs();
      }
    } catch (e) {
      toast({ title: 'Failed to add URL', variant: 'destructive' });
    }
  };

  // Helpers
  const truncateUrl = (url: string) => {
    try {
      const u = new URL(url);
      const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + '...' : u.pathname;
      return `${u.hostname}${path}`;
    } catch {
      return url.slice(0, 50);
    }
  };

  const hasContent = !!content?.extracted_text;
  const hasExtraction = !!content?.ai_extracted_data;
  const extraction = content?.ai_extracted_data as ExtractionResult | null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Transfer Scraper</h1>
            <p className="text-muted-foreground">Crawl, extract, and validate institution transfer policies</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filters.institution} onValueChange={(v) => setFilters(f => ({ ...f, institution: v }))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Institution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TESU">TESU</SelectItem>
                <SelectItem value="COSC">COSC</SelectItem>
                <SelectItem value="WGU">WGU</SelectItem>
                <SelectItem value="SNHU">SNHU</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadJobs} disabled={scraper.loading}>
              <RefreshCw className={`h-4 w-4 ${scraper.loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT: Job Queue */}
          <div className="col-span-4">
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Job Queue</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus className="h-4 w-4 mr-1" /> Add URL
                  </Button>
                </div>
                
                {showAddForm && (
                  <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                    <Input 
                      placeholder="https://tesu.edu/..." 
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Select value={newJobType} onValueChange={(v: 'policy' | 'provider' | 'degree') => setNewJobType(v)}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="policy">Policy</SelectItem>
                          <SelectItem value="provider">Provider</SelectItem>
                          <SelectItem value="degree">Degree</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleAddUrl} disabled={!newUrl.trim()}>Add</Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="overflow-y-auto h-[calc(100%-80px)]">
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedJob?.id === job.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <StatusBadge status={job.status} />
                        <SourceTypeBadge type={job.source_type} />
                      </div>
                      <p className="text-sm font-medium truncate mb-1">{truncateUrl(job.url)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>P{job.priority}</span>
                        <span>•</span>
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                      {job.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate">{job.error_message}</p>
                      )}
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No jobs found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MIDDLE: Content Inspector */}
          <div className="col-span-5">
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {selectedJob ? 'Content Inspector' : 'Select a Job'}
                </CardTitle>
                {selectedJob && (
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCrawl(selectedJob)}
                      disabled={scraper.loading || selectedJob.status === 'processing'}
                    >
                      <Play className="h-3 w-3 mr-1" /> Crawl
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleExtract(selectedJob.id)}
                      disabled={scraper.loading || !hasContent}
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Extract
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleValidate(selectedJob.id)}
                      disabled={scraper.loading || !hasExtraction}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Validate
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="overflow-hidden h-[calc(100%-100px)]">
                {!selectedJob ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a job from the queue to inspect
                  </div>
                ) : scraper.loading ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <Tabs defaultValue="text" className="h-full flex flex-col">
                    <TabsList className="mb-3">
                      <TabsTrigger value="text">Text Preview</TabsTrigger>
                      <TabsTrigger value="extraction" disabled={!hasExtraction}>AI Extraction</TabsTrigger>
                      <TabsTrigger value="raw">Raw Data</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="text" className="flex-1 overflow-auto">
                      {hasContent ? (
                        <div className="bg-muted p-4 rounded-lg font-mono text-xs whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                          {content.extracted_text?.slice(0, 8000)}
                          {(content.extracted_text?.length || 0) > 8000 && (
                            <p className="text-muted-foreground mt-4">... truncated ({content.extracted_text?.length} total chars)</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <p className="mb-4">No content yet. Run Crawl first.</p>
                          <Button size="sm" onClick={() => handleCrawl(selectedJob!)}>
                            <Play className="h-3 w-3 mr-1" /> Crawl Now
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="extraction" className="flex-1 overflow-auto">
                      {extraction && (
                        <div className="space-y-4">
                          {/* Confidence */}
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Confidence Score</p>
                            <ConfidenceDisplay score={extraction.total_score} action={extraction.action} />
                            
                            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                              <div>Source: {extraction.confidence.source_authority}/30</div>
                              <div>Language: {extraction.confidence.language_certainty}/20</div>
                              <div>Agreement: {extraction.confidence.cross_source_agreement}/20</div>
                              <div>Recency: {extraction.confidence.recency}/15</div>
                              <div>Structure: {extraction.confidence.structural_consistency}/10</div>
                              <div>AI: {extraction.confidence.ai_certainty}/5</div>
                            </div>
                          </div>
                          
                          {/* Policy Pack Preview */}
                          {extraction.policy_pack && (
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-2">Policy Pack</p>
                              <pre className="text-xs overflow-auto max-h-48">
                                {JSON.stringify(extraction.policy_pack, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {/* Provider Rules */}
                          {extraction.provider_rules?.length > 0 && (
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-2">Provider Rules ({extraction.provider_rules.length})</p>
                              <pre className="text-xs overflow-auto max-h-48">
                                {JSON.stringify(extraction.provider_rules, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {/* Notes */}
                          {extraction.extraction_notes?.length > 0 && (
                            <div className="p-4 bg-yellow-500/10 rounded-lg">
                              <p className="text-sm font-medium mb-2">Extraction Notes</p>
                              <ul className="text-xs space-y-1">
                                {extraction.extraction_notes.map((note, i) => (
                                  <li key={i}>• {note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="raw" className="flex-1 overflow-auto">
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-xs overflow-auto max-h-[500px]">
                          {JSON.stringify(content, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Publish Panel */}
          <div className="col-span-3">
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Publish Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedJob ? (
                  <p className="text-muted-foreground text-sm">Select a job to see publish options</p>
                ) : !hasExtraction ? (
                  <p className="text-muted-foreground text-sm">Run extraction first to see publish options</p>
                ) : (
                  <>
                    {/* Action Summary */}
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Recommended Action</p>
                      <ConfidenceDisplay 
                        score={extraction!.total_score} 
                        action={extraction!.action} 
                      />
                    </div>
                    
                    {/* URL Reference */}
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Source URL</p>
                      <a 
                        href={selectedJob.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {truncateUrl(selectedJob.url)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    
                    {/* Review Notes */}
                    <div>
                      <label className="text-sm font-medium">Review Notes</label>
                      <Textarea 
                        className="mt-1 text-sm"
                        placeholder="Add notes for this validation..."
                        value={reviewerNotes}
                        onChange={(e) => setReviewerNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        onClick={() => handleValidate(selectedJob.id)}
                        disabled={scraper.loading}
                      >
                        {scraper.loading ? <LoadingSpinner size="sm" className="mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Validate (Auto-Decide)
                      </Button>
                      
                      {extraction!.action === 'human_review' && (
                        <>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => handleValidate(selectedJob.id, 'approve')}
                            disabled={scraper.loading}
                          >
                            Force Approve
                          </Button>
                          <Button 
                            className="w-full" 
                            variant="destructive"
                            onClick={() => handleValidate(selectedJob.id, 'reject')}
                            disabled={scraper.loading}
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
