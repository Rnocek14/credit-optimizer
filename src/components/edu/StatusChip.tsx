import React from 'react';
import clsx from 'clsx';
// import { EvidenceMeter } from './EvidenceMeter'; // Section 1: Migrating to unified status system
import { StatusChip as UnifiedStatusChip } from './status/StatusChip';
import type { NodeState } from './status';

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
 * Legacy wrapper - migrating to unified status system in src/components/edu/status/
 * This component maps old RequirementStatus to the new NodeState system.
 */
export function StatusChip({
  status = 'none',
  evidencePercent,
  className,
}: StatusChipProps) {
  // Map legacy status to new NodeState
  const nodeState: NodeState = 
    status === 'accepted' ? 'completed' :
    status === 'completed' ? 'completed' :
    status === 'locked' ? 'locked' :
    status === 'inProgress' ? 'inProgress' :
    'unknown';

  // Map evidencePercent to Evidence object
  const evidence = evidencePercent !== null && evidencePercent !== undefined
    ? { accepted: evidencePercent, total: 100 }
    : undefined;

  return (
    <div className={className}>
      <UnifiedStatusChip evidence={evidence} nodeState={nodeState} />
    </div>
  );
}
