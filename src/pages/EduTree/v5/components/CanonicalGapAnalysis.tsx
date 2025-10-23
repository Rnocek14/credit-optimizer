import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { usePlanBasket } from '../state/usePlanBasket';
import { useUserEvidence } from '@/pages/EduTree/hooks/useUserEvidence';
import { getCanonicalIds } from '../data/canonicalMappings';

type Props = { 
  requiredCanonicalIds: string[]; 
  title?: string;
};

/**
 * Phase 1c: Canonical Gap Analysis Component
 * Shows Completed / In Plan / Remaining canonical requirements
 */
export function CanonicalGapAnalysis({ requiredCanonicalIds, title = "Degree Progress" }: Props) {
  const basket = usePlanBasket(s => s.items);
  const evidence = useUserEvidence();

  const { completed, planned, remaining } = useMemo(() => {
    const doneCanon = new Set<string>();
    const plannedCanon = new Set<string>();

    // Evidence → completed canonicals
    (evidence?.raw?.completed ?? []).forEach(courseId => {
      getCanonicalIds('', courseId).forEach(c => doneCanon.add(c));
    });

    // Basket → planned canonicals
    basket.forEach(item => {
      const providerCode = (item as any).providerCode || '';
      getCanonicalIds(providerCode, item.courseId).forEach(c => {
        if (!doneCanon.has(c)) plannedCanon.add(c);
      });
    });

    const remaining = requiredCanonicalIds.filter(c => !doneCanon.has(c) && !plannedCanon.has(c));
    const planned = requiredCanonicalIds.filter(c => plannedCanon.has(c));
    const completed = requiredCanonicalIds.filter(c => doneCanon.has(c));

    return { completed, planned, remaining };
  }, [basket, evidence?.raw?.completed, requiredCanonicalIds]);

  const total = requiredCanonicalIds.length || 1;
  const pct = Math.round((completed.length / total) * 100);

  return (
    <Card className="p-3 border-muted">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-sm text-muted-foreground">{completed.length}/{total} ({pct}%)</div>
      </div>

      <div className="grid gap-2">
        {completed.length > 0 && (
          <div className="text-xs">
            <span className="font-medium text-green-600">Completed:</span> {completed.join(', ')}
          </div>
        )}
        {planned.length > 0 && (
          <div className="text-xs">
            <span className="font-medium text-blue-600">In Plan:</span> {planned.join(', ')}
          </div>
        )}
        {remaining.length > 0 && (
          <div className="text-xs">
            <span className="font-medium text-orange-600">Remaining:</span> {remaining.join(', ')}
          </div>
        )}
        {remaining.length === 0 && planned.length === 0 && completed.length === total && (
          <div className="text-xs text-emerald-600 font-medium">All requirements met 🎉</div>
        )}
      </div>
    </Card>
  );
}
