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

        // Log response keys for debugging schema mismatches
        console.log('[Switch] keys:', Object.keys(switchData || {}));
        console.log('[Risk] keys:', Object.keys(riskData || {}));

        // Use safeParse for better error handling
        const switchResult = SwitchResultSchema.safeParse(switchData);
        if (!switchResult.success) {
          console.error('[useSwitchingEngine] Switch data schema mismatch:', {
            keys: Object.keys(switchData || {}),
            issues: switchResult.error.issues
          });
          throw new Error('schema_error: The server response shape changed. Please retry.');
        }

        const riskResult = RiskAnalysisSchema.safeParse(riskData);
        if (!riskResult.success) {
          console.error('[useSwitchingEngine] Risk data schema mismatch:', {
            keys: Object.keys(riskData || {}),
            issues: riskResult.error.issues
          });
          throw new Error('schema_error: The server response shape changed. Please retry.');
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
