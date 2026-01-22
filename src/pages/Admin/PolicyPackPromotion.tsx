import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronUp, 
  Loader2,
  Shield,
  FileCheck,
  RefreshCw,
  Zap,
  ZapOff
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { refreshV1ScopeCache } from '@/lib/degree/v1Scope';

// Interface matches v_policy_pack_promotion_candidates view
interface PromotionCandidate {
  pack_id: string;
  institution: string;
  status: string;
  confidence_score: number;
  has_ground_truth: boolean;
  missing_critical: string[] | null;
  gate_status: 'green' | 'yellow' | 'red';
  is_promotable: boolean;
  blocked_reason: string | null;
  updated_at: string;
  active_templates: number;
  pending_templates: number;
}

// V1 scope status for each institution
interface V1ScopeStatus {
  institution_code: string;
  enabled_at: string | null;
  evidence_coverage_pct: number | null;
}

function GateStatusBadge({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const config = {
    green: { icon: CheckCircle, label: 'Green', className: 'bg-green-100 text-green-800 border-green-200' },
    yellow: { icon: AlertTriangle, label: 'Yellow', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    red: { icon: XCircle, label: 'Red', className: 'bg-red-100 text-red-800 border-red-200' },
  };
  
  const { icon: Icon, label, className } = config[status];
  
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function PolicyPackPromotion() {
  const queryClient = useQueryClient();
  const [confirmPack, setConfirmPack] = useState<PromotionCandidate | null>(null);

  // Fetch promotion candidates
  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ['policy-pack-promotion-candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_policy_pack_promotion_candidates')
        .select('*');
      
      if (error) throw error;
      return (data ?? []) as PromotionCandidate[];
    },
  });

  // Fetch V1 scope status for all institutions
  const { data: v1ScopeMap = {} } = useQuery({
    queryKey: ['institution-v1-scope'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_v1_scope')
        .select('institution_code, enabled_at, evidence_coverage_pct');
      
      if (error) throw error;
      
      const map: Record<string, V1ScopeStatus> = {};
      (data ?? []).forEach((row) => {
        map[row.institution_code] = row as V1ScopeStatus;
      });
      return map;
    },
  });

  // Enable V1 mutation
  const enableV1Mutation = useMutation({
    mutationFn: async ({ institutionCode, evidenceCoverage }: { institutionCode: string; evidenceCoverage: number }) => {
      const { error } = await supabase
        .from('institution_v1_scope')
        .insert({
          institution_code: institutionCode.toUpperCase(),
          evidence_coverage_pct: evidenceCoverage,
          notes: 'Enabled via admin UI'
        });
      
      if (error) throw error;
      return { institutionCode };
    },
    onSuccess: async ({ institutionCode }) => {
      toast.success(`${institutionCode} enabled for V1 scope`);
      await refreshV1ScopeCache();
      queryClient.invalidateQueries({ queryKey: ['institution-v1-scope'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to enable V1: ${error.message}`);
    },
  });

  // Disable V1 mutation
  const disableV1Mutation = useMutation({
    mutationFn: async ({ institutionCode }: { institutionCode: string }) => {
      const { error } = await supabase
        .from('institution_v1_scope')
        .delete()
        .eq('institution_code', institutionCode.toUpperCase());
      
      if (error) throw error;
      return { institutionCode };
    },
    onSuccess: async ({ institutionCode }) => {
      toast.success(`${institutionCode} removed from V1 scope`);
      await refreshV1ScopeCache();
      queryClient.invalidateQueries({ queryKey: ['institution-v1-scope'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to disable V1: ${error.message}`);
    },
  });

  const handleEnableV1 = (candidate: PromotionCandidate) => {
    // Require active pack and confidence >= 50%
    if (candidate.status !== 'active') {
      toast.error('Pack must be active before enabling V1');
      return;
    }
    if ((candidate.confidence_score ?? 0) < 50) {
      toast.error('Evidence coverage must be ≥50% to enable V1');
      return;
    }
    enableV1Mutation.mutate({
      institutionCode: candidate.institution,
      evidenceCoverage: candidate.confidence_score ?? 0
    });
  };

  const handleDisableV1 = (institutionCode: string) => {
    disableV1Mutation.mutate({ institutionCode });
  };

  // Promote mutation
  const promoteMutation = useMutation({
    mutationFn: async ({ packId, force }: { packId: string; force: boolean }) => {
      const { data, error } = await supabase.functions.invoke('promote-policy-pack', {
        body: { packId, forcePromotion: force },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Promotion failed');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Pack promoted successfully');
      queryClient.invalidateQueries({ queryKey: ['policy-pack-promotion-candidates'] });
      setConfirmPack(null);
    },
    onError: (error: Error) => {
      toast.error(`Promotion failed: ${error.message}`);
    },
  });

  const handlePromote = (candidate: PromotionCandidate) => {
    if (candidate.gate_status === 'yellow') {
      // Show confirmation for yellow gate
      setConfirmPack(candidate);
    } else {
      // Direct promotion for green gate
      promoteMutation.mutate({ packId: candidate.pack_id, force: false });
    }
  };

  const confirmYellowPromotion = () => {
    if (confirmPack) {
      promoteMutation.mutate({ packId: confirmPack.pack_id, force: true });
    }
  };

  // Summary stats
  const stats = {
    total: candidates.length,
    green: candidates.filter(c => c.gate_status === 'green' && c.status !== 'active').length,
    yellow: candidates.filter(c => c.gate_status === 'yellow' && c.status !== 'active').length,
    red: candidates.filter(c => c.gate_status === 'red').length,
    active: candidates.filter(c => c.status === 'active').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policy Pack Promotion</h1>
          <p className="text-muted-foreground">
            Manage policy pack promotion to enable template generation
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Packs</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">{stats.green}</div>
            <p className="text-xs text-green-600">Ready (Green)</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-700">{stats.yellow}</div>
            <p className="text-xs text-amber-600">Manual (Yellow)</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-700">{stats.red}</div>
            <p className="text-xs text-red-600">Blocked (Red)</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.active}</div>
            <p className="text-xs text-primary/80">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Candidates List */}
      <Card>
        <CardHeader>
          <CardTitle>Promotion Candidates</CardTitle>
          <CardDescription>
            Policy packs eligible for promotion. Green gate = auto-eligible, Yellow = manual review required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No policy packs found
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div
                  key={candidate.pack_id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    candidate.status === 'active' 
                      ? 'bg-muted/30 border-muted' 
                      : 'bg-card'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {candidate.institution}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {candidate.missing_critical && candidate.missing_critical.length > 0 && (
                          <span className="text-red-600">
                            Missing: {candidate.missing_critical.slice(0, 2).join(', ')}
                            {candidate.missing_critical.length > 2 && ` +${candidate.missing_critical.length - 2} more`}
                          </span>
                        )}
                        {candidate.blocked_reason && (
                          <span className="text-red-600">Blocked: {candidate.blocked_reason}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Confidence Score */}
                    <div className="text-right">
                      <div className="text-sm font-medium">{candidate.confidence_score ?? '-'}%</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>

                    {/* Ground Truth Badge */}
                    <Badge 
                      variant="outline" 
                      className={candidate.has_ground_truth 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-muted text-muted-foreground'
                      }
                    >
                      <FileCheck className="h-3 w-3 mr-1" />
                      {candidate.has_ground_truth ? 'Verified' : 'Unverified'}
                    </Badge>

                    {/* Gate Status */}
                    <GateStatusBadge status={candidate.gate_status} />

                    {/* Templates Count */}
                    <div className="text-right min-w-[60px]">
                      <div className="text-sm font-medium">
                        {candidate.active_templates}/{candidate.active_templates + candidate.pending_templates}
                      </div>
                      <div className="text-xs text-muted-foreground">Templates</div>
                    </div>

                    {/* Status / Actions */}
                    {candidate.status === 'active' ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                        
                        {/* V1 Scope Toggle */}
                        {v1ScopeMap[candidate.institution] ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={() => handleDisableV1(candidate.institution)}
                            disabled={disableV1Mutation.isPending}
                          >
                            {disableV1Mutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ZapOff className="h-4 w-4 mr-1" />
                                V1 Enabled
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => handleEnableV1(candidate)}
                            disabled={enableV1Mutation.isPending || (candidate.confidence_score ?? 0) < 50}
                            title={(candidate.confidence_score ?? 0) < 50 ? 'Evidence coverage must be ≥50%' : 'Enable V1 scope'}
                          >
                            {enableV1Mutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-1" />
                                Enable V1
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : candidate.is_promotable ? (
                      <Button
                        size="sm"
                        onClick={() => handlePromote(candidate)}
                        disabled={promoteMutation.isPending}
                        variant={candidate.gate_status === 'green' ? 'default' : 'outline'}
                      >
                        {promoteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Promote
                          </>
                        )}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Blocked
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yellow Gate Confirmation Dialog */}
      <AlertDialog open={!!confirmPack} onOpenChange={() => setConfirmPack(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Yellow Gate Promotion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are promoting <strong>{confirmPack?.institution}</strong> with a <strong>yellow gate</strong>.
              </p>
              <p className="text-amber-600">
                This pack is missing ground truth verification or has incomplete policy data.
              </p>
              <p>
                Templates generated from this pack will be set to <strong>pending_review</strong> and will not appear in the marketplace until manually approved.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmYellowPromotion}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              Confirm Promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
