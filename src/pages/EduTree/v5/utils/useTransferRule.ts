// Placeholder hook - will be functional after migrations run

export type Acceptance = 'accepted' | 'elective' | 'rejected' | 'unknown';
export interface TransferRule {
  source_institution: string;
  source_course_code: string;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: Acceptance;
  rule_source?: string | null;
  confidence?: number | null;
  evidence_url?: string | null;
}

export function useTransferRule(providerCode?: string, courseCode?: string, targetSchool?: string) {
  // Placeholder: Will query credit_transfer_rules after migrations
  return { data: null, isLoading: false, error: null };
}
