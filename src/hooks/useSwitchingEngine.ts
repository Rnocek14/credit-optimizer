import { useQuery } from '@tanstack/react-query';
import { SwitchResultSchema, RiskAnalysisSchema } from '@/types/switching';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';

interface Params {
  fromTrackId?: string;
  toTrackId?: string;
  locationId?: string;
  userAge?: number;
}

export const useSwitchingEngine = ({ fromTrackId, toTrackId, locationId, userAge }: Params) => {
  return useQuery({
    queryKey: ['switching-engine', fromTrackId, toTrackId, locationId, userAge],
    enabled: !!(fromTrackId && toTrackId && fromTrackId !== '' && toTrackId !== ''),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      console.log('[useSwitchingEngine] Starting analysis with params:', { 
        fromTrackId, 
        toTrackId, 
        locationId, 
        userAge,
        hasFromTrack: !!fromTrackId,
        hasToTrack: !!toTrackId,
        trackIdsValid: fromTrackId !== '' && toTrackId !== ''
      });

      if (!fromTrackId || !toTrackId || fromTrackId === '' || toTrackId === '') {
        console.error('[useSwitchingEngine] Missing required track IDs:', { fromTrackId, toTrackId });
        throw new Error('Both track IDs are required');
      }

      const switchBody = { fromTrackId, toTrackId, locationId };
      const riskBody = { trackId: toTrackId, userAge };
      
      console.log('[useSwitchingEngine] Calling edge functions with validated params:', { 
        switchBody, 
        riskBody,
        timestamp: new Date().toISOString()
      });

      try {
        const [switchData, riskData] = await Promise.all([
          callEdgeFunction('calculate-career-switch', switchBody),
          callEdgeFunction('career-risk-analyzer', riskBody)
        ]);

        console.log('[useSwitchingEngine] Successfully received responses:', {
          hasSwitchData: !!switchData,
          hasRiskData: !!riskData,
          switchDataKeys: switchData ? Object.keys(switchData) : [],
          riskDataKeys: riskData ? Object.keys(riskData) : []
        });

        // Use safeParse for better error handling
        const switchResult = SwitchResultSchema.safeParse(switchData);
        if (!switchResult.success) {
          console.error('[useSwitchingEngine] Switch data schema mismatch:', switchResult.error.format());
          throw new Error('server_error: Unexpected response shape from switch calculator');
        }

        const riskResult = RiskAnalysisSchema.safeParse(riskData);
        if (!riskResult.success) {
          console.error('[useSwitchingEngine] Risk data schema mismatch:', riskResult.error.format());
          throw new Error('server_error: Unexpected response shape from risk analyzer');
        }

        return {
          switchData: switchResult.data,
          riskData: riskResult.data
        };
      } catch (error) {
        console.error('[useSwitchingEngine] Edge function call failed:', {
          error: error instanceof Error ? error.message : String(error),
          errorType: error?.constructor?.name,
          params: { fromTrackId, toTrackId, locationId, userAge }
        });
        throw error;
      }
    }
  });
};
