/**
 * Course Status Chip & Evidence Meter Components
 * Standardizes the "Accepted [50%]" vs. "black rectangle" semantics
 */

import { cn } from '@/lib/utils';

export type CourseStatus =
  | 'none'
  | 'selected'
  | 'inProgress'
  | 'accepted'
  | 'completed'
  | 'locked';

interface StatusChipProps {
  status: CourseStatus;
  evidencePercent?: number;
  lockedReason?: string;
  className?: string;
}

export function StatusChip({ status, evidencePercent = 0, lockedReason, className }: StatusChipProps) {
  if (status === 'accepted') {
    return (
      <span
        className={cn(
          'ml-2 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 border border-green-500/20',
          className
        )}
        title={`Accepted transfer credit (${evidencePercent}% match)`}
      >
        Accepted {evidencePercent > 0 ? `(${evidencePercent}%)` : ''}
      </span>
    );
  }

  if (status === 'completed') {
    return (
      <span
        className={cn(
          'ml-2 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 border border-blue-500/20',
          className
        )}
        title="Course completed"
      >
        Completed
      </span>
    );
  }

  if (status === 'locked') {
    return (
      <span
        className={cn(
          'ml-2 rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5 border border-border',
          className
        )}
        title={lockedReason ?? 'Prerequisites not met'}
      >
        Locked
      </span>
    );
  }

  // Default: render evidence meter for none/inProgress/selected
  return <EvidenceMeter percent={status === 'inProgress' ? evidencePercent : 0} className={className} />;
}

interface EvidenceMeterProps {
  percent?: number;
  className?: string;
}

export function EvidenceMeter({ percent = 0, className }: EvidenceMeterProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <span
      className={cn('ml-2 inline-flex h-[10px] w-16 rounded-sm bg-black/80 dark:bg-white/20 overflow-hidden', className)}
      title={`Evidence: ${safePercent}%`}
    >
      <span
        className="h-full rounded-sm bg-white/90 dark:bg-white/80 transition-all duration-300"
        style={{ width: `${safePercent}%` }}
      />
    </span>
  );
}
