/**
 * Admin Invariant Snapshot Drilldown Page
 * 
 * Displays template metadata, invariant decision snapshot, and "Why blocked?" explanations.
 * Uses get-invariant-snapshot edge function for data retrieval.
 * 
 * Route: /admin/template-validation/:templateId/invariants
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Copy, CheckCircle2, Clock, RefreshCw, AlertCircle, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ADMIN_ROUTES } from '@/lib/invariant/actionableFixes';
import { InvariantDecisionHeaderCard } from '@/components/admin/invariant/InvariantDecisionHeaderCard';
import { ViolationCodeChips } from '@/components/admin/invariant/ViolationCodeChips';
import { InvariantExplainerPanel } from '@/components/admin/invariant/InvariantExplainerPanel';
import { EffectiveConfigViewer } from '@/components/admin/invariant/EffectiveConfigViewer';
import { 
  getInvariantSnapshot, 
  rerunTemplateInvariants,
  type SnapshotDrilldownResponse, 
  type SnapshotClientError 
} from '@/lib/admin/invariantSnapshotClient';

// ============================================
// TYPES
// ============================================

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ============================================
// COMPONENT
// ============================================

export default function InvariantSnapshotDrilldown() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Abort controller ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Data state
  const [data, setData] = useState<SnapshotDrilldownResponse | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<SnapshotClientError | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);

  // URL is single source of truth for selected code
  const invariantVersion = searchParams.get('invariant_version');
  const selectedCode = searchParams.get('code');

  // Selection handler - updates URL only
  const handleSelectCode = useCallback((code: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (code) {
      newParams.set('code', code);
    } else {
      newParams.delete('code');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch data
  const fetchSnapshot = useCallback(async () => {
    if (!templateId) return;

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingState('loading');
    setError(null);

    const { data: responseData, error: fetchError } = await getInvariantSnapshot(
      templateId,
      invariantVersion,
      controller.signal
    );

    // Ignore aborted requests
    if (fetchError?.type === 'aborted') {
      return;
    }

    if (fetchError) {
      setError(fetchError);
      setLoadingState('error');
      return;
    }

    setData(responseData);
    setLoadingState('success');

    // Auto-select first violation if decision is warn/block and no code selected
    const snapshot = responseData?.snapshot;
    if (snapshot && (snapshot.decision === 'warn' || snapshot.decision === 'block')) {
      if (!selectedCode && snapshot.violation_codes.length > 0) {
        handleSelectCode(snapshot.violation_codes[0]);
      }
    }
  }, [templateId, invariantVersion, selectedCode, handleSelectCode]);

  // Fetch on mount and when deps change
  useEffect(() => {
    fetchSnapshot();

    // Cleanup: abort on unmount
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchSnapshot]);

  // Copy snapshot JSON
  const handleCopySnapshot = useCallback(() => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success('Snapshot JSON copied to clipboard');
    }
  }, [data]);

  // Remove invariant_version param to view latest
  const handleViewLatest = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('invariant_version');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Rerun invariants handler
  const handleRerunInvariants = useCallback(async () => {
    if (!templateId || rerunLoading) return;
    
    setRerunLoading(true);
    const { data: result, error: rerunError } = await rerunTemplateInvariants(templateId);
    setRerunLoading(false);

    if (rerunError) {
      toast.error(rerunError.message);
      return;
    }

    if (result) {
      toast.success(`Invariants re-evaluated: ${result.decision}`);
      // Navigate to latest (remove version param) and refetch
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('invariant_version');
      // Keep code selection if still valid
      if (selectedCode && result.violation_codes.includes(selectedCode)) {
        newParams.set('code', selectedCode);
      } else if (result.violation_codes.length > 0) {
        newParams.set('code', result.violation_codes[0]);
      } else {
        newParams.delete('code');
      }
      setSearchParams(newParams);
      fetchSnapshot();
    }
  }, [templateId, rerunLoading, searchParams, selectedCode, setSearchParams, fetchSnapshot]);

  // ============================================
  // RENDER: Loading
  // ============================================
  if (loadingState === 'loading' || loadingState === 'idle') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Error states
  // ============================================
  if (loadingState === 'error' && error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to={ADMIN_ROUTES.templateValidation}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Template Validation
          </Link>
        </Button>

        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {error.type === 'auth' ? 'Access Denied' : 
             error.type === 'not_found' ? 'Not Found' : 
             'Error'}
          </AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button onClick={fetchSnapshot} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          
          {error.type === 'not_found' && invariantVersion && (
            <Button onClick={handleViewLatest}>
              View Latest Snapshot
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: No data fallback
  // ============================================
  if (!data) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>Unable to load snapshot data.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { template, snapshot, job } = data;
  const fixContext = {
    templateId: template.id,
    institutionCode: template.institution_code,
    programCode: template.program_slug,
    jobId: job?.id,
  };

  // ============================================
  // RENDER: Main content
  // ============================================
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link to={ADMIN_ROUTES.templateValidation}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Template Validation
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleRerunInvariants}
            disabled={rerunLoading}
          >
            {rerunLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Re-run Invariants
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopySnapshot}>
            <Copy className="h-4 w-4 mr-2" />
            Copy JSON
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSnapshot}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Header Summary Card */}
      <InvariantDecisionHeaderCard
        template={template}
        snapshot={snapshot}
        job={job}
        className="mb-6"
      />

      {/* Empty state: No snapshot */}
      {!snapshot && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Snapshot Recorded</h3>
            <p className="text-muted-foreground mb-4">
              This template has not been evaluated by the invariant system yet.
            </p>
            <Button asChild>
              <Link to={`${ADMIN_ROUTES.generationJobs}?template_id=${template.id}`}>
                <RefreshCw className="h-4 w-4 mr-2" />
                View Generation Jobs
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main content: has snapshot */}
      {snapshot && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: Violations + Explainer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Violations Panel */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-1">Violation Codes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {snapshot.violation_codes.length === 0
                    ? 'No violations detected'
                    : `${snapshot.violation_codes.length} violation${snapshot.violation_codes.length > 1 ? 's' : ''} found`}
                </p>
                {snapshot.violation_codes.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>All invariants passed</span>
                  </div>
                ) : (
                  <ViolationCodeChips
                    codes={snapshot.violation_codes}
                    selectedCode={selectedCode}
                    onSelectCode={handleSelectCode}
                  />
                )}
              </div>
            </Card>

            {/* Why Blocked Explainer Panel */}
            {selectedCode && (
              <InvariantExplainerPanel
                code={selectedCode}
                context={fixContext}
                onClose={() => handleSelectCode(null)}
              />
            )}
          </div>

          {/* Right column: Effective Config */}
          <div>
            <EffectiveConfigViewer config={snapshot.effective_config} />
          </div>
        </div>
      )}
    </div>
  );
}
