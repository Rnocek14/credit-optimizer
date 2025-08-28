import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QuotaData {
  success: boolean;
  limit_reached: boolean;
  remaining: number;
  used: number;
  limit: number;
  reset_date: string;
  current_period: string;
}

export function useQuotaCheck() {
  return useQuery({
    queryKey: ['quota-check'],
    queryFn: async (): Promise<QuotaData> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Return safe defaults for unauthenticated users
        return {
          success: false,
          limit_reached: true,
          remaining: 0,
          used: 0,
          limit: 0,
          reset_date: new Date().toISOString(),
          current_period: new Date().toISOString()
        };
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