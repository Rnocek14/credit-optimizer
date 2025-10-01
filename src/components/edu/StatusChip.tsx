import React from 'react';
import clsx from 'clsx';
import { EvidenceMeter } from './EvidenceMeter';

export type RequirementStatus =
  | 'accepted'
  | 'completed'
  | 'locked'
  | 'inProgress'
  | 'selected'
  | 'none';

type StatusChipProps = {
  status?: RequirementStatus | null;
  evidencePercent?: number | null;
  className?: string;
};

/**
 * Renders a semantic status pill. Falls back to an EvidenceMeter
 * for non-terminal states (none/inProgress/selected).
 */
export function StatusChip({
  status = 'none',
  evidencePercent,
  className,
}: StatusChipProps) {
  if (status === 'accepted') {
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400',
          className
        )}
      >
        Accepted{(evidencePercent ?? 0) > 0 ? ` (${Math.round(evidencePercent!)}%)` : ''}
      </span>
    );
  }

  if (status === 'completed') {
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary',
          className
        )}
      >
        Completed
      </span>
    );
  }

  if (status === 'locked') {
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground',
          className
        )}
      >
        Locked
      </span>
    );
  }

  // For none/inProgress/selected → use the evidence meter, in quiet mode (no % text)
  return <EvidenceMeter percent={evidencePercent ?? null} quiet className={className} />;
}
