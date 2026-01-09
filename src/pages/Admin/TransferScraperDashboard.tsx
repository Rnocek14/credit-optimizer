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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, Play, Sparkles, CheckCircle, XCircle, Plus, ExternalLink, Copy, Database, Brain, RotateCcw, Zap, AlertTriangle, FlaskConical, ClipboardList } from 'lucide-react';
import { useTransferScraper, ScrapeJob, ScrapedContent, ExtractionResult, AutoScanProgress, AutoScanUrlResult } from '@/hooks/useTransferScraper';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { ReviewQueuePanel } from '@/components/admin/ReviewQueuePanel';

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
// Pipeline Status Indicators
// -----------------------------------------------------------------------------
function PipelineStatusBadges({ hasContent, hasExtraction }: { hasContent: boolean; hasExtraction: boolean }) {
  return (
    <div className="flex gap-1">
      <span 
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
          hasContent ? 'bg-blue-500/20 text-blue-600' : 'bg-muted text-muted-foreground'
        }`}
        title={hasContent ? 'Content scraped' : 'Not crawled yet'}
      >
        <Database className="h-2.5 w-2.5" />
      </span>
      <span 
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
          hasExtraction ? 'bg-purple-500/20 text-purple-600' : 'bg-muted text-muted-foreground'
        }`}
        title={hasExtraction ? 'AI extracted' : 'Not extracted yet'}
      >
        <Brain className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Dashboard Component
// -----------------------------------------------------------------------------
function TransferScraperDashboardContent() {
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
  
  // Auto-scan state
  const [autoScanResult, setAutoScanResult] = useState<AutoScanProgress | null>(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [isTestingFirecrawl, setIsTestingFirecrawl] = useState(false);
  const [firecrawlTestResult, setFirecrawlTestResult] = useState<{ success: boolean; message: string; preview?: string } | null>(null);

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

  // Track content status per job for pipeline indicators
  const [jobContentStatus, setJobContentStatus] = useState<Record<string, { hasContent: boolean; hasExtraction: boolean }>>({});

  // Load content status for visible jobs
  useEffect(() => {
    const loadContentStatus = async () => {
      const status: Record<string, { hasContent: boolean; hasExtraction: boolean }> = {};
      for (const job of jobs.slice(0, 20)) { // Limit to first 20 for performance
        try {
          const c = await scraper.getContentForJob(job.id);
          status[job.id] = {
            hasContent: !!c?.extracted_text && c.extracted_text.length > 100,
            hasExtraction: !!(c?.ai_extracted_data?.policy_pack || c?.ai_extracted_data?.provider_rules?.length),
          };
        } catch {
          status[job.id] = { hasContent: false, hasExtraction: false };
        }
      }
      setJobContentStatus(status);
    };
    if (jobs.length > 0) loadContentStatus();
  }, [jobs]);

  // Actions - crawl now uses scrape_job_id to update existing job
  const handleCrawl = async (job: ScrapeJob) => {
    try {
      await scraper.crawl({
        url: job.url,
        institution: job.institution,
        job_type: job.job_type as 'policy' | 'provider' | 'degree',
        priority: job.priority,
        scrape_job_id: job.id, // Pass existing job ID to prevent duplication
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

  // Re-crawl - explicit action to overwrite existing content
  const handleRecrawl = async (job: ScrapeJob) => {
    try {
      await scraper.crawl({
        url: job.url,
        institution: job.institution,
        job_type: job.job_type as 'policy' | 'provider' | 'degree',
        priority: job.priority,
        scrape_job_id: job.id,
      });
      toast({ 
        title: 'Re-crawl complete', 
        description: 'Content updated. Previous extraction data cleared - run Extract again.' 
      });
      await loadJobs();
      if (selectedJob?.id === job.id) {
        await loadContent(job.id);
      }
    } catch (e) {
      toast({ title: 'Re-crawl failed', description: scraper.error || 'Unknown error', variant: 'destructive' });
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `Copied ${label}`, duration: 1500 });
  };

  // Auto-scan handler
  const handleAutoScan = async () => {
    if (!filters.institution) return;
    
    setIsAutoScanning(true);
    setAutoScanResult(null);
    
    try {
      const result = await scraper.autoScan(filters.institution);
      setAutoScanResult(result);
      
      if (result) {
        toast({
          title: 'Auto-Scan Complete',
          description: `${result.succeeded}/${result.total} URLs processed successfully`,
        });
        // Refresh job list
        await loadJobs();
      }
    } catch (e) {
      toast({ 
        title: 'Auto-Scan Failed', 
        description: scraper.error || 'Unknown error', 
        variant: 'destructive' 
      });
    } finally {
      setIsAutoScanning(false);
    }
  };

  // Test Firecrawl handler
  const handleTestFirecrawl = async () => {
    setIsTestingFirecrawl(true);
    setFirecrawlTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-test');
      
      if (error) {
        setFirecrawlTestResult({ success: false, message: error.message });
        toast({ 
          title: 'Firecrawl Test Failed', 
          description: error.message, 
          variant: 'destructive' 
        });
      } else if (data?.success) {
        setFirecrawlTestResult({ 
          success: true, 
          message: `✓ Scraped ${data.content_length} chars from ${data.url}`,
          preview: data.preview
        });
        toast({ 
          title: 'Firecrawl Working!', 
          description: `Successfully scraped ${data.content_length} characters` 
        });
      } else {
        setFirecrawlTestResult({ success: false, message: data?.error || 'Unknown error' });
        toast({ 
          title: 'Firecrawl Test Failed', 
          description: data?.error, 
          variant: 'destructive' 
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test failed';
      setFirecrawlTestResult({ success: false, message: msg });
      toast({ title: 'Firecrawl Test Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsTestingFirecrawl(false);
    }
  };

  // Better guards for content/extraction existence
  const hasContent = !!content?.extracted_text && content.extracted_text.length > 100;
  const hasExtraction = !!(content?.ai_extracted_data?.policy_pack || (content?.ai_extracted_data?.provider_rules?.length ?? 0) > 0);
  const extraction = content?.ai_extracted_data as ExtractionResult | null;

  // Helper to get status icon for auto-scan results
  const getStatusIcon = (status: AutoScanUrlResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'crawl_failed': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'extract_failed': return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
      case 'validate_failed': return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    }
  };

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
            <Button 
              onClick={handleAutoScan}
              disabled={isAutoScanning || !filters.institution}
              className="gap-2"
            >
              {isAutoScanning ? (
                <>
                  <LoadingSpinner size="sm" />
                  Scanning...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Auto-Scan {filters.institution}
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={handleTestFirecrawl}
              disabled={isTestingFirecrawl}
              className="gap-2"
            >
              {isTestingFirecrawl ? (
                <>
                  <LoadingSpinner size="sm" />
                  Testing...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" />
                  Test Firecrawl
                </>
              )}
            </Button>
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

        {/* Auto-Scan Progress Panel */}
        {(isAutoScanning || autoScanResult) && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Auto-Scan: {autoScanResult?.institution || filters.institution}
                </CardTitle>
                {autoScanResult && !isAutoScanning && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setAutoScanResult(null)}
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isAutoScanning ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-muted-foreground">
                      Running full pipeline (Crawl → Extract → Validate) for all URLs...
                    </span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              ) : autoScanResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium">
                      {autoScanResult.succeeded}/{autoScanResult.total} URLs processed
                    </span>
                    {autoScanResult.failed > 0 && (
                      <Badge variant="destructive">{autoScanResult.failed} failed</Badge>
                    )}
                    <Progress 
                      value={(autoScanResult.succeeded / autoScanResult.total) * 100} 
                      className="flex-1 h-2" 
                    />
                  </div>

                  {/* Results List */}
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {autoScanResult.results.map((result, i) => (
                      <div 
                        key={i}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          result.status === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(result.status)}
                          <span className="truncate">{new URL(result.url).pathname}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {result.page_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {result.confidence_score !== null && (
                            <span className={`text-xs font-medium ${
                              result.confidence_score >= 85 ? 'text-green-600' :
                              result.confidence_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              Score: {result.confidence_score}
                            </span>
                          )}
                          {result.action && (
                            <Badge variant={result.action === 'auto_approve' ? 'default' : 'secondary'}>
                              {result.action.replace('_', ' ')}
                            </Badge>
                          )}
                          {result.error && (
                            <span className="text-xs text-red-500 truncate max-w-32" title={result.error}>
                              {result.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Tabs: Scraper vs Review Queue */}
        <Tabs defaultValue="scraper" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="scraper" className="gap-2">
              <Database className="h-4 w-4" />
              Scraper
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Review Queue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review">
            <ReviewQueuePanel institution={filters.institution} />
          </TabsContent>

          <TabsContent value="scraper">
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
                  {jobs.map((job) => {
                    const jobStatus = jobContentStatus[job.id] || { hasContent: false, hasExtraction: false };
                    return (
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
                          <div className="flex items-center gap-2">
                            <StatusBadge status={job.status} />
                            <PipelineStatusBadges hasContent={jobStatus.hasContent} hasExtraction={jobStatus.hasExtraction} />
                          </div>
                          <SourceTypeBadge type={job.source_type} />
                        </div>
                        <p className="text-sm font-medium truncate mb-1">{truncateUrl(job.url)}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>P{job.priority}</span>
                            <span>•</span>
                            <span>{new Date(job.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5"
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(job.id, 'Job ID'); }}
                              title="Copy Job ID"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5"
                              onClick={(e) => { e.stopPropagation(); window.open(job.url, '_blank'); }}
                              title="Open URL"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {job.error_message && (
                          <p className="text-xs text-red-500 mt-1 truncate">{job.error_message}</p>
                        )}
                      </div>
                    );
                  })}
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedJob ? 'Content Inspector' : 'Select a Job'}
                </CardTitle>
                {selectedJob && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => loadContent(selectedJob.id)}
                    disabled={scraper.loading}
                    title="Refresh content"
                  >
                    <RefreshCw className={`h-3 w-3 ${scraper.loading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
              {/* Pipeline Status Chips */}
              {selectedJob && (
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Pipeline:</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      hasContent ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Database className="h-3 w-3" />
                      {hasContent ? 'Crawled' : 'Not crawled'}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      hasExtraction ? 'bg-purple-500/20 text-purple-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Brain className="h-3 w-3" />
                      {hasExtraction ? 'Extracted' : 'Not extracted'}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      content?.total_confidence_score && content.total_confidence_score >= 60 
                        ? 'bg-blue-500/20 text-blue-600' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <CheckCircle className="h-3 w-3" />
                      {content?.total_confidence_score && content.total_confidence_score >= 60 ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                </div>
              )}
              {selectedJob && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Crawl - only for uncrawled jobs */}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCrawl(selectedJob)}
                    disabled={scraper.loading || selectedJob.status === 'processing' || hasContent}
                    title={hasContent ? 'Already crawled - use Re-crawl to update' : 'Crawl this URL'}
                  >
                    <Play className="h-3 w-3 mr-1" /> {hasContent ? 'Crawled ✓' : 'Crawl'}
                  </Button>
                  
                  {/* Re-crawl - explicit destructive action with confirmation */}
                  {hasContent && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={scraper.loading || selectedJob.status === 'processing'}
                          title="Re-fetch and overwrite existing content"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Re-crawl
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Re-crawl this URL?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will overwrite the stored HTML and extracted text for this job.
                            <br /><br />
                            <strong>AI extraction data will be cleared</strong> — you'll need to run Extract again.
                            <br /><br />
                            Evidence from previous validations will remain unchanged.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRecrawl(selectedJob)}>
                            Re-crawl
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
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
                      {extraction && extraction.confidence && (
                        <div className="space-y-4">
                          {/* Confidence */}
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Confidence Score</p>
                            <ConfidenceDisplay score={extraction.total_score ?? 0} action={extraction.action ?? 'hold'} />
                            
                            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                              <div>Source: {extraction.confidence.source_authority ?? 0}/30</div>
                              <div>Language: {extraction.confidence.language_certainty ?? 0}/20</div>
                              <div>Agreement: {extraction.confidence.cross_source_agreement ?? 0}/20</div>
                              <div>Recency: {extraction.confidence.recency ?? 0}/15</div>
                              <div>Structure: {extraction.confidence.structural_consistency ?? 0}/10</div>
                              <div>AI: {extraction.confidence.ai_certainty ?? 0}/5</div>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Export (no admin protection for now - add back once roles are configured)
// -----------------------------------------------------------------------------
export default TransferScraperDashboardContent;
