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
    queryKey: ['partner-policy', anchor],
    queryFn: async () => {
      if (!anchor) return null;
      const { data, error } = await supabase
        .from('partner_policies' as any)
        .select('*')
        .eq('partner_code', anchor)
        .maybeSingle();
      if (error) throw error;
      return data as any;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy: {policy.partner_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ACE */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>ACE/Alternative Credits</span>
            <span className="font-mono">{aceCredits}/{policy.max_alt_credits}</span>
          </div>
          <Progress value={acePct} className={`${acePct >= 95 ? '[&>div]:bg-red-500' : acePct >= 80 ? '[&>div]:bg-yellow-500' : ''}`} />
          {acePct >= 95 && (
            <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
              <AlertCircle className="h-3 w-3" /> ACE credit cap nearly/exceeded.
            </div>
          )}
        </div>

        {/* Residency */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>In-Residence Credits</span>
            <span className="font-mono">{residencyCredits}/{policy.min_residency_credits}</span>
          </div>
          <Progress value={resPct} className={`${resPct < 100 ? '[&>div]:bg-yellow-500' : ''}`} />
          {resPct < 100 && (
            <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
              <AlertCircle className="h-3 w-3" /> Need more in-residence credits.
            </div>
          )}
        </div>

        {/* Upper Division */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Upper Division (300+)</span>
            <span className="font-mono">{upperDivCredits}/{policy.upper_division_min}</span>
          </div>
          <Progress value={udPct} className={`${udPct < 100 ? '[&>div]:bg-yellow-500' : ''}`} />
          {udPct < 100 && (
            <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
              <AlertCircle className="h-3 w-3" /> Need additional upper-division credits.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
