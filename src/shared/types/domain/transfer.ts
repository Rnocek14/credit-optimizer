/**
 * Domain types for transfer rules — derived from Database row types.
 */
import type { Database } from '@/integrations/supabase/types';

/** Full credit_transfer_rules row from Supabase */
export type TransferRuleRow = Database['public']['Tables']['credit_transfer_rules']['Row'];

/** Slim transfer rule used in UI consumers */
export interface TransferRule {
  id: string;
  source_institution: string;
  source_course_code: string | null;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: string | null;
  rule_source: string | null;
  confidence: number | null;
  evidence_url: string | null;
}

/** Accepted transfer source used for marketplace matching */
export interface AcceptedTransferSource {
  source_institution: string;
  source_course_code: string | null;
}
