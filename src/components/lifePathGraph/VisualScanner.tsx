import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type TierCounts = { on: number; rel: number; off: number };
type ScanSummary = { crossings?: number; through?: number };

interface Props {
  open: boolean;
  onToggle(): void;
  nodes: number;
  edges: number;
  labels: number;
  tiers: TierCounts;
  summary?: ScanSummary;
}

export function VisualScanner({ open, onToggle, nodes, edges, labels, tiers, summary }: Props) {
  const crossings = summary?.crossings ?? 0;
  const through = summary?.through ?? 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onToggle}>
          {open ? 'Hide Visual Scan' : 'Show Visual Scan'}
        </Button>
        <Badge variant={crossings ? 'destructive' : 'secondary'}>Crossings: {crossings}</Badge>
        <Badge variant={through ? 'destructive' : 'secondary'}>Through-nodes: {through}</Badge>
      </div>

      {open && (
        <div className="mt-2 rounded-lg border p-3 text-sm grid gap-2">
          <div className="flex gap-4">
            <span>Nodes <b>{nodes}</b></span>
            <span>Edges <b>{edges}</b></span>
            <span>Labels <b>{labels}</b></span>
          </div>
          <div className="flex gap-4">
            <span>On-path <Badge variant="secondary">{tiers.on}</Badge></span>
            <span>Related <Badge variant="secondary">{tiers.rel}</Badge></span>
            <span>Off <Badge variant="secondary">{tiers.off}</Badge></span>
          </div>
          <div className="text-muted-foreground">
            {crossings === 0 && through === 0 ? 'Issues (0) — No issues found!' : 'Review issues above.'}
          </div>
        </div>
      )}
    </div>
  );
}