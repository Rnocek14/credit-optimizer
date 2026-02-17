import { supabase } from './client';
import { isNoRowsError } from './errors';
import type { TransferRule, AcceptedTransferSource } from '@/shared/types/domain/transfer';

export type { TransferRule, AcceptedTransferSource };

export async function fetchTransferRuleMaybeSingle(params: {
  sourceInstitutionNorm: string;
  sourceCourseCodeNorm: string;
  targetInstitutionNorm: string;
}): Promise<TransferRule | null> {
  const { data, error } = await supabase
    .from('credit_transfer_rules')
    .select('id, source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, evidence_url')
    .eq('source_institution_norm', params.sourceInstitutionNorm)
    .eq('source_course_code_norm', params.sourceCourseCodeNorm)
    .eq('target_institution_norm', params.targetInstitutionNorm)
    .maybeSingle();

  if (error && !isNoRowsError(error)) throw error;
  return data ?? null;
}

export async function fetchAcceptedTransferSources(params: {
  targetInstitutionNorm: string;
}): Promise<AcceptedTransferSource[]> {
  const { data, error } = await supabase
    .from('credit_transfer_rules')
    .select('source_institution, source_course_code')
    .eq('target_institution_norm', params.targetInstitutionNorm)
    .eq('acceptance_status', 'accepted');

  if (error) throw error;
  return data ?? [];
}
