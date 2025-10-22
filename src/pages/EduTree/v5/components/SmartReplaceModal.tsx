import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlanBasket } from '../state/usePlanBasket';
import { findTransferableAlternatives, type MarketplaceOptionLite } from '../utils/findTransferableAlternatives';
import { TransferBadge } from './TransferBadge';

interface Props {
  open: boolean;
  onClose: () => void;
  violations: any[];
  targetSchool: string;
}

export function SmartReplaceModal({ open, onClose, violations, targetSchool }: Props) {
  const [loading, setLoading] = useState(false);
  const [alts, setAlts] = useState<Record<string, MarketplaceOptionLite[]>>({});
  const { removeItem, addItem } = usePlanBasket();

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const out: Record<string, MarketplaceOptionLite[]> = {};
      for (const v of violations) {
        out[v.courseId] = await findTransferableAlternatives({ targetSchool });
      }
      setAlts(out);
      setLoading(false);
    })();
  }, [open, targetSchool, violations]);

  const replace = (bad: any, good: MarketplaceOptionLite) => {
    removeItem(bad.courseId);
    addItem({
      moduleId: bad.moduleId,
      courseId: good.code,
      title: good.title,
      credits: good.credits,
      cost_usd: good.cost_usd ?? undefined,
      duration_weeks: good.duration_weeks ?? undefined,
      cri_score: good.cri_score ?? 0,
      workload_weekly_hours: (good.credits || 3) * 2.5,
      status: 'pinned',
      level: good.level ?? 100,
      providerCode: good.providerCode ?? undefined,
      providerType: (good.providerType as any) ?? undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggested Alternatives that Transfer</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">Finding alternatives…</div>
        ) : (
          <div className="space-y-6">
            {violations.map((v) => (
              <div key={v.courseId} className="space-y-2">
                <div className="font-medium">{v.title || v.courseId}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(alts[v.courseId] || []).map((alt) => (
                    <div key={alt.code} className="border rounded-xl p-3 flex flex-col gap-2">
                      <div>
                        <div className="font-medium text-sm">{alt.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {alt.providerCode} • {alt.credits}cr • {alt.duration_weeks ?? '—'} wks • ${alt.cost_usd ?? '—'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <TransferBadge
                          providerCode={alt.providerCode || ''}
                          providerType={alt.providerType || undefined}
                          courseCode={alt.code}
                        />
                        <Button size="sm" onClick={() => replace(v, alt)}>Replace</Button>
                      </div>
                    </div>
                  ))}
                  {!(alts[v.courseId]?.length) && (
                    <div className="text-sm text-muted-foreground col-span-2">No transferable matches found yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
