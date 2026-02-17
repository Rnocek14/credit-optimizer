import { supabase } from './client';

export interface Institution {
  id: string;
  code: string;
  name: string;
  accreditation: string | null;
}

export async function fetchInstitutionByCode(code: string): Promise<Institution> {
  const { data, error } = await supabase
    .from('institutions' as any)
    .select('id, code, name, accreditation')
    .eq('code', code)
    .single();

  if (error) throw error;
  return data as unknown as Institution;
}
