import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { SwitchResultSchema, RiskAnalysisSchema } from '@/types/switching';

interface Params {
  fromTrackId?: string;
  toTrackId?: string;
  locationId?: string;
  userAge?: number;
}

export const useSwitchingEngine = ({ fromTrackId, toTrackId, locationId, userAge }: Params) => {
  return useQuery({
    queryKey: ['switching-engine', fromTrackId, toTrackId, locationId, userAge],
    enabled: !!(fromTrackId && toTrackId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      if (!fromTrackId || !toTrackId) throw new Error('Missing tracks');

      const user = await getCurrentUser();
      if (!user) throw new Error('Authentication required');

      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (user.isDevUser) headers['x-dev-user-id'] = user.id;

      const [switchRes, riskRes] = await Promise.all([
        supabase.functions.invoke('calculate-career-switch', {
          body: { fromTrackId, toTrackId, locationId }, headers: user.isDevUser ? headers : undefined
        }),
        supabase.functions.invoke('career-risk-analyzer', {
          body: { trackId: toTrackId, userAge }, headers: user.isDevUser ? headers : undefined
        })
      ]);

      if (switchRes.error) throw new Error(switchRes.error.message || 'Switch calc failed');
      if (riskRes.error) throw new Error(riskRes.error.message || 'Risk calc failed');

      const switchData = SwitchResultSchema.parse(switchRes.data);
      const riskData = RiskAnalysisSchema.parse(riskRes.data);

      return { switchData, riskData };
    }
  });
};
