import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstitutionReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  runId: string | null;
  institution: string | null;
}

interface PolicyPack {
  id: string;
  institution: string;
  status: string;
  blocked_reason: string | null;
  confidence_score: number | null;
  pack_scope: string | null;
  provenance_url: string | null;
  policy_json: Record<string, unknown> | null;
}

interface PolicyDiff {
  id: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  action: string;
  old_confidence: number | null;
  new_confidence: number | null;
}

interface PolicyConflict {
  field: string;
  values: Array<{
    value: unknown;
    url: string;
    confidence: number;
  }>;
}

interface PolicyFinding {
  id: string;
  details: {
    has_conflicts?: boolean;
    conflicts?: PolicyConflict[];
  } | null;
  created_at: string;
}

interface RefreshTask {
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
}

export function InstitutionReviewDrawer({ open, onClose, runId, institution }: InstitutionReviewDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pack
  const { data: pack } = useQuery({
    queryKey: ['pack-detail', runId, institution],
    queryFn: async () => {
      if (!runId || !institution) return null;
      const { data, error } = await supabase
        .from('institution_policy_packs')
        .select('*')
        .eq('last_run_id', runId)
        .eq('institution', institution)
        .single();
      if (error) throw error;
      return data as PolicyPack;
    },
    enabled: !!runId && !!institution,
  });

  // Fetch task
  const { data: task } = useQuery({
    queryKey: ['task-detail', runId, institution],
    queryFn: async () => {
      if (!runId || !institution) return null;
      const { data, error } = await supabase
        .from('policy_refresh_tasks')
        .select('status, reason, metrics')
        .eq('run_id', runId)
        .eq('institution', institution)
        .single();
      if (error) throw error;
      return data as RefreshTask;
    },
    enabled: !!runId && !!institution,
  });

  // Fetch diffs
  const { data: diffs } = useQuery({
    queryKey: ['diffs-detail', runId, institution],
    queryFn: async () => {
      if (!runId || !institution) return [];
      const { data, error } = await supabase
        .from('policy_refresh_diffs')
        .select('id, field_name, old_value, new_value, action, old_confidence, new_confidence')
        .eq('run_id', runId)
        .eq('institution', institution)
        .order('action', { ascending: false });
      if (error) throw error;
      return (data || []) as PolicyDiff[];
    },
    enabled: !!runId && !!institution,
  });

  // Fetch conflicts
  const { data: findings } = useQuery({
    queryKey: ['conflicts-detail', institution],
    queryFn: async () => {
      if (!institution) return [];
      const { data, error } = await supabase
        .from('policy_scan_findings')
        .select('id, details, created_at')
        .eq('institution', institution)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as PolicyFinding[];
    },
    enabled: !!institution,
  });

  // Resolve conflict mutation - direct insert to ground_truth_overrides
  const resolveMutation = useMutation({
    mutationFn: async (params: { 
      field: string; 
      value: unknown; 
      sourceUrl: string; 
      notes: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('ground_truth_overrides')
        .upsert({
          institution: institution!,
          field_name: params.field,
          academic_year: null, // Current year / default
          pack_scope: null,    // Universal scope
          override_value: JSON.parse(JSON.stringify(params.value)),
          citation_url: params.sourceUrl,
          note: params.notes,
          resolved_by: userData.user.id,
          resolved_at: new Date().toISOString(),
        }, {
          onConflict: 'institution,field_name,academic_year,pack_scope',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Conflict resolved' });
      queryClient.invalidateQueries({ queryKey: ['conflicts-detail', institution] });
      queryClient.invalidateQueries({ queryKey: ['pack-detail', runId, institution] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to resolve conflict', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Promote mutation
  const promoteMutation = useMutation({
    mutationFn: async () => {
      if (!pack?.id) throw new Error('No pack to promote');
      const { data, error } = await supabase.rpc('activate_policy_pack', {
        p_pack_id: pack.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Pack promoted to active' });
      // Invalidate all related queries for proper UI refresh
      queryClient.invalidateQueries({ queryKey: ['pack-detail', runId, institution] });
      queryClient.invalidateQueries({ queryKey: ['policy-packs', runId] });
      queryClient.invalidateQueries({ queryKey: ['policy-refresh-tasks', runId] });
      queryClient.invalidateQueries({ queryKey: ['policy-diffs-count', runId] });
      queryClient.invalidateQueries({ queryKey: ['conflicts-detail', institution] });
      queryClient.invalidateQueries({ queryKey: ['policy-refresh-runs'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to promote pack', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const latestConflicts = findings?.find(f => f.details?.has_conflicts)?.details?.conflicts || [];
  const isPromotable = pack?.status === 'draft' && !pack?.blocked_reason && (pack?.confidence_score || 0) >= 80;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'added': return <Badge className="bg-green-500/20 text-green-600">Added</Badge>;
      case 'updated': return <Badge className="bg-blue-500/20 text-blue-600">Updated</Badge>;
      case 'removed': return <Badge className="bg-red-500/20 text-red-600">Removed</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {institution}
            {pack?.pack_scope === 'program' && (
              <Badge variant="outline">Program Scoped</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="summary" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="diffs">
              Diffs {diffs && diffs.length > 0 && `(${diffs.length})`}
            </TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflicts {latestConflicts.length > 0 && `(${latestConflicts.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-4 space-y-4">
            {/* Pack info */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium">Draft Pack</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium capitalize">{pack?.status || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Confidence</div>
                  <div className={cn(
                    "font-bold text-lg",
                    (pack?.confidence_score || 0) >= 85 ? "text-green-600" :
                    (pack?.confidence_score || 0) >= 70 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {pack?.confidence_score || '-'}
                  </div>
                </div>
              </div>

              {pack?.blocked_reason && (
                <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 text-yellow-700 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Blocked: {pack.blocked_reason}</span>
                </div>
              )}

              {pack?.provenance_url && (
                <a
                  href={pack.provenance_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Source
                </a>
              )}
            </div>

            {/* Task metrics */}
            {task?.metrics && (
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium">Task Metrics</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Trust Tier</div>
                    <div className="font-medium">{task.metrics.trust_tier || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Templates</div>
                    <div className="font-medium">{task.metrics.templates_scanned || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Elapsed</div>
                    <div className="font-medium">{task.metrics.elapsed_ms ? `${(task.metrics.elapsed_ms / 1000).toFixed(1)}s` : '-'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Promote button */}
            {isPromotable && (
              <Button
                className="w-full"
                onClick={() => promoteMutation.mutate()}
                disabled={promoteMutation.isPending}
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Promote Draft → Active
              </Button>
            )}
          </TabsContent>

          {/* Diffs Tab */}
          <TabsContent value="diffs" className="mt-4">
            <ScrollArea className="h-[500px]">
              {diffs?.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No diffs recorded</div>
              ) : (
                <div className="space-y-2">
                  {diffs?.map((diff) => (
                    <div key={diff.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm">{diff.field_name}</span>
                        {getActionBadge(diff.action)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Old</div>
                          <div className="font-mono text-xs bg-muted/50 p-2 rounded overflow-auto max-h-20">
                            {diff.old_value !== null ? JSON.stringify(diff.old_value) : '-'}
                          </div>
                          {diff.old_confidence && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Confidence: {diff.old_confidence}%
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">New</div>
                          <div className="font-mono text-xs bg-green-500/10 p-2 rounded overflow-auto max-h-20">
                            {diff.new_value !== null ? JSON.stringify(diff.new_value) : '-'}
                          </div>
                          {diff.new_confidence && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Confidence: {diff.new_confidence}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Conflicts Tab */}
          <TabsContent value="conflicts" className="mt-4">
            <ScrollArea className="h-[500px]">
              {latestConflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-muted-foreground">No unresolved conflicts</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {latestConflicts.map((conflict, idx) => (
                    <div key={idx} className="rounded-lg border p-4">
                      <div className="font-mono text-sm mb-3">{conflict.field}</div>
                      <div className="space-y-2">
                        {conflict.values.map((candidate, cidx) => (
                          <div
                            key={cidx}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="font-mono text-sm">
                                {JSON.stringify(candidate.value)}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {candidate.url}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Confidence: {candidate.confidence}%
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveMutation.mutate({
                                field: conflict.field,
                                value: candidate.value,
                                sourceUrl: candidate.url,
                                notes: `Selected from conflict resolution UI`,
                              })}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Select
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
