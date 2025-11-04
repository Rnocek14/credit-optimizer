import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reRankTemplates } from '@/lib/analytics/reRankTemplates';
import type { WeightsRow } from '@/lib/analytics/useSmartWeights';

type Props = { 
  weights: WeightsRow; 
  open: boolean;
  onClose: () => void;
};

async function getExampleTemplatesForPreview() {
  // deterministic small set (~6) with varied cost/weeks/cri
  return [
    { template: { id: 't1', label: 'ACE Low Cost', providerType: 'ACE' },
      validation: { score: 90, impact: { costDelta: -300, weeksDelta: -2, criDelta: 8 }, transferStatus: { accepted: true } } },
    { template: { id: 't2', label: 'CLEP Fast', providerType: 'CLEP' },
      validation: { score: 88, impact: { costDelta: -100, weeksDelta: -4, criDelta: 5 }, transferStatus: { accepted: true } } },
    { template: { id: 't3', label: 'NCCRS Higher CRI', providerType: 'NCCRS' },
      validation: { score: 85, impact: { costDelta: 50, weeksDelta: 1, criDelta: 20 }, transferStatus: { accepted: true } } },
    { template: { id: 't4', label: 'Other Costly', providerType: 'other' },
      validation: { score: 92, impact: { costDelta: 400, weeksDelta: 4, criDelta: 2 }, transferStatus: { accepted: false } } },
    { template: { id: 't5', label: 'ACE Big CRI', providerType: 'ACE' },
      validation: { score: 80, impact: { costDelta: 0, weeksDelta: 0, criDelta: 35 }, transferStatus: { accepted: true } } },
    { template: { id: 't6', label: 'CLEP Neutral', providerType: 'CLEP' },
      validation: { score: 78, impact: { costDelta: 0, weeksDelta: 0, criDelta: 0 }, transferStatus: { accepted: true } } },
  ];
}

export default function PreviewWeightsModal({ weights, open, onClose }: Props) {
  const [ranked, setRanked] = useState<any[]>([]);
  
  useEffect(() => {
    if (!open) return;
    (async () => {
      const items = await getExampleTemplatesForPreview();
      setRanked(reRankTemplates(items, weights));
    })();
  }, [weights, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Preview reorder — v{weights.version}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 mt-4">
          {ranked.map((t, i) => (
            <div key={t.template.id} className="flex items-center justify-between border rounded p-2">
              <div className="truncate">{i + 1}. {t.template.label}</div>
              <div className="text-xs opacity-70">smart {t.smartScore?.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
