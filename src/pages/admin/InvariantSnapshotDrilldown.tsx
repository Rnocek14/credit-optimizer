/**
 * Admin Invariant Snapshot Drilldown Page
 * 
 * Displays template metadata, invariant decision snapshot, and "Why blocked?" explanations.
 * Uses get-invariant-snapshot edge function for data retrieval.
 * 
 * Route: /admin/template-validation/:templateId/invariants
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Copy, CheckCircle2, Clock, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_ROUTES } from '@/lib/invariant/actionableFixes';
import { InvariantDecisionHeaderCard } from '@/components/admin/invariant/InvariantDecisionHeaderCard';
import { ViolationCodeChips } from '@/components/admin/invariant/ViolationCodeChips';
import { InvariantExplainerPanel } from '@/components/admin/invariant/InvariantExplainerPanel';
import { EffectiveConfigViewer } from '@/components/admin/invariant/EffectiveConfigViewer';

// ============================================
// TYPES
// ============================================

interface SnapshotDrilldownResponse {
  template: {
    id: string;
    institution_code: string;
    program_slug: string;
    track: string;
    generated_at: string | null;
    template_status?: string;
  };
  snapshot: {
    id: string;
    job_id: string | null;
    template_status: string;
    invariant_version: string;
    effective_config: Record<string, unknown>;
    decision: 'pass' | 'warn' | 'block';
    violation_codes: string[];
    created_at: string;
  } | null;
  job: {
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  } | null;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface DrilldownError {
  type: 'auth' | 'not_found' | 'server' | 'network';
  message: string;
  status?: number;
}

// ============================================
// COMPONENT
// ============================================

export default function InvariantSnapshotDrilldown() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Data state
  const [data, setData] = useState<SnapshotDrilldownResponse | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<DrilldownError | null>(null);

  // UI state
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Query params
  const invariantVersion = searchParams.get('invariant_version');
  const codeParam = searchParams.get('code');

  // Fetch data
  const fetchSnapshot = useCallback(async () => {
    if (!templateId) return;

    setLoadingState('loading');
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError({ type: 'auth', message: 'Please log in to access this page' });
        setLoadingState('error');
        return;
      }

      const queryParams = new URLSearchParams({ template_id: templateId });
      if (invariantVersion) {
        queryParams.append('invariant_version', invariantVersion);
      }

      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        'get-invariant-snapshot',
        { body: { template_id: templateId, invariant_version: invariantVersion || undefined } }
      );

      if (fnError) {
        // Parse error response
        const errBody = (fnError as any).context?.json;
        const status = errBody?.status || 500;
        
        if (status === 401 || status === 403) {
          setError({ type: 'auth', message: errBody?.error || 'Admin access required', status });
        } else if (status === 404) {
          setError({ 
            type: 'not_found', 
            message: errBody?.error || 'Snapshot not found', 
            status 
          });
        } else {
          setError({ 
            type: 'server', 
            message: errBody?.error || fnError.message || 'Server error', 
            status 
          });
        }
        setLoadingState('error');
        return;
      }

      setData(responseData as SnapshotDrilldownResponse);
      setLoadingState('success');

      // Auto-select first violation if decision is warn/block
      const snapshot = (responseData as SnapshotDrilldownResponse).snapshot;
      if (snapshot && (snapshot.decision === 'warn' || snapshot.decision === 'block')) {
        const firstCode = codeParam || snapshot.violation_codes[0];
        if (firstCode) {
          setSelectedCode(firstCode);
        }
      }
    } catch (err) {
      console.error('[InvariantDrilldown] Fetch error:', err);
      setError({ type: 'network', message: 'Failed to connect to server' });
      setLoadingState('error');
    }
  }, [templateId, invariantVersion, codeParam]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // Sync selectedCode with URL
  useEffect(() => {
    if (selectedCode) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('code', selectedCode);
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedCode, searchParams, setSearchParams]);

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
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-run Generation
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
              <CardHeader>
                <CardTitle className="text-lg">Violation Codes</CardTitle>
                <CardDescription>
                  {snapshot.violation_codes.length === 0
                    ? 'No violations detected'
                    : `${snapshot.violation_codes.length} violation${snapshot.violation_codes.length > 1 ? 's' : ''} found`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {snapshot.violation_codes.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>All invariants passed</span>
                  </div>
                ) : (
                  <ViolationCodeChips
                    codes={snapshot.violation_codes}
                    selectedCode={selectedCode}
                    onSelectCode={setSelectedCode}
                  />
                )}
              </CardContent>
            </Card>

            {/* Why Blocked Explainer Panel */}
            {selectedCode && (
              <InvariantExplainerPanel
                code={selectedCode}
                context={fixContext}
                onClose={() => setSelectedCode(null)}
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
