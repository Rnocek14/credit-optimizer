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
      if (!fromTrackId || !toTrackId || fromTrackId === '' || toTrackId === '') {
        throw new Error('Both track IDs are required');
      }

      const switchBody = { fromTrackId, toTrackId, locationId };
      const riskBody = { trackId: toTrackId, userAge };
      
      console.log('[useSwitchingEngine] invoking functions with:', { switchBody, riskBody });

      const [switchData, riskData] = await Promise.all([
        callEdgeFunction('calculate-career-switch', switchBody),
        callEdgeFunction('career-risk-analyzer', riskBody)
      ]);

      return {
        switchData: SwitchResultSchema.parse(switchData),
        riskData: RiskAnalysisSchema.parse(riskData)
      };

    }
  });
};
