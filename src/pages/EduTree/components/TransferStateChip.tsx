/**
 * Transfer State Chip Component
 * Shows transfer state (accepted/conditional/rejected/unknown) with appropriate styling
 */

import { cn } from '@/lib/utils';

export type TransferState = 'accepted' | 'conditional' | 'rejected' | 'unknown';

interface TransferStateChipProps {
  state: TransferState;
  score?: number;
  className?: string;
}

export function TransferStateChip({ state, score, className }: TransferStateChipProps) {
  const stateConfig = {
    accepted: {
      label: 'Accepted',
      className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    },
    conditional: {
      label: 'Conditional',
      className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    },
    unknown: {
      label: 'Unknown',
      className: 'bg-muted text-muted-foreground border-border',
    },
  };

  const config = stateConfig[state];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
        config.className,
        className
      )}
      title={score !== undefined ? `Transfer score: ${(score * 100).toFixed(0)}%` : undefined}
    >
      {config.label}
      {score !== undefined && score > 0 && (
        <span className="opacity-60">({(score * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
}
