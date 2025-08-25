import { useQuery } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';


export const useBacktrackAnalyzer = ({ fromTrackId, toTrackId, enabled }: { fromTrackId?: string; toTrackId?: string; enabled?: boolean; }) => {
  return useQuery({
    queryKey: ['backtrack-analyzer', fromTrackId, toTrackId],
    enabled: !!(enabled && fromTrackId && toTrackId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      type BacktrackResult = {
        sunkTimeMonths: number;
        transferCreditReclaimed: number;
        newBreakEvenMonths: number;
        netTimeImpactMonths: number;
        fromTrack?: string;
        toTrack?: string;
      };

      const data = await callEdgeFunction<BacktrackResult>('backtrack-analyzer', { fromTrackId, toTrackId });
      return data;
    }
  });
};
