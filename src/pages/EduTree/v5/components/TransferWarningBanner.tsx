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
      
      // ✅ Phase 3: Extract unique course keys (skip in-residence courses)
      const courseKeys = items
        .filter(i => (i.providerCode || '').toUpperCase() !== target.toUpperCase())
        .map(i => ({
          providerCode: (i.providerCode || '').toUpperCase(),
          courseId: i.courseId
        }));
      
      if (courseKeys.length === 0) return [];
      
      // ✅ Phase 3: Batch query all rules at once (1 DB call instead of N)
      const courseCodes = courseKeys.map(k => k.courseId);
      const { data: rules } = await supabase
        .from('credit_transfer_rules' as any)
        .select('*')
        .eq('target_institution', target.toUpperCase())
        .in('source_course_code', courseCodes);
      
      // Build lookup map: "PROVIDER::COURSE" → rule
      const rulesMap = new Map(
        (rules || []).map((r: any) => [
          `${r.source_institution}::${r.source_course_code}`,
          r
        ])
      );
      
      // Find violations
      const out: any[] = [];
      for (const key of courseKeys) {
        const ruleKey = `${key.providerCode}::${key.courseId}`;
        const rule = rulesMap.get(ruleKey);
        
        // Violation: no rule OR rule is rejected
        if (!rule || rule.acceptance_status === 'rejected') {
          const item = items.find(
            i => i.courseId === key.courseId && 
                 (i.providerCode || '').toUpperCase() === key.providerCode
          );
          if (item) out.push(item);
        }
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
