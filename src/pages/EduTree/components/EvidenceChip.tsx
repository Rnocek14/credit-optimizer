/**
 * Evidence Chip Component
 * Shows ACE/CLEP badges for courses with alternative credit options
 */

import { cn } from '@/lib/utils';

interface EvidenceChipProps {
  type: 'ACE' | 'CLEP';
  className?: string;
}

export function EvidenceChip({ type, className }: EvidenceChipProps) {
  const config = {
    ACE: {
      label: 'ACE',
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    },
    CLEP: {
      label: 'CLEP',
      className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    },
  };

  const { label, className: colorClass } = config[type];

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
        colorClass,
        className
      )}
      title={`${type} credit available`}
    >
      {label}
    </span>
  );
}
