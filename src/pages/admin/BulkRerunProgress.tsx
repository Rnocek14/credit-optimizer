/**
 * Bulk Rerun Progress Page
 * 
 * Shows real-time progress of a bulk rerun job.
 * Polls status and triggers worker batches automatically.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { 
  getBulkRerunJob, 
  triggerBulkRerunWorker,
  type BulkRerunJobStatus 
} from '@/lib/admin/invariantSnapshotClient';
import { useToast } from '@/hooks/use-toast';
import { ADMIN_ROUTES } from '@/lib/invariant/actionableFixes';

const POLL_INTERVAL_MS = 2500;
const BATCH_SIZE = 10;

const BulkRerunProgress: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [jobStatus, setJobStatus] = useState<BulkRerunJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false); // Ref lock to prevent overlapping worker calls
  const { toast } = useToast();

  // Returns the fetched status for use in the polling loop (avoids stale closure)
  const fetchStatus = useCallback(async (): Promise<BulkRerunJobStatus | null> => {
    if (!jobId) return null;

    const { data, error: fetchError } = await getBulkRerunJob(jobId);
    
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return null;
    }

    if (data) {
      setJobStatus(data);
      setLoading(false);
      return data;
    }
    return null;
  }, [jobId]);

  // Uses ref lock to prevent overlapping worker calls (React state is async)
  const triggerWorker = useCallback(async () => {
    if (!jobId || processingRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const { error: workerError } = await triggerBulkRerunWorker(jobId, BATCH_SIZE);
      if (workerError) {
        console.error('[BulkRerunProgress] Worker error:', workerError.message);
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [jobId]);

  // Polling effect - uses returned status to avoid stale closure issues
  useEffect(() => {
    let timer: number | null = null;

    const tick = async () => {
      const status = await fetchStatus();
      if (!status) return;

      // Stop polling if job is terminal
      const terminal = 
        status.job.status === 'succeeded' ||
        status.job.status === 'failed' ||
        status.job.status === 'canceled';

      if (terminal) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        // Show completion toast
        if (status.job.status === 'succeeded') {
          toast({
            title: 'Bulk rerun complete',
            description: `${status.job.succeeded} succeeded, ${status.job.failed} failed`,
          });
        }
        return;
      }

      // Clamp to prevent negative remaining if counters drift
      const remaining = Math.max(0, status.job.total - status.job.processed);

      // Only trigger worker if job is active and has remaining work
      const isActive = status.job.status === 'queued' || status.job.status === 'running';
      if (isActive && remaining > 0) {
        await triggerWorker();
      }
    };

    // Initial tick
    tick();

    // Start polling (only depends on stable refs, not on jobStatus state)
    timer = window.setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [fetchStatus, triggerWorker, toast]);


  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !jobStatus) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-medium">Failed to load job</p>
              <p className="text-muted-foreground">{error || 'Job not found'}</p>
              <Button asChild className="mt-4">
                <Link to="/admin/templates/validation">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Validation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { job, progress_percent, recent_failures } = jobStatus;
  const isActive = job.status === 'queued' || job.status === 'running';
  const isComplete = job.status === 'succeeded';
  const isFailed = job.status === 'failed';

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/templates/validation">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bulk Rerun Progress</h1>
            <p className="text-muted-foreground text-sm font-mono">{job.id}</p>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isActive && <Loader2 className="h-5 w-5 animate-spin" />}
            {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isFailed && <XCircle className="h-5 w-5 text-destructive" />}
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>{job.processed} / {job.total} templates</span>
            <span className="font-bold">{progress_percent}%</span>
          </div>
          <Progress value={progress_percent} className="h-3" />
          
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{job.succeeded}</div>
              <div className="text-sm text-muted-foreground">Succeeded</div>
            </div>
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{job.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{job.total - job.processed}</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Info */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Filter:</span>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(job.filter, null, 2)}
              </pre>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div>{new Date(job.created_at).toLocaleString()}</div>
              </div>
              {job.started_at && (
                <div>
                  <span className="text-muted-foreground">Started:</span>
                  <div>{new Date(job.started_at).toLocaleString()}</div>
                </div>
              )}
              {job.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <div>{new Date(job.completed_at).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Failures */}
      {recent_failures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Recent Failures ({recent_failures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recent_failures.map((failure) => (
                <div 
                  key={failure.id}
                  className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm truncate">{failure.template_id}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {failure.last_error || 'Unknown error'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={ADMIN_ROUTES.templateInvariants.replace(':templateId', failure.template_id)}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {isActive && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Processing batch...' : 'Auto-processing every 2.5s'}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={triggerWorker}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Process Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'queued':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Queued
        </Badge>
      );
    case 'running':
      return (
        <Badge className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20" variant="outline">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case 'succeeded':
      return (
        <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20" variant="outline">
          <CheckCircle className="h-3 w-3" />
          Succeeded
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case 'canceled':
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Canceled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default BulkRerunProgress;
