/**
 * useVerifiedPolicy Hook
 * 
 * React hook for fetching verified institution policies.
 * Provides loading state and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query';
import { 
  getVerifiedPolicy, 
  hasVerifiedPolicy,
  type VerifiedPolicy 
} from '@/lib/degree/verifiedPolicyService';
import { usePlanBasket } from '../state/usePlanBasket';

export interface UseVerifiedPolicyResult {
  policy: VerifiedPolicy | null;
  isVerified: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to get verified policy for the current anchor school
 */
export function useVerifiedPolicy(): UseVerifiedPolicyResult {
  const { constraints } = usePlanBasket();
  const anchorSchool = constraints.target_school || 'TESU';

  const { data, isLoading, error } = useQuery({
    queryKey: ['verified-policy', anchorSchool],
    queryFn: () => getVerifiedPolicy(anchorSchool),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });

  return {
    policy: data ?? null,
    isVerified: data?.verified ?? false,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Hook to get verified policy for a specific institution
 */
export function useVerifiedPolicyForInstitution(
  institutionCode: string
): UseVerifiedPolicyResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['verified-policy', institutionCode],
    queryFn: () => getVerifiedPolicy(institutionCode),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!institutionCode,
  });

  return {
    policy: data ?? null,
    isVerified: data?.verified ?? false,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Hook to check if institution has verified policy (lightweight)
 */
export function useHasVerifiedPolicy(institutionCode: string): {
  hasVerified: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['has-verified-policy', institutionCode],
    queryFn: () => hasVerifiedPolicy(institutionCode),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!institutionCode,
  });

  return {
    hasVerified: data ?? false,
    isLoading,
  };
}
