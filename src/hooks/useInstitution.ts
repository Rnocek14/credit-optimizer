import { useQuery } from '@tanstack/react-query';
import { fetchInstitutionByCode } from '@/shared/lib/api';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { InstitutionCode } from '@/types/degreeTemplates';

export function useInstitution(code: InstitutionCode) {
  return useQuery({
    queryKey: QUERY_KEYS.INSTITUTIONS(),
    queryFn: () => fetchInstitutionByCode(code),
  });
}
