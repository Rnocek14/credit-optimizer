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
      console.log('[LocationOptimizer] Starting optimization with params:', { 
        fromTrackId, 
        toTrackId, 
        topN,
        hasFromTrack: !!fromTrackId,
        hasToTrack: !!toTrackId,
        trackIdsValid: fromTrackId !== '' && toTrackId !== '',
        timestamp: new Date().toISOString()
      });

      if (!fromTrackId || !toTrackId || fromTrackId === '' || toTrackId === '') {
        console.error('[LocationOptimizer] Missing required track IDs:', { fromTrackId, toTrackId });
        throw new Error('Both track IDs are required');
      }

      const requestBody = {
        fromTrackId,
        toTrackId,
        topN
      };
      
      console.log('[LocationOptimizer] Calling edge function with validated params:', { 
        requestBody, 
        enabled: !!(fromTrackId && toTrackId),
        functionName: 'location-switch-optimizer'
      });

      try {
        const result = await callEdgeFunction<LocationOptimizationResult>('location-switch-optimizer', requestBody);
        
        console.log('[LocationOptimizer] Successfully received response:', {
          hasResult: !!result,
          locationCount: result?.rankedLocations?.length || 0,
          fromTrack: result?.fromTrack,
          toTrack: result?.toTrack,
          hasAssumptions: !!result?.assumptions
        });

        return result;
      } catch (error) {
        console.error('[LocationOptimizer] Edge function call failed:', {
          error: error instanceof Error ? error.message : String(error),
          errorType: error?.constructor?.name,
          params: { fromTrackId, toTrackId, topN }
        });
        throw error;
      }
    },
    enabled: !!(fromTrackId && toTrackId && fromTrackId !== '' && toTrackId !== ''),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });
};