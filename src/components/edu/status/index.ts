export type Evidence = { accepted?: number; pending?: number; rejected?: number; total?: number };
export type NodeState = 'locked' | 'inProgress' | 'completed' | 'unknown';

export function resolveStatus(e: Evidence | undefined, nodeState: NodeState) {
  if (nodeState === 'locked')    return { chip: 'Locked' as const };
  if (nodeState === 'completed') return { chip: 'Completed' as const };
  if (!e || !e.total)            return { chip: 'Unknown'  as const };

  const pct = Math.round(((e.accepted ?? 0) / (e.total || 1)) * 100);
  if ((e.accepted ?? 0) > 0) return { chip: 'Accepted' as const, percent: pct };
  if ((e.pending  ?? 0) > 0) return { chip: 'Pending'  as const, percent: pct };
  if ((e.rejected ?? 0) > 0) return { chip: 'Rejected' as const, percent: 0 };
  return { chip: 'Unknown' as const };
}
