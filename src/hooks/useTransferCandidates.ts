import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CandidateStatus = 'pending' | 'approved' | 'promoted' | 'rejected';

export interface TransferCandidate {
  id: string;
  source_institution: string;
  source_course_code: string;
  source_course_title: string | null;
  target_institution: string;
  target_course_code: string | null;
  target_course_title: string | null;
  acceptance_status: string;
  confidence_score: number;
  validation_score: number | null;
  validation_flags: string[] | null;
  validation_result: Record<string, unknown> | null;
  evidence_url: string | null;
  evidence_text: string | null;
  ai_model: string | null;
  rule_source: string | null;
  batch_id: string | null;
  status: string;
  promotion_error: string | null;
  created_at: string;
  validated_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

const CANDIDATES_KEY = ['admin', 'transfer-candidates'];

export function useTransferCandidates(statusFilter: CandidateStatus | 'all' = 'all') {
  return useQuery({
    queryKey: [...CANDIDATES_KEY, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('transfer_rule_candidates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TransferCandidate[];
    },
  });
}

export function useTransferCandidateStats() {
  return useQuery({
    queryKey: [...CANDIDATES_KEY, 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_rule_candidates')
        .select('status, confidence_score, validation_score');
      if (error) throw error;

      const rows = data ?? [];
      return {
        total: rows.length,
        pending: rows.filter(r => r.status === 'pending').length,
        approved: rows.filter(r => r.status === 'approved').length,
        promoted: rows.filter(r => r.status === 'promoted').length,
        rejected: rows.filter(r => r.status === 'rejected').length,
        avgConfidence: rows.length
          ? rows.reduce((s, r) => s + (r.confidence_score ?? 0), 0) / rows.length
          : 0,
        avgValidation: rows.filter(r => r.validation_score != null).length
          ? rows.filter(r => r.validation_score != null).reduce((s, r) => s + (r.validation_score ?? 0), 0) / rows.filter(r => r.validation_score != null).length
          : 0,
      };
    },
  });
}

async function promoteCandidate(id: string) {
  const { data: candidate } = await supabase
    .from('transfer_rule_candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (!candidate) return;

  const srcNorm = candidate.source_institution.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const codeNorm = candidate.source_course_code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tgtNorm = candidate.target_institution.toUpperCase().replace(/[^A-Z0-9]/g, '_');

  const { error: insertErr } = await supabase
    .from('credit_transfer_rules')
    .upsert({
      source_institution: candidate.source_institution,
      source_course_code: candidate.source_course_code,
      target_institution: candidate.target_institution,
      target_course_code: candidate.target_course_code,
      acceptance_status: candidate.acceptance_status,
      rule_source: 'ai_validated_human_approved',
      confidence: candidate.confidence_score,
      evidence_url: candidate.evidence_url,
      source_institution_norm: srcNorm,
      source_course_code_norm: codeNorm,
      target_institution_norm: tgtNorm,
    }, { onConflict: 'source_institution_norm,source_course_code_norm,target_institution_norm' });

  if (insertErr) {
    await supabase
      .from('transfer_rule_candidates')
      .update({ promotion_error: insertErr.message })
      .eq('id', id);
  } else {
    await supabase
      .from('transfer_rule_candidates')
      .update({ status: 'promoted' })
      .eq('id', id);
  }
}

export function useReviewCandidate() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('transfer_rule_candidates')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq('id', id);

      if (error) throw error;

      if (action === 'approve') {
        await promoteCandidate(id);
      }
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      toast({
        title: action === 'approve' ? 'Rule approved & promoted' : 'Rule rejected',
        description: action === 'approve'
          ? 'Transfer rule has been promoted to production.'
          : 'Candidate has been rejected.',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Review failed', description: err.message, variant: 'destructive' });
    },
  });
}

export function useBatchReviewCandidates() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' }) => {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('transfer_rule_candidates')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .in('id', ids);

      if (error) throw error;

      if (action === 'approve') {
        // Promote each sequentially to avoid conflicts
        for (const id of ids) {
          await promoteCandidate(id);
        }
      }
    },
    onSuccess: (_, { ids, action }) => {
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      toast({
        title: `Batch ${action === 'approve' ? 'approved' : 'rejected'}`,
        description: `${ids.length} candidates ${action === 'approve' ? 'promoted to production' : 'rejected'}.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Batch review failed', description: err.message, variant: 'destructive' });
    },
  });
}
