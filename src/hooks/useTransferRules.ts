import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TransferRule {
  id: string;
  to_program_id: string;
  rule_kind: string;
  value: number;
  description: string | null;
  active: boolean;
}

export function useTransferRules(programId: string) {
  return useQuery({
    queryKey: ['transfer-rules', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_rules')
        .select('*')
        .eq('to_program_id', programId)
        .eq('active', true);

      if (error) throw error;
      return (data || []) as TransferRule[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
