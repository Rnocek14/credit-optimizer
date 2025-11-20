import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionCode } from '@/types/degreeTemplates';

interface GenEdCategory {
  id: string;
  framework_id: string;
  category_code: string; // WRITTEN_COMM, QUANTITATIVE, etc.
  category_name: string;
  credits_required: number;
  min_grade: string | null;
}

export function useGenEdCategories(code: InstitutionCode) {
  return useQuery({
    queryKey: ['genedCategories', code],
    queryFn: async () => {
      const { data: inst, error: instError } = await supabase
        .from('institutions' as any)
        .select('id')
        .eq('code', code)
        .single();

      if (instError) throw instError;

      const { data: framework, error: fwError } = await supabase
        .from('gened_frameworks' as any)
        .select('id')
        .eq('institution_id', (inst as any).id)
        .single();

      if (fwError) throw fwError;

      const { data, error } = await supabase
        .from('gened_categories' as any)
        .select('*')
        .eq('framework_id', (framework as any).id);

      if (error) throw error;
      return data as unknown as GenEdCategory[];
    },
  });
}
