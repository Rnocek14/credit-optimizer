import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DegreeTemplate,
  DegreeTemplateRow,
  InstitutionCode,
  TrackType,
} from '@/types/degreeTemplates';

interface UseDegreeTemplatesParams {
  institutionCode: InstitutionCode;
  programCode: string; // 'BSBA', etc.
  trackType?: TrackType;
}

export function useDegreeTemplates(params: UseDegreeTemplatesParams) {
  const { institutionCode, programCode, trackType } = params;

  return useQuery({
    queryKey: ['degreeTemplates', institutionCode, programCode, trackType],
    queryFn: async () => {
      const { data: inst, error: instError } = await supabase
        .from('institutions' as any)
        .select('id')
        .eq('code', institutionCode)
        .single();

      if (instError) throw instError;

      let query = supabase
        .from('degree_templates' as any)
        .select(
          'id, institution_id, institution_code, program_code, track_type, total_credits, estimated_cost, estimated_duration_months, template_data'
        )
        .eq('institution_id', (inst as any).id)
        .eq('program_code', programCode);

      if (trackType) {
        query = query.eq('track_type', trackType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => {
        const base = row as DegreeTemplateRow;
        return {
          ...base,
          template_data: base.template_data as DegreeTemplate['template_data'],
        } as DegreeTemplate;
      });
    },
  });
}
