import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PolicyRefreshRunsListProps {
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}

interface BatchRun {
  id: string;
  created_at: string;
  status: string;
  run_type: string;
  tier: string | null;
  institutions_count: number | null;
  urls_count: number | null;
  summary: {
    task_summary?: {
      complete?: number;
      blocked?: number;
      failed?: number;
      pending?: number;
    };
  } | null;
}

export function PolicyRefreshRunsList({ selectedRunId, onSelectRun }: PolicyRefreshRunsListProps) {
  const { data: runs, isLoading, refetch } = useQuery({
    queryKey: ['policy-refresh-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_batch_runs')
        .select('id, created_at, status, run_type, tier, institutions_count, urls_count, summary')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as BatchRun[];
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTaskSummary = (run: BatchRun) => {
    const summary = run.summary?.task_summary;
    if (!summary) return null;
    
    return (
      <div className="flex gap-1 mt-1">
        {summary.complete && summary.complete > 0 && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/30">
            {summary.complete} ✓
          </Badge>
        )}
        {summary.blocked && summary.blocked > 0 && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            {summary.blocked} blocked
          </Badge>
        )}
        {summary.failed && summary.failed > 0 && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-red-500/10 text-red-600 border-red-500/30">
            {summary.failed} failed
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col border-r">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Runs</h2>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : runs?.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No runs found</div>
        ) : (
          <div className="p-2 space-y-1">
            {runs?.map((run) => (
              <button
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  selectedRunId === run.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(run.status)}
                    <span className="text-xs font-mono text-muted-foreground">
                      {run.id.slice(0, 8)}
                    </span>
                  </div>
                  {run.tier && (
                    <Badge variant="secondary" className="text-[10px]">
                      {run.tier}
                    </Badge>
                  )}
                </div>
                
                <div className="mt-1 text-sm">
                  {run.run_type === 'full_refresh' ? 'Full Refresh' : 
                   run.run_type === 'single_institution' ? 'Single' : run.run_type}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                </div>

                {getTaskSummary(run)}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
