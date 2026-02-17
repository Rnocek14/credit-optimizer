import { useQuery } from '@tanstack/react-query';
import { fetchInstitutionByCode } from '@/shared/lib/api';
import type { InstitutionCode } from '@/types/degreeTemplates';

export function useInstitution(code: InstitutionCode) {
  return useQuery({
    queryKey: ['institution', code],
    queryFn: () => fetchInstitutionByCode(code),
  });
}
