import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGenerateTemplatesAfterPromote } from '@/hooks/useGenerateTemplatesAfterPromote';
import { 
  CheckCircle, XCircle, AlertTriangle, Clock, Eye, 
  ArrowUpCircle, Filter 
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Normalize status values (DB uses 'complete', some code expects 'completed')
const normalizeStatus = (s?: string | null): string => 
  s === 'completed' ? 'complete' : s ?? 'unknown';

interface PolicyRefreshRunDetailProps {
  runId: string;
  onReviewInstitution: (institution: string) => void;
}

interface RefreshTask {
  institution: string;
  status: string;
  reason: string | null;
  metrics: {
    merge_score?: number;
    trust_tier?: string;
    templates_scanned?: number;
    succeeded?: number;
    failed?: number;
    elapsed_ms?: number;
  } | null;
  started_at: string | null;
  completed_at: string | null;
}

interface PolicyPack {
  id: string;
  institution: string;
  status: string;
  blocked_reason: string | null;
  confidence_score: number | null;
  pack_scope: string | null;
  provenance_url: string | null;
}

type FilterStatus = 'all' | 'complete' | 'blocked' | 'failed' | 'queued';

export function PolicyRefreshRunDetail({ runId, onReviewInstitution }: PolicyRefreshRunDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const generateTemplates = useGenerateTemplatesAfterPromote();

  // Fetch tasks for this run
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['policy-refresh-tasks', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_refresh_tasks')
        .select('institution, status, reason, metrics, started_at, completed_at')
        .eq('run_id', runId)
        .order('institution');

      if (error) throw error;
      return (data || []) as RefreshTask[];
    },
  });

  // Fetch policy packs for this run
  const { data: packs, isLoading: packsLoading } = useQuery({
    queryKey: ['policy-packs', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_policy_packs')
        .select('id, institution, status, blocked_reason, confidence_score, pack_scope, provenance_url')
        .eq('last_run_id', runId);

      if (error) throw error;
      return (data || []) as PolicyPack[];
    },
  });

  // Fetch diff counts per institution
  const { data: diffCounts } = useQuery({
    queryKey: ['policy-diffs-count', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_refresh_diffs')
        .select('institution')
        .eq('run_id', runId);

      if (error) throw error;
      
      // Count per institution
      const counts: Record<string, number> = {};
      (data || []).forEach((d: { institution: string }) => {
        counts[d.institution] = (counts[d.institution] || 0) + 1;
      });
      return counts;
    },
  });

  // Promote mutation with post-promote template generation
  const promoteMutation = useMutation({
    mutationFn: async ({ packId, institutionCode }: { packId: string; institutionCode: string }) => {
      const { data, error } = await supabase.rpc('activate_policy_pack', {
        p_pack_id: packId,
      });
      if (error) throw error;
      // Return institutionCode for template generation after success
      return { rpcResult: data, institutionCode };
    },
    onSuccess: ({ rpcResult, institutionCode }) => {
      toast({ title: 'Pack promoted successfully' });
      // Invalidate all related queries for proper UI refresh
      queryClient.invalidateQueries({ queryKey: ['policy-packs', runId] });
      queryClient.invalidateQueries({ queryKey: ['policy-refresh-tasks', runId] });
      queryClient.invalidateQueries({ queryKey: ['policy-diffs-count', runId] });
      queryClient.invalidateQueries({ queryKey: ['policy-refresh-runs'] });
      
      // Generate templates after successful promotion
      if (institutionCode) {
        generateTemplates.mutate(institutionCode);
        // Also invalidate degree templates queries
        queryClient.invalidateQueries({ queryKey: ['degreeTemplates'] });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to promote pack', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Combine tasks with packs + normalize status once
  const institutions = tasks?.map((task) => {
    const pack = packs?.find((p) => p.institution === task.institution);
    const diffs = diffCounts?.[task.institution] || 0;
    return { ...task, pack, diffs, status_norm: normalizeStatus(task.status) };
  }) || [];

  // Apply filter using normalized status
  const filtered = institutions.filter((inst) => {
    if (filter === 'all') return true;
    if (filter === 'complete') return inst.status_norm === 'complete';
    if (filter === 'blocked') return inst.status_norm === 'blocked' || !!inst.pack?.blocked_reason;
    if (filter === 'failed') return inst.status_norm === 'failed';
    if (filter === 'queued') return inst.status_norm === 'queued' || inst.status_norm === 'running';
    return true;
  });
  
  // Derive blocked reason from pack or task (whichever is available)
  const getBlockedReason = (inst: typeof institutions[0]) => 
    inst.pack?.blocked_reason ?? (inst.status_norm === 'blocked' ? inst.reason : null);

  const getStatusIcon = (statusNorm: string, blockedReason: string | null) => {
    if (blockedReason) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    switch (statusNorm) {
      case 'complete': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Promote gate: draft + not blocked (score is UX guidance, not hard blocker)
  const isPromotable = (pack: PolicyPack | undefined) => {
    if (!pack) return false;
    return pack.status === 'draft' && !pack.blocked_reason;
  };
  
  const hasLowConfidence = (pack: PolicyPack | undefined) => {
    return pack && (pack.confidence_score || 0) < 80;
  };

  if (tasksLoading || packsLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Run Detail</h2>
          <p className="text-xs text-muted-foreground font-mono">{runId}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(['all', 'complete', 'blocked', 'failed', 'queued'] as FilterStatus[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Institutions table */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No institutions match the filter
            </div>
          ) : (
            filtered.map((inst) => {
              const blockedReason = getBlockedReason(inst);
              return (
              <div
                key={inst.institution}
                className={cn(
                  "p-4 rounded-lg border bg-card flex items-center gap-4",
                  blockedReason && "border-yellow-500/30 bg-yellow-500/5"
                )}
              >
                {/* Status */}
                <div className="flex-shrink-0">
                  {getStatusIcon(inst.status_norm, blockedReason)}
                </div>

                {/* Institution info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inst.institution}</span>
                    {inst.pack?.pack_scope === 'program' && (
                      <Badge variant="outline" className="text-[10px]">Program Scoped</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {inst.metrics?.trust_tier && (
                      <span>Tier: {inst.metrics.trust_tier}</span>
                    )}
                    {inst.diffs > 0 && (
                      <span>{inst.diffs} diffs</span>
                    )}
                    {inst.reason && !blockedReason && (
                      <span className="text-yellow-600">{inst.reason}</span>
                    )}
                  </div>

                  {blockedReason && (
                    <div className="mt-1 text-xs text-yellow-600">
                      Blocked: {blockedReason}
                    </div>
                  )}
                </div>

                {/* Score */}
                {inst.pack?.confidence_score && (
                  <div className="flex-shrink-0 text-right">
                    <div className={cn(
                      "text-lg font-bold",
                      inst.pack.confidence_score >= 85 ? "text-green-600" :
                      inst.pack.confidence_score >= 70 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {inst.pack.confidence_score}
                    </div>
                    <div className="text-[10px] text-muted-foreground">score</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReviewInstitution(inst.institution)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review
                  </Button>

                  {isPromotable(inst.pack) && (
                    <Button
                      variant={hasLowConfidence(inst.pack) ? "outline" : "default"}
                      size="sm"
                      onClick={() => inst.pack && promoteMutation.mutate({ 
                        packId: inst.pack.id, 
                        institutionCode: inst.institution 
                      })}
                      disabled={promoteMutation.isPending || generateTemplates.isPending}
                      className={hasLowConfidence(inst.pack) ? "border-yellow-500 text-yellow-600" : ""}
                      title={hasLowConfidence(inst.pack) ? "Low confidence - review recommended" : ""}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-1" />
                      {promoteMutation.isPending ? "Promoting..." : 
                       generateTemplates.isPending ? "Generating..." :
                       hasLowConfidence(inst.pack) ? "Promote (Caution)" : "Promote"}
                    </Button>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
