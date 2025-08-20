import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

export const useBacktrackAnalyzer = ({ fromTrackId, toTrackId, enabled }: { fromTrackId?: string; toTrackId?: string; enabled?: boolean; }) => {
  return useQuery({
    queryKey: ['backtrack-analyzer', fromTrackId, toTrackId],
    enabled: !!(enabled && fromTrackId && toTrackId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Authentication required');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user.isDevUser) headers['x-dev-user-id'] = user.id;

      const { data, error } = await supabase.functions.invoke('backtrack-analyzer', {
        body: { fromTrackId, toTrackId },
        headers: user.isDevUser ? headers : undefined
      });

      if (error) throw new Error(error.message || 'Backtrack analysis failed');
      return data as {
        sunkTimeMonths: number;
        transferCreditReclaimed: number;
        newBreakEvenMonths: number;
        netTimeImpactMonths: number;
      };
    }
  });
};
