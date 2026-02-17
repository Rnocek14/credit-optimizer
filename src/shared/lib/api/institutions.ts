import { supabase } from './client';
import type { InstitutionLite } from '@/shared/types/domain/institutions';

export type { InstitutionLite };

// Re-export as Institution for backward compat
export type Institution = InstitutionLite;

export async function fetchInstitutionByCode(code: string): Promise<InstitutionLite> {
  const { data, error } = await supabase
    .from('institutions')
    .select('id, code, name, accreditation_level')
    .eq('code', code)
    .single();

  if (error) throw error;
  return data;
}
