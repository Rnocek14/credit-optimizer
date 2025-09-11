import React from 'react';
import { TRACKS, TrackId } from '../tracks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
    <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Track Comparison</h3>
        {(primary || comparison) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { onPrimary(null); onComparison(null); }}
            className="h-6 px-2"
          >
            <X className="w-3 h-3" />
            Clear All
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Primary:</label>
          <select
            value={primary ?? ''}
            onChange={e => {
              const value = (e.target.value || null) as TrackId | null;
              console.log('🎯 Primary track selected:', value);
              onPrimary(value);
            }}
            className="border border-border rounded px-3 py-1.5 text-sm bg-background min-w-[140px]"
          >
            <option value="">— Select Track —</option>
            {options.map(([id, track]) => (
              <option key={id} value={id} disabled={id === comparison}>
                {track.name}
              </option>
            ))}
          </select>
          {primary && (
            <Badge variant="outline" className="text-xs">
              {TRACKS[primary].specialization}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Compare:</label>
          <select
            value={comparison ?? ''}
            onChange={e => {
              const value = (e.target.value || null) as TrackId | null;
              console.log('🎯 Comparison track selected:', value);
              onComparison(value);
            }}
            className="border border-border rounded px-3 py-1.5 text-sm bg-background min-w-[140px]"
            disabled={!primary}
          >
            <option value="">{primary ? "— Add Comparison —" : "Select primary first"}</option>
            {primary && options.map(([id, track]) => (
              <option key={id} value={id} disabled={id === primary}>
                {track.name}
              </option>
            ))}
          </select>
          {comparison && (
            <Badge variant="secondary" className="text-xs">
              {TRACKS[comparison].specialization}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Track comparison info */}
      {primary && comparison && (
        <div className="text-xs text-muted-foreground bg-accent/20 rounded p-2">
          <div className="flex items-center gap-4">
            <span>📍 Shared foundation until: <strong>{TRACKS[primary].branchingPoint}</strong></span>
            <span>🎯 Both converge at: <strong>{TRACKS[primary].convergencePoint}</strong></span>
          </div>
        </div>
      )}
      
      {primary && !comparison && (
        <div className="text-xs text-muted-foreground bg-primary/10 rounded p-2">
          💡 Single track mode: Add a comparison track to see branching paths
        </div>
      )}
    </div>
  );
}