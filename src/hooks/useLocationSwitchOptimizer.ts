import { useQuery } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';

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

      const requestBody = {
        fromTrackId,
        toTrackId,
        topN
      };
      
      console.log('[LocationOptimizer] params:', { requestBody, enabled: !!(fromTrackId && toTrackId) });

      return await callEdgeFunction<LocationOptimizationResult>('location-switch-optimizer', requestBody);
    },
    enabled: !!(fromTrackId && toTrackId && fromTrackId !== '' && toTrackId !== ''),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });
};