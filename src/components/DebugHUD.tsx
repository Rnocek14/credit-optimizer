import React from 'react';
import { useLocation } from 'react-router-dom';

export function DebugHUD({ blocks }: { blocks: any[] }) {
  const { search } = useLocation();
  const debugOn = new URLSearchParams(search).get('debug') === '1';
  if (!debugOn) return null;

  const counts = blocks.reduce((acc, b) => {
    const pid = b.program_id ?? 'shared';
    acc[pid] = (acc[pid] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ghosts = blocks.filter(b => b.is_empty_year === true).map(b => b.id);
  const dropped = (blocks as any)._droppedIds ?? [];

  return (
    <div style={{
      position: 'absolute', right: 12, top: 12, zIndex: 9999,
      background: 'rgba(20,20,20,0.85)', color: '#fff',
      padding: '10px 12px', borderRadius: 8, fontSize: 12, maxWidth: 320
    }}>
      <div style={{fontWeight:600, marginBottom:6}}>Debug HUD</div>
      <div><b>Programs present:</b> {Object.entries(counts).map(([k,v])=>`${k}:${v}`).join(', ') || '—'}</div>
      <div><b>Ghosts:</b> {ghosts.length ? ghosts.join(', ') : '—'}</div>
      <div><b>Pruned IDs:</b> {dropped.length ? dropped.join(', ') : '—'}</div>
    </div>
  );
}