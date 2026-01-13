import { usePlanBasket } from '../state/usePlanBasket';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function TransferWarningBanner({ onShowAlternatives }: { onShowAlternatives?: (violations: any[]) => void }) {
  const { items, constraints } = usePlanBasket();
  const target = constraints.target_school;

  const { data: violations } = useQuery({
    queryKey: ['violations', target, items],
    queryFn: async () => {
      if (!target || items.length === 0) return [];
      const out: any[] = [];
      for (const item of items) {
        // Skip items that are already at the target school (in-residence)
        if ((item.providerCode || '').toUpperCase() === target.toUpperCase()) {
          continue;
        }

        // Use normalized columns for deterministic, index-optimized joins
        const { data: rule } = await supabase
          .from('credit_transfer_rules' as any)
          .select('*')
          .eq('source_institution_norm', (item.providerCode || '').toUpperCase())
          .eq('source_course_code_norm', (item.courseId || '').toLowerCase())
          .eq('target_institution_norm', target.toUpperCase())
          .maybeSingle();

        if (!rule || (rule as any)?.acceptance_status === 'rejected') out.push(item);
      }
      return out;
    },
    enabled: !!target && items.length > 0,
  });

  if (!target || !violations || violations.length === 0) return null;

  const lostCredits = violations.reduce((s, v) => s + (v.credits || 0), 0);
  const lostCost = violations.reduce((s, v) => s + (v.cost_usd || 0), 0);
  const lostWeeks = violations.reduce((s, v) => s + (v.duration_weeks || 0), 0);

  return (
    <Alert variant="destructive" className="my-3">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Transfer Issues Detected</AlertTitle>
      <AlertDescription>
        <div className="text-sm">
          {violations.length} course(s) won't transfer to <span className="font-semibold">{target}</span>.
          You'd lose {lostCredits} credits{lostCost ? <> (${Math.round(lostCost)})</> : null}
          {lostWeeks ? <> and +{lostWeeks} weeks</> : null}.
        </div>
        <div className="text-xs mt-1 opacity-80">
          Courses: {violations.map((v) => v.title || v.courseId).join(', ')}
        </div>
        {onShowAlternatives && (
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={() => onShowAlternatives?.(violations)}>
              Show Alternatives →
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
