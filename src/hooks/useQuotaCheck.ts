import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlanTier } from '@/types/subscriptionTiers';

interface TierFeatures {
  canCompare: boolean;
  canOptimizeMulti: boolean;
  canExport: boolean;
}

interface TierLimits {
  max_anchors: number;
  max_analyses_per_month: number;
}

export interface QuotaData {
  success: boolean;
  limit_reached: boolean;
  remaining: number;
  used: number;
  limit: number;
  reset_date: string;
  current_period: string;
  // Tier-specific fields
  tier: PlanTier;
  tier_expires_at: string | null;
  features: TierFeatures;
  limits: TierLimits;
  requires_trust_tier_ab: boolean;
}

const DEFAULT_FREE_QUOTA: QuotaData = {
  success: false,
  limit_reached: true,
  remaining: 0,
  used: 0,
  limit: 0,
  reset_date: new Date().toISOString(),
  current_period: new Date().toISOString(),
  tier: 'free',
  tier_expires_at: null,
  features: {
    canCompare: false,
    canOptimizeMulti: false,
    canExport: false,
  },
  limits: {
    max_anchors: 1,
    max_analyses_per_month: 5,
  },
  requires_trust_tier_ab: false,
};

export function useQuotaCheck() {
  return useQuery({
    queryKey: ['quota-check'],
    queryFn: async (): Promise<QuotaData> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Return safe defaults for unauthenticated users
        return DEFAULT_FREE_QUOTA;
      }

      const { data, error } = await supabase.functions.invoke('quota-check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: true,
  });
}

/**
 * Hook to get just the tier information with gating utilities
 */
export function useUserTier() {
  const quota = useQuotaCheck();
  
  return {
    tier: quota.data?.tier ?? 'free',
    features: quota.data?.features ?? DEFAULT_FREE_QUOTA.features,
    limits: quota.data?.limits ?? DEFAULT_FREE_QUOTA.limits,
    requiresTrustTierAB: quota.data?.requires_trust_tier_ab ?? false,
    tierExpiresAt: quota.data?.tier_expires_at ?? null,
    isLoading: quota.isLoading,
    error: quota.error,
  };
}