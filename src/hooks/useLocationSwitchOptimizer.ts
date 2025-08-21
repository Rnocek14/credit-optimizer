import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

export interface LocationAnalysis {
  city: string;
  country: string;
  currentSalary: number;
  targetSalary: number;
  costOfLiving: number;
  netIncome: number;
  breakEvenMonths: number | null;
  lqi: number;
  deltaROI: number;
  demandScore: number;
  visaRequired: boolean;
  salaryMultiplier: number;
  colIndex: number;
}

export interface LocationOptimizationResult {
  fromTrack: string;
  toTrack: string;
  rankedLocations: LocationAnalysis[];
  assumptions: {
    currentBaseSalary: number;
    targetBaseSalary: number;
    baselineCost: number;
    switchCost: number;
  };
}

export const useLocationSwitchOptimizer = ({
  fromTrackId,
  toTrackId,
  topN = 5
}: {
  fromTrackId?: string;
  toTrackId?: string;
  topN?: number;
}) => {
  return useQuery({
    queryKey: ['location-switch-optimizer', fromTrackId, toTrackId, topN],
    queryFn: async (): Promise<LocationOptimizationResult> => {
      if (!fromTrackId || !toTrackId || fromTrackId === '' || toTrackId === '') {
        throw new Error('Both track IDs are required');
      }

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      console.log('[LocationOptimizer] params:', { fromTrackId, toTrackId, enabled: !!(fromTrackId && toTrackId) });

      // Prepare headers for all users
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (user.isDevUser) {
        headers['x-dev-user-id'] = user.id;
      }

      const { data, error } = await supabase.functions.invoke('location-switch-optimizer', {
        body: {
          fromTrackId,
          toTrackId,
          topN
        },
        headers
      });

      if (error) {
        console.error('Location optimizer error:', error);
        throw new Error(error.message || 'Failed to optimize locations');
      }

      if (!data) {
        throw new Error('No data returned from location optimizer');
      }

      return data;
    },
    enabled: !!(fromTrackId && toTrackId && fromTrackId !== '' && toTrackId !== ''),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });
};