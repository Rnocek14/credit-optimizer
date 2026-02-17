import { supabase } from './client';
import { isNoRowsError } from './errors';

export interface TransferRule {
  id?: string;
  source_institution: string;
  source_course_code: string;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: 'accepted' | 'elective' | 'rejected';
  rule_source?: string;
  confidence?: number | null;
  evidence_url?: string | null;
}

export async function fetchTransferRuleMaybeSingle(params: {
  sourceInstitutionNorm: string;
  sourceCourseCodeNorm: string;
  targetInstitutionNorm: string;
}): Promise<TransferRule | null> {
  const { data, error } = await supabase
    .from('credit_transfer_rules' as any)
    .select('*')
    .eq('source_institution_norm', params.sourceInstitutionNorm)
    .eq('source_course_code_norm', params.sourceCourseCodeNorm)
    .eq('target_institution_norm', params.targetInstitutionNorm)
    .maybeSingle();

  if (error && !isNoRowsError(error)) throw error;
  return (data as unknown as TransferRule) ?? null;
}

export async function fetchAcceptedTransferSources(params: {
  targetInstitutionNorm: string;
}): Promise<{ source_institution: string; source_course_code: string }[]> {
  const { data, error } = await supabase
    .from('credit_transfer_rules' as any)
    .select('source_institution, source_course_code')
    .eq('target_institution_norm', params.targetInstitutionNorm)
    .eq('acceptance_status', 'accepted');

  if (error) throw error;
  return (data as any[]) ?? [];
}
