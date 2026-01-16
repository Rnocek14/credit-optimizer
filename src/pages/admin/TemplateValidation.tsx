/**
 * Admin Template Validation Page
 * 
 * Shows validation status for all marketplace templates
 * with pass/fail indicators, detailed metrics, and invariant snapshot status.
 * 
 * Model A: Page templates first, then fetch snapshots for visible templates only.
 * This ensures "Pending" means "no snapshot exists" not "not in current fetch page".
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Building2,
  Layers,
  ExternalLink,
  HelpCircle,
  Clock,
  Search,
  Loader2,
  Play,
} from 'lucide-react';
import marketplaceTemplates from '@/fixtures/templates/marketplace-v1-templates.json';
import { auditAllTemplates, generateAuditReport, getFixSuggestions, TemplateAuditResult, AuditSummary } from '@/pages/EduTree/v5/utils/templateAudit';
import { ADMIN_ROUTES } from '@/lib/invariant/actionableFixes';
import { 
  listInvariantSnapshots, 
  rerunTemplateInvariants,
  createBulkRerunJob,
  type SnapshotSummary,
  type ListSnapshotsParams 
} from '@/lib/admin/invariantSnapshotClient';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';
import { BulkRerunModal } from '@/components/admin/BulkRerunModal';

// ============================================
// CONSTANTS
// ============================================

const PAGE_SIZE = 50;

// ============================================
// TYPES
// ============================================

interface SnapshotMap {
  [templateId: string]: SnapshotSummary;
}

type AuditFilter = 'all' | 'passing' | 'failing';

// ============================================
// MAIN COMPONENT
// ============================================

const TemplateValidation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [snapshotMap, setSnapshotMap] = useState<SnapshotMap>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rerunLoading, setRerunLoading] = useState<Record<string, boolean>>({});
  const [bulkRerunModalOpen, setBulkRerunModalOpen] = useState(false);
  const [bulkRerunLoading, setBulkRerunLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // URL-driven state
  const auditFilter = (searchParams.get('status') as AuditFilter) || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Step 1: Get all audit results from templates
  const { results, summary } = useMemo(() => {
    return auditAllTemplates(marketplaceTemplates as any[]);
  }, []);

  // Step 2: Filter by search term (client-side)
  const searchFilteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(r => 
      r.label.toLowerCase().includes(term) ||
      r.anchorSchool.toLowerCase().includes(term) ||
      r.templateId.toLowerCase().includes(term)
    );
  }, [results, searchTerm]);

  // Step 3: Filter by audit status (client-side)
  const filteredResults = useMemo(() => {
    if (auditFilter === 'all') return searchFilteredResults;
    if (auditFilter === 'passing') return searchFilteredResults.filter(r => r.passesAll);
    return searchFilteredResults.filter(r => !r.passesAll);
  }, [searchFilteredResults, auditFilter]);

  // Step 4: Paginate templates (client-side)
  const totalTemplates = filteredResults.length;
  const totalPages = Math.max(1, Math.ceil(totalTemplates / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalTemplates);
  const visibleTemplates = filteredResults.slice(startIndex, endIndex);

  // Step 5: Fetch snapshots ONLY for visible templates
  const fetchSnapshotsForVisibleTemplates = useCallback(async () => {
    if (visibleTemplates.length === 0) {
      setSnapshotMap({});
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Clear previous snapshot data immediately when starting new fetch
    // This ensures "Loaded snapshots: X / Y" is always accurate for current page
    setSnapshotMap({});
    setSnapshotsLoading(true);
    setSnapshotError(null);
    
    // Only request snapshots for templates visible on this page
    // When using template_ids, set high limit to get all matching IDs
    const templateIds = visibleTemplates.map(r => r.templateId);
    
    const params: ListSnapshotsParams = {
      template_ids: templateIds,
      limit: 200, // High limit when filtering by IDs - ensures we get all
      offset: 0,
    };

    const { data, error } = await listInvariantSnapshots(params, controller.signal);

    if (error?.type === 'aborted') return;

    if (error) {
      setSnapshotError(error.message);
      setSnapshotsLoading(false);
      return;
    }

    if (data?.snapshots) {
      const map: SnapshotMap = {};
      for (const s of data.snapshots) {
        map[s.template_id] = s;
      }
      setSnapshotMap(map);
    }
    
    setSnapshotsLoading(false);
  }, [visibleTemplates]);

  useEffect(() => {
    fetchSnapshotsForVisibleTemplates();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchSnapshotsForVisibleTemplates]);

  // URL update helpers
  const setAuditFilter = (status: AuditFilter) => {
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const setPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(page));
    setSearchParams(newParams);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Reset to page 1 when search changes
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const toggleExpanded = (id: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle rerun invariants for a specific template
  const handleRerun = async (templateId: string) => {
    setRerunLoading(prev => ({ ...prev, [templateId]: true }));
    
    try {
      const result = await rerunTemplateInvariants(templateId);
      
      if (result.error) {
        toast({
          title: 'Rerun failed',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      if (result.data) {
        toast({
          title: `Invariants: ${result.data.decision.toUpperCase()}`,
          description: `${result.data.violation_codes.length} violations found`,
          variant: result.data.decision === 'block' ? 'destructive' : 'default',
        });

        // Refresh snapshots for visible templates
        await fetchSnapshotsForVisibleTemplates();
      }
    } catch (err) {
      toast({
        title: 'Rerun failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRerunLoading(prev => ({ ...prev, [templateId]: false }));
    }
  };
  
  // Handle bulk rerun
  const handleBulkRerun = async () => {
    setBulkRerunLoading(true);
    try {
      const { data, error } = await createBulkRerunJob({ decision: 'block' });
      if (error) {
        toast({ title: 'Failed to start bulk rerun', description: error.message, variant: 'destructive' });
        return;
      }
      if (data?.job_id) {
        setBulkRerunModalOpen(false);
        navigate(ADMIN_ROUTES.bulkRerunProgress.replace(':jobId', data.job_id));
      }
    } finally {
      setBulkRerunLoading(false);
    }
  };
  
  const downloadReport = () => {
    const report = generateAuditReport(marketplaceTemplates as any[]);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-audit-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const passRate = summary.totalTemplates > 0 
    ? Math.round((summary.passingTemplates / summary.totalTemplates) * 100) 
    : 0;

  // Count invariant decisions for VISIBLE templates only
  const invariantCounts = useMemo(() => {
    const counts = { pass: 0, warn: 0, block: 0, pending: 0 };
    for (const result of visibleTemplates) {
      const snapshot = snapshotMap[result.templateId];
      if (!snapshot) {
        counts.pending++;
      } else if (snapshot.decision === 'pass') {
        counts.pass++;
      } else if (snapshot.decision === 'warn') {
        counts.warn++;
      } else {
        counts.block++;
      }
    }
    return counts;
  }, [visibleTemplates, snapshotMap]);

  const hasNextPage = safeCurrentPage < totalPages;
  const hasPrevPage = safeCurrentPage > 1;
  
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Template Validation
          </h1>
          <p className="text-muted-foreground">
            Ensure all marketplace templates lead to graduation
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={() => setBulkRerunModalOpen(true)}
            disabled={invariantCounts.block === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Bulk Rerun BLOCK ({invariantCounts.block})
          </Button>
          <Button variant="outline" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>

        <BulkRerunModal
          open={bulkRerunModalOpen}
          onOpenChange={setBulkRerunModalOpen}
          decision="block"
          templateCount={invariantCounts.block}
          onConfirm={handleBulkRerun}
          isLoading={bulkRerunLoading}
        />
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{summary.totalTemplates}</div>
                <div className="text-sm text-muted-foreground">Total Templates</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.passingTemplates}</div>
                <div className="text-sm text-muted-foreground">Passing</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-2xl font-bold text-destructive">{summary.failingTemplates}</div>
                <div className="text-sm text-muted-foreground">Failing</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-2xl font-bold text-amber-600">{summary.warningsOnly}</div>
                <div className="text-sm text-muted-foreground">Warnings Only</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invariant Status Summary (for visible page) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Invariant Snapshot Status (this page)
            {snapshotsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="h-3 w-3" />
              {invariantCounts.pass} Pass
            </Badge>
            <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <AlertTriangle className="h-3 w-3" />
              {invariantCounts.warn} Warn
            </Badge>
            <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/20">
              <XCircle className="h-3 w-3" />
              {invariantCounts.block} Block
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {invariantCounts.pending} Pending
            </Badge>
          </div>
          {snapshotError && (
            <div className="mt-2 text-sm text-destructive">
              Error loading snapshots: {snapshotError}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Loaded snapshots: {Object.keys(snapshotMap).length} / {visibleTemplates.length} templates on this page
            {' '}• Total filtered: {totalTemplates}
          </p>
        </CardContent>
      </Card>
      
      {/* Pass Rate Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Pass Rate</span>
            <span className="text-lg font-bold">{passRate}%</span>
          </div>
          <Progress value={passRate} className="h-3" />
        </CardContent>
      </Card>
      
      {/* By School */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            By School
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.bySchool).map(([school, stats]) => (
              <div key={school} className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="font-bold">{school}</div>
                <div className="text-sm text-muted-foreground">
                  {stats.passing}/{stats.total} passing
                </div>
                <Progress 
                  value={(stats.passing / stats.total) * 100} 
                  className="h-2 mt-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Common Issues */}
      {summary.commonIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.commonIssues.slice(0, 8).map(issue => (
                <Badge 
                  key={issue.code} 
                  variant={issue.code.includes('SHORTFALL') ? 'destructive' : 'secondary'}
                >
                  {issue.code}: {issue.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Template List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>All Templates</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              
              {/* Audit Status Filter */}
              <Select 
                value={auditFilter} 
                onValueChange={(v) => setAuditFilter(v as AuditFilter)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="passing">Passing</SelectItem>
                  <SelectItem value="failing">Failing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found matching your filters.
            </div>
          ) : (
            visibleTemplates.map(result => (
              <TemplateRow 
                key={result.templateId}
                result={result}
                snapshot={snapshotMap[result.templateId]}
                snapshotsLoading={snapshotsLoading}
                isExpanded={expandedTemplates.has(result.templateId)}
                onToggle={() => toggleExpanded(result.templateId)}
                onRerun={() => handleRerun(result.templateId)}
                rerunLoading={rerunLoading[result.templateId] || false}
              />
            ))
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {safeCurrentPage} of {totalPages} ({totalTemplates} templates)
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(safeCurrentPage - 1)}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(safeCurrentPage + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// TEMPLATE ROW COMPONENT
// ============================================

interface TemplateRowProps {
  result: TemplateAuditResult;
  snapshot?: SnapshotSummary;
  snapshotsLoading: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onRerun: () => void;
  rerunLoading: boolean;
}

function InvariantBadge({ 
  snapshot, 
  loading 
}: { 
  snapshot?: SnapshotSummary; 
  loading: boolean; 
}) {
  if (loading) {
    return (
      <Badge variant="secondary" className="gap-1 animate-pulse">
        <Clock className="h-3 w-3" />
        ...
      </Badge>
    );
  }

  if (!snapshot) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }

  switch (snapshot.decision) {
    case 'pass':
      return (
        <Badge className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" variant="outline">
          <CheckCircle className="h-3 w-3" />
          Pass
        </Badge>
      );
    case 'warn':
      return (
        <Badge className="gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" variant="outline">
          <AlertTriangle className="h-3 w-3" />
          Warn
        </Badge>
      );
    case 'block':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Block
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Unknown
        </Badge>
      );
  }
}

const TemplateRow: React.FC<TemplateRowProps> = ({ 
  result, 
  snapshot, 
  snapshotsLoading,
  isExpanded, 
  onToggle,
  onRerun,
  rerunLoading,
}) => {
  const suggestions = getFixSuggestions(result);
  const m = result.validation.metrics;

  // Build drilldown URL
  const drilldownUrl = snapshot 
    ? `${ADMIN_ROUTES.templateInvariants.replace(':templateId', result.templateId)}${
        snapshot.violation_codes.length > 0 
          ? `?code=${snapshot.violation_codes[0]}` 
          : ''
      }`
    : ADMIN_ROUTES.templateInvariants.replace(':templateId', result.templateId);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer">
          <div className="flex items-center gap-3">
            {result.passesAll ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <div className="font-medium">{result.label}</div>
              <div className="text-sm text-muted-foreground">
                {result.anchorSchool} • {result.optimization}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Invariant badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div onClick={(e) => e.stopPropagation()}>
                    <InvariantBadge snapshot={snapshot} loading={snapshotsLoading} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {snapshot ? (
                    <div className="text-xs">
                      <div>{snapshot.violation_count} violations</div>
                      <div className="text-muted-foreground">
                        v{snapshot.invariant_version} • {new Date(snapshot.created_at).toLocaleDateString()}
                      </div>
                      {snapshot.institution_code && (
                        <div className="text-muted-foreground">
                          {snapshot.institution_code}{snapshot.track ? ` • ${snapshot.track}` : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>No snapshot recorded yet</span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="text-right">
              <div className="text-sm font-medium">{m.totalCredits}/120 cr</div>
              <div className="text-xs text-muted-foreground">
                {result.errorCount} errors, {result.warningCount} warnings
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-8 mt-2 p-4 bg-background border rounded-lg space-y-4">
          {/* Invariant Actions */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Invariant Details</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onRerun();
                }}
                disabled={rerunLoading || snapshotsLoading}
              >
                {rerunLoading ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                )}
                Re-run
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={drilldownUrl}>
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  {snapshot?.decision === 'block' || snapshot?.decision === 'warn' 
                    ? 'Why blocked?' 
                    : 'View Invariants'}
                </Link>
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">University Credits</div>
              <div className="font-medium">{m.universityCredits}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Upper-Division</div>
              <div className="font-medium">{m.upperDivCredits}</div>
            </div>
            <div>
              <div className="text-muted-foreground">MOOC Credits</div>
              <div className="font-medium">{m.moocCredits}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Modules Filled</div>
              <div className="font-medium">{m.filledModules}/{m.moduleCount}</div>
            </div>
          </div>
          
          {/* Provider Breakdown */}
          {Object.keys(m.creditsByProvider).length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Credits by Provider</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(m.creditsByProvider).map(([provider, credits]) => (
                  <Badge key={provider} variant="outline">
                    {provider}: {credits}cr
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Gen-Ed Breakdown */}
          {Object.keys(m.genedCreditsByCategory).length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Gen-Ed by Category</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(m.genedCreditsByCategory).map(([cat, credits]) => (
                  <Badge key={cat} variant="outline">
                    {cat}: {credits}cr
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Issues */}
          {result.validation.issues.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Issues</div>
              <div className="space-y-1">
                {result.validation.issues.map((issue, idx) => (
                  <div 
                    key={idx}
                    className={`text-sm p-2 rounded ${
                      issue.type === 'error' 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-amber-500/10 text-amber-700'
                    }`}
                  >
                    <span className="font-medium">[{issue.code}]</span> {issue.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Fix Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Suggested Fixes</div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TemplateValidation;
