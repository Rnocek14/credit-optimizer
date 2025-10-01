/**
 * Skeleton Card for Pills
 * Prevents layout flicker during marketplace data loading
 */

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PillSkeletonCardProps {
  height?: number;
  className?: string;
}

export function PillSkeletonCard({ height = 220, className }: PillSkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card shadow-sm p-3 space-y-2',
        className
      )}
      style={{ height }}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-32" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
