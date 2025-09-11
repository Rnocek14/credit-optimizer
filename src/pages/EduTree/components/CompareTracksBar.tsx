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
    <div className={`flex flex-col gap-3 p-4 rounded-lg border-2 shadow-lg ${
      !primary && !comparison 
        ? 'bg-blue-50 border-blue-300 animate-pulse' 
        : 'bg-secondary/50 border-primary/30'
    }`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${
          !primary && !comparison ? 'text-blue-700' : 'text-foreground'
        }`}>
          {!primary && !comparison ? '👆 Select Track to Begin' : '🎯 Track Comparison'}
        </h3>
        {(primary || comparison) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { onPrimary(null); onComparison(null); }}
            className="h-6 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-600"
          >
            <X className="w-3 h-3" />
            Clear All
          </Button>
        )}
        {!primary && !comparison && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPrimary('web')}
            className="h-6 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600"
          >
            🚀 Quick Test
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
            className="border-2 border-primary/30 rounded px-3 py-1.5 text-sm bg-background min-w-[140px] font-medium focus:border-primary"
          >
            <option value="">🎯 Select Track</option>
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
            className="border-2 border-secondary/30 rounded px-3 py-1.5 text-sm bg-background min-w-[140px] font-medium focus:border-secondary"
            disabled={!primary}
          >
            <option value="">{primary ? "🔄 Add Comparison" : "Select primary first"}</option>
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