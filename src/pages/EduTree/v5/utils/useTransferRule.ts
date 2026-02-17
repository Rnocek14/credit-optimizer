import { useQuery } from '@tanstack/react-query';
import { fetchTransferRuleMaybeSingle } from '@/shared/lib/api';
import { normalizeProviderCode } from '@/lib/providerNormalization';
import { ENV } from '@/config/env';

export type { TransferRule } from '@/shared/lib/api';
export type Acceptance = 'accepted' | 'elective' | 'rejected';

// Debug flag: only log in dev or with ?debug=1
const isDebug = () => 
  !ENV.PROD || new URLSearchParams(window.location.search).get('debug') === '1';

export function useTransferRule(
  providerCode?: string,
  courseCode?: string,
  targetSchool?: string
) {
  return useQuery({
    queryKey: ['transfer-rule', providerCode, courseCode, targetSchool],
    queryFn: async () => {
      if (!providerCode || !courseCode || !targetSchool) return null;

      const normalizedProvider = normalizeProviderCode(providerCode);
      const normalizedTarget = targetSchool.toUpperCase();

      if (isDebug()) {
        // eslint-disable-next-line no-console
        console.log('[TransferRule] lookup', {
          raw: { providerCode, courseCode, targetSchool },
          normalized: { provider: normalizedProvider, target: normalizedTarget },
        });
      }

      return fetchTransferRuleMaybeSingle({
        sourceInstitutionNorm: normalizedProvider,
        sourceCourseCodeNorm: courseCode.toLowerCase(),
        targetInstitutionNorm: normalizedTarget,
      });
    },
    staleTime: 60_000,
  });
}
