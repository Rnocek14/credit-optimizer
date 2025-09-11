import React from 'react';
import { TRACKS, TrackId } from '../tracks';

interface CompareTracksBarProps {
  primary: TrackId | null;
  comparison: TrackId | null;
  onPrimary: (t: TrackId | null) => void;
  onComparison: (t: TrackId | null) => void;
}

export function CompareTracksBar({
  primary,
  comparison,
  onPrimary,
  onComparison,
}: CompareTracksBarProps) {
  const options = Object.entries(TRACKS);

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium">Primary track</label>
      <select
        value={primary ?? ''}
        onChange={e => onPrimary((e.target.value || null) as TrackId | null)}
        className="border border-border rounded px-3 py-1 text-sm bg-background"
      >
        <option value="">— choose —</option>
        {options.map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
      </select>

      <label className="text-sm font-medium">Compare to</label>
      <select
        value={comparison ?? ''}
        onChange={e => onComparison((e.target.value || null) as TrackId | null)}
        className="border border-border rounded px-3 py-1 text-sm bg-background"
      >
        <option value="">(none)</option>
        {options.map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
      </select>
    </div>
  );
}