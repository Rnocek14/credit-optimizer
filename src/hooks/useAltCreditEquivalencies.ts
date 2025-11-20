import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionCode } from '@/types/degreeTemplates';

export interface AltCreditEquivalency {
  alt_credit_id: string;
  institution_id: string;
  institutional_course_code: string;
  institutional_course_name: string;
  credits_awarded: number;
  level: number;
  gened_category_id: string | null;
  requirement_area: string | null; // 'gened' | 'major' | etc.
  confidence: number;
  source_documentation: string | null;
  alt_source_code: string; // CLEP, DSST, etc.
  alt_identifier: string;  // COLLEGE_ALGEBRA, ENG101, etc.
}

export function useAltCreditEquivalenciesForInstitution(code: InstitutionCode) {
  return useQuery({
    queryKey: ['altCreditEquivalencies', code],
    queryFn: async () => {
      const { data: inst, error: instError } = await supabase
        .from('institutions' as any)
        .select('id')
        .eq('code', code)
        .single();

      if (instError) throw instError;

      const { data, error } = await supabase
        .from('cross_institution_equivalencies' as any)
        .select(`
          alt_credit_id,
          institution_id,
          institutional_course_code,
          institutional_course_name,
          credits_awarded,
          level,
          gened_category_id,
          requirement_area,
          confidence,
          source_documentation,
          alt_credits!inner (
            source_code,
            identifier
          )
        `)
        .eq('institution_id', (inst as any).id);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        alt_credit_id: row.alt_credit_id,
        institution_id: row.institution_id,
        institutional_course_code: row.institutional_course_code,
        institutional_course_name: row.institutional_course_name,
        credits_awarded: row.credits_awarded,
        level: row.level,
        gened_category_id: row.gened_category_id,
        requirement_area: row.requirement_area,
        confidence: row.confidence,
        source_documentation: row.source_documentation,
        alt_source_code: row.alt_credits.source_code,
        alt_identifier: row.alt_credits.identifier,
      })) as AltCreditEquivalency[];
    },
  });
}
