import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface DraftPolicyPack {
  id: string;
  institution: string;
  academic_year: string;
  degree_level: string;
  policy_json: Record<string, unknown>;
  confidence_score: number | null;
  last_verified_at: string | null;
  verification_source: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  merged_from_job_ids?: string[];
  source_scrape_ids?: string[];
}

interface ActivePolicy {
  id: string;
  institution: string;
  academic_year: string;
  policy_json: Record<string, unknown>;
  confidence_score: number | null;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="outline">No score</Badge>;
  const colorClass = score >= 85 ? 'bg-green-500/20 text-green-600' : score >= 60 ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-600';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>{score}/100</span>;
}

function PolicyDiff({ draft, active }: { draft: Record<string, unknown>; active: Record<string, unknown> | null }) {
  if (!active) {
    return <p className="text-xs text-muted-foreground">No active policy to compare</p>;
  }

  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  
  // Compare key fields
  const draftResidency = (draft.residency_policy as Record<string, unknown>)?.min_institutional_credits;
  const activeResidency = (active.residency_policy as Record<string, unknown>)?.min_institutional_credits;
  if (draftResidency !== activeResidency) {
    changes.push({ field: 'Residency Credits', oldValue: activeResidency, newValue: draftResidency });
  }

  const draftAce = (draft.transfer_credit_limits as Record<string, unknown>)?.max_ace_nccrs_credits;
  const activeAce = (active.transfer_credit_limits as Record<string, unknown>)?.max_ace_nccrs_credits;
  if (draftAce !== activeAce) {
    changes.push({ field: 'ACE/NCCRS Limit', oldValue: activeAce, newValue: draftAce });
  }

  const draftMax = (draft.transfer_credit_limits as Record<string, unknown>)?.max_total_transfer_credits;
  const activeMax = (active.transfer_credit_limits as Record<string, unknown>)?.max_total_transfer_credits;
  if (draftMax !== activeMax) {
    changes.push({ field: 'Max Transfer Credits', oldValue: activeMax, newValue: draftMax });
  }

  if (changes.length === 0) {
    return <p className="text-xs text-green-600">No differences from active policy</p>;
  }

  return (
    <div className="space-y-1">
      {changes.map((change, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium">{change.field}:</span>
          <span className="text-red-500 line-through">{String(change.oldValue ?? 'null')}</span>
          <span>→</span>
          <span className="text-green-600">{String(change.newValue ?? 'null')}</span>
        </div>
      ))}
    </div>
  );
}

function PolicyPackCard({ 
  pack, 
  activePolicy,
  onApprove, 
  onReject, 
  loading 
}: { 
  pack: DraftPolicyPack;
  activePolicy: ActivePolicy | null;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{pack.institution}</span>
              <Badge variant="outline">{pack.academic_year}</Badge>
              <ConfidenceBadge score={pack.confidence_score} />
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              Created {new Date(pack.created_at).toLocaleDateString()} via {pack.verification_source || 'unknown'}
            </p>

            {/* Quick diff preview */}
            <PolicyDiff draft={pack.policy_json} active={activePolicy?.policy_json || null} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={loading}>
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject this policy pack?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the draft as rejected. Add notes explaining why.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Rejection reason..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mb-4"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onReject(pack.id, notes)}>
                    Reject
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={loading}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve this policy pack?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make the policy active and supersede any existing active policy.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Optional approval notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mb-4"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onApprove(pack.id, notes)}>
                    Approve & Activate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Expanded view */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Full Policy Data</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(pack.policy_json, null, 2)}
              </pre>
            </div>
            
            {pack.merged_from_job_ids && pack.merged_from_job_ids.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Merged from {pack.merged_from_job_ids.length} jobs</h4>
                <div className="flex flex-wrap gap-1">
                  {pack.merged_from_job_ids.map((id) => (
                    <Badge key={id} variant="outline" className="text-xs font-mono">
                      {id.slice(0, 8)}...
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Main Panel
// -----------------------------------------------------------------------------

export function ReviewQueuePanel({ institution }: { institution: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftPolicyPack[]>([]);
  const [activePolicy, setActivePolicy] = useState<ActivePolicy | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      // Load draft policy packs
      const { data: draftData, error: draftError } = await (supabase as any)
        .from('institution_policy_packs')
        .select('*')
        .eq('institution', institution)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (draftError) throw draftError;
      setDrafts(draftData || []);

      // Load active policy for comparison
      const { data: activeData } = await (supabase as any)
        .from('institution_policy_packs')
        .select('id, institution, academic_year, policy_json, confidence_score, updated_at')
        .eq('institution', institution)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setActivePolicy(activeData);
    } catch (e) {
      console.error('Error loading drafts:', e);
      toast({ title: 'Failed to load review queue', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (institution) {
      loadDrafts();
    }
  }, [institution]);

  const handleApprove = async (id: string, notes: string) => {
    setLoading(true);
    try {
      // Supersede existing active policies
      await (supabase as any)
        .from('institution_policy_packs')
        .update({ status: 'superseded' })
        .eq('institution', institution)
        .eq('status', 'active');

      // Activate the draft
      const { error } = await (supabase as any)
        .from('institution_policy_packs')
        .update({
          status: 'active',
          last_verified_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Policy approved and activated' });
      await loadDrafts();
    } catch (e) {
      console.error('Error approving:', e);
      toast({ title: 'Failed to approve', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('institution_policy_packs')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Policy rejected' });
      await loadDrafts();
    } catch (e) {
      console.error('Error rejecting:', e);
      toast({ title: 'Failed to reject', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Review Queue</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{drafts.length} pending</Badge>
            <Button size="sm" variant="ghost" onClick={loadDrafts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {activePolicy && (
          <p className="text-xs text-muted-foreground">
            Active policy: {activePolicy.academic_year} (score: {activePolicy.confidence_score}, updated {new Date(activePolicy.updated_at).toLocaleDateString()})
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {loading && drafts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No pending policy packs to review
          </p>
        ) : (
          drafts.map((pack) => (
            <PolicyPackCard
              key={pack.id}
              pack={pack}
              activePolicy={activePolicy}
              onApprove={handleApprove}
              onReject={handleReject}
              loading={loading}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
