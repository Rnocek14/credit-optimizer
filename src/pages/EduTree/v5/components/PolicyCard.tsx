import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';

export function PolicyCard() {
  const { items, constraints } = usePlanBasket();
  const anchor = constraints.target_school;

  const { data: policy } = useQuery({
    queryKey: ['policy', anchor],
    queryFn: async () => {
      if (!anchor) return null;
      const { data, error } = await supabase
        .from('partner_policies')
        .select('*')
        .eq('partner_code', anchor)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!anchor,
  });

  if (!anchor || !policy) return null;

  const aceCredits = items
    .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
    .reduce((s, i) => s + (i.credits || 0), 0);

  const residencyCredits = items
    .filter(i => i.providerType === 'university')
    .reduce((s, i) => s + (i.credits || 0), 0);

  const upperDivCredits = items
    .filter(i => (i.level || 0) >= 300)
    .reduce((s, i) => s + (i.credits || 0), 0);

  const acePct = Math.min(100, (aceCredits / policy.max_alt_credits) * 100 || 0);
  const resPct = Math.min(100, (residencyCredits / policy.min_residency_credits) * 100 || 0);
  const udPct  = Math.min(100, (upperDivCredits / policy.upper_division_min) * 100 || 0);

  const aceWarn = acePct >= 95;
  const resWarn = resPct < 100;
  const udWarn  = udPct < 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Policy: {policy.partner_name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 text-sm">ACE/Alternative Credits — {aceCredits}/{policy.max_alt_credits}</div>
          <Progress value={acePct} className={aceWarn ? "[&>div]:bg-red-500" : acePct >= 80 ? "[&>div]:bg-yellow-500" : ""}/>
          {aceWarn && (
            <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> ACE credit cap nearly/exceeded.
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 text-sm">In-Residence Credits — {residencyCredits}/{policy.min_residency_credits}</div>
          <Progress value={resPct} className={resWarn ? "[&>div]:bg-yellow-500" : ""}/>
          {resWarn && (
            <div className="mt-1 text-xs text-yellow-700 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Need more in-residence credits.
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 text-sm">Upper Division (300+) — {upperDivCredits}/{policy.upper_division_min}</div>
          <Progress value={udPct} className={udWarn ? "[&>div]:bg-yellow-500" : ""}/>
          {udWarn && (
            <div className="mt-1 text-xs text-yellow-700 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Need additional upper-division credits.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
