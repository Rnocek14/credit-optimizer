import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';

type Policy = {
  partner_code: string;
  partner_name: string;
  max_alt_credits: number;
  min_residency_credits: number;
  upper_division_min: number;
  notes: string | null;
};

export function AnchorSchoolSelector() {
  const { constraints, setConstraints } = usePlanBasket();

  const { data, isLoading } = useQuery({
    queryKey: ['partner-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_policies' as any)
        .select('partner_code, partner_name, max_alt_credits, min_residency_credits, upper_division_min, notes')
        .order('partner_name');
      if (error) throw error;
      return data as unknown as Policy[];
    },
  });

  return (
    <div className="flex items-center gap-2">
      <GraduationCap className="h-4 w-4 opacity-70" />
      <Select
        onValueChange={(v) => setConstraints({ target_school: v })}
        value={constraints.target_school}
        disabled={isLoading || !data?.length}
      >
        <SelectTrigger className="w-[320px]">
          <SelectValue placeholder={isLoading ? 'Loading schools…' : 'Select anchor school'} />
        </SelectTrigger>
        <SelectContent>
          {(data || []).map((p) => (
            <SelectItem key={p.partner_code} value={p.partner_code}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span>{p.partner_name}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline">{p.max_alt_credits} ACE</Badge>
                  <Badge variant="outline">{p.min_residency_credits} res</Badge>
                  <Badge variant="outline">{p.upper_division_min} UD</Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
