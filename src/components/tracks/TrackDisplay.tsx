import React from 'react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useTracks } from '@/hooks/useTracks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Target, TrendingUp } from 'lucide-react';

interface TrackDisplayProps {
  className?: string;
}

export const TrackDisplay: React.FC<TrackDisplayProps> = ({ className }) => {
  const activeTrackId = useActiveTrackStore((s) => s.activeTrackId);
  const { tracks, isLoading } = useTracks();
  
  const activeTrack = tracks?.find(t => t.id === activeTrackId);
  
  // Debug logging
  React.useEffect(() => {
    console.log('📊 TrackDisplay state update:', { 
      activeTrackId, 
      tracksCount: tracks?.length, 
      activeTrack: activeTrack?.track_name,
      isLoading
    });
  }, [activeTrackId, tracks, activeTrack, isLoading]);

  if (isLoading) {
    return (
      <Card className={`${className || ''} animate-fade-in`}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Target className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground">Loading tracks...</h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeTrack) {
    return (
      <Card className={`${className || ''} animate-fade-in border-dashed border-2`}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground">No track selected</h3>
            <p className="text-sm text-muted-foreground">Choose a career track to see your progress and goals</p>
            <div className="mt-4 px-4 py-2 bg-warning/10 rounded-lg">
              <p className="text-xs text-warning">🐛 Debug: {tracks?.length || 0} tracks loaded, activeId: {activeTrackId || 'null'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className || ''} animate-scale-in border-primary/30 shadow-lg bg-gradient-to-r from-primary/5 to-transparent`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span 
              className="inline-block w-5 h-5 rounded-full animate-pulse shadow-sm" 
              style={{ backgroundColor: activeTrack.color || 'hsl(var(--primary))' }} 
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-ping" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-primary font-semibold">
              ✨ {activeTrack.track_name || activeTrack.title || 'Untitled Track'}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                Active career track
              </span>
              {activeTrack.archived && <span className="text-warning font-medium">(Archived)</span>}
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            🐛 ID: {activeTrack.id.slice(-8)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Started:</span>
            <span>{new Date(activeTrack.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Status:</span>
            <span className={activeTrack.archived ? 'text-warning' : 'text-success'}>
              {activeTrack.archived ? 'Archived' : 'Active'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Focus:</span>
            <span>Career Growth</span>
          </div>
        </div>
        
        {activeTrack.description && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{activeTrack.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackDisplay;