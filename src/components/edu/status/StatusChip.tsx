import { resolveStatus, Evidence, NodeState } from './index';

export function StatusChip({ evidence, nodeState }: { evidence?: Evidence; nodeState: NodeState }) {
  const { chip, percent } = resolveStatus(evidence, nodeState);
  return (
    <span className={`chip chip--${chip.toLowerCase()}`}>
      {chip}{typeof percent === 'number' ? ` (${percent}%)` : ''}
    </span>
  );
}
