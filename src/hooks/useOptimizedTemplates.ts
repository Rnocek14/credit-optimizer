import { useMemo } from 'react';
import { useDegreeTemplates } from '@/hooks/useDegreeTemplates';
import { useInstitutionLimits } from '@/hooks/useInstitutionLimits';
import { useAltCreditEquivalenciesForInstitution } from '@/hooks/useAltCreditEquivalencies';
import { optimizeDegreePlan } from '@/lib/creditOptimizer';
import type { InstitutionCode } from '@/types/degreeTemplates';
import type { OptimizerMode } from '@/types/optimizer';

export function useOptimizedTemplatesForProgram(
  institutionCode: InstitutionCode,
  programCode: string
) {
  const { data: templates, isLoading: templatesLoading } = useDegreeTemplates({
    institutionCode,
    programCode,
  });
  const { data: limits, isLoading: limitsLoading } = useInstitutionLimits(institutionCode);
  const { data: equivalencies, isLoading: equivLoading } =
    useAltCreditEquivalenciesForInstitution(institutionCode);

  const isLoading = templatesLoading || limitsLoading || equivLoading;

  const optimizedTemplates = useMemo(() => {
    if (!templates || !limits || !equivalencies) return [];

    return templates.map((template) => {
      const mode: OptimizerMode = template.track_type === 'alt_max' ? 'alt_max' : 'standard_like';

      const result = optimizeDegreePlan({
        institutionCode,
        template,
        mode,
        preferences: { avoidExams: false, preferSophia: true },
        equivalencies,
        limits,
      });

      return {
        template,
        optimized: result,
      };
    });
  }, [templates, limits, equivalencies, institutionCode]);

  return { optimizedTemplates, isLoading };
}
