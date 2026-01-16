import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Play, 
  RefreshCw, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface GenerationJob {
  id: string;
  institution: string;
  program_code: string | null;
  pack_id: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  priority: number;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  locked_by: string | null;
  run_after: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  templates_created: number | null;
  templates_updated: number | null;
}

const statusConfig: Record<GenerationJob['status'], { icon: typeof Clock; label: string; className: string; animate?: boolean }> = {
  queued: { icon: Clock, label: 'Queued', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  running: { icon: Loader2, label: 'Running', className: 'bg-amber-100 text-amber-800 border-amber-200', animate: true },
  succeeded: { icon: CheckCircle, label: 'Succeeded', className: 'bg-green-100 text-green-800 border-green-200' },
  failed: { icon: XCircle, label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200' },
  canceled: { icon: AlertTriangle, label: 'Canceled', className: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status }: { status: GenerationJob['status'] }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className={`h-3 w-3 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

export default function GenerationJobs() {
  const queryClient = useQueryClient();
  const [processingAll, setProcessingAll] = useState(false);

  // Fetch jobs
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['template-generation-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_generation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data ?? []) as GenerationJob[];
    },
    refetchInterval: 5000, // Poll every 5s for running jobs
  });

  // Process worker mutation
  const processWorkerMutation = useMutation({
    mutationFn: async (params: { job_id?: string; batch_size?: number }) => {
      const { data, error } = await supabase.functions.invoke('template-job-processor', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processed ${data.processed ?? 1} jobs: ${data.succeeded ?? 0} succeeded`);
      queryClient.invalidateQueries({ queryKey: ['template-generation-jobs'] });
    },
    onError: (error: Error) => {
      toast.error(`Worker failed: ${error.message}`);
    },
  });

  // Retry failed job
  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('template_generation_jobs')
        .update({
          status: 'queued',
          attempt_count: 0,
          last_error: null,
          run_after: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Job reset for retry');
      queryClient.invalidateQueries({ queryKey: ['template-generation-jobs'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });

  const handleRunWorker = async () => {
    setProcessingAll(true);
    try {
      await processWorkerMutation.mutateAsync({ batch_size: 5 });
    } finally {
      setProcessingAll(false);
    }
  };

  // Summary stats
  const stats = {
    total: jobs.length,
    queued: jobs.filter(j => j.status === 'queued').length,
    running: jobs.filter(j => j.status === 'running').length,
    succeeded: jobs.filter(j => j.status === 'succeeded').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template Generation Jobs</h1>
          <p className="text-muted-foreground">
            Monitor and manage template generation jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleRunWorker} 
            disabled={processingAll || stats.queued === 0}
          >
            {processingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Worker
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Jobs</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">{stats.queued}</div>
            <p className="text-xs text-blue-600">Queued</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-700">{stats.running}</div>
            <p className="text-xs text-amber-600">Running</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">{stats.succeeded}</div>
            <p className="text-xs text-green-600">Succeeded</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
            <p className="text-xs text-red-600">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>
            Recent template generation jobs. Jobs are automatically retried on failure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jobs found. Promote a policy pack to create generation jobs.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    job.status === 'failed' ? 'bg-red-50/30 border-red-200' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">
                        {job.institution}
                        {job.program_code && (
                          <span className="text-muted-foreground ml-2">
                            / {job.program_code}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {job.status === 'failed' && job.last_error && (
                          <span className="text-red-600">{job.last_error}</span>
                        )}
                        {job.status === 'succeeded' && (
                          <span className="text-green-600">
                            Created: {job.templates_created ?? 0} | Updated: {job.templates_updated ?? 0}
                          </span>
                        )}
                        {job.status === 'queued' && (
                          <span>
                            Attempt {job.attempt_count}/{job.max_attempts} • Priority: {job.priority}
                          </span>
                        )}
                        {job.status === 'running' && job.locked_by && (
                          <span>Worker: {job.locked_by}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(job.updated_at).toLocaleString()}
                    </div>
                    
                    <StatusBadge status={job.status} />

                    {job.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryMutation.mutate(job.id)}
                        disabled={retryMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}

                    {job.status === 'queued' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processWorkerMutation.mutate({ job_id: job.id })}
                        disabled={processWorkerMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Run
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
