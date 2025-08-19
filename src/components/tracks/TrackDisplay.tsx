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
  const { tracks } = useTracks();
  
  const activeTrack = tracks?.find(t => t.id === activeTrackId);

  if (!activeTrack) {
    return (
      <Card className={`${className || ''} animate-fade-in`}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground">No track selected</h3>
            <p className="text-sm text-muted-foreground">Choose a career track to see your progress and goals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className || ''} animate-fade-in border-primary/20`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span 
            className="inline-block w-4 h-4 rounded-full" 
            style={{ backgroundColor: activeTrack.color || 'hsl(var(--primary))' }} 
          />
          <div>
            <CardTitle className="text-lg text-primary">
              {activeTrack.track_name || activeTrack.title || 'Untitled Track'}
            </CardTitle>
            <CardDescription>
              Active career track
              {activeTrack.archived && <span className="ml-2 text-warning">(Archived)</span>}
            </CardDescription>
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