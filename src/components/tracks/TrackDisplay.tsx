import React from 'react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useTracks } from '@/hooks/useTracks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Target, TrendingUp, Sparkles } from 'lucide-react';

interface TrackDisplayProps {
  className?: string;
}

export const TrackDisplay: React.FC<TrackDisplayProps> = ({ className }) => {
  const activeTrackId = useActiveTrackStore((s) => s.activeTrackId);
  const { tracks, isLoading } = useTracks();
  const [isChanging, setIsChanging] = React.useState(false);
  const [displayedTrack, setDisplayedTrack] = React.useState<any>(null);
  
  const activeTrack = tracks?.find(t => t.id === activeTrackId);

  // Handle track changes with animation
  React.useEffect(() => {
    if (activeTrack && activeTrack.id !== displayedTrack?.id) {
      setIsChanging(true);
      const timer = setTimeout(() => {
        setDisplayedTrack(activeTrack);
        setIsChanging(false);
      }, 150);
      return () => clearTimeout(timer);
    } else if (!activeTrack && displayedTrack) {
      setIsChanging(true);
      const timer = setTimeout(() => {
        setDisplayedTrack(null);
        setIsChanging(false);
      }, 150);
      return () => clearTimeout(timer);
    } else if (activeTrack && !displayedTrack) {
      setDisplayedTrack(activeTrack);
    }
  }, [activeTrack, displayedTrack]);
  
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

  if (!displayedTrack) {
    return (
      <Card className={`${className || ''} animate-fade-in border-dashed border-2 transition-all duration-300 ${isChanging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 transition-all duration-300">
              <Target className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground">No track selected</h3>
            <p className="text-sm text-muted-foreground">Choose a career track to see your progress and goals</p>
            {tracks && tracks.length > 0 && (
              <div className="mt-4 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-primary font-medium">✨ {tracks.length} track{tracks.length !== 1 ? 's' : ''} available - select one above!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className || ''} transition-all duration-300 ease-out ${isChanging ? 'opacity-50 scale-95' : 'opacity-100 scale-100 animate-scale-in'} border-2 border-primary/40 shadow-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden`}>
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse opacity-60" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span 
              className="inline-block w-6 h-6 rounded-full shadow-lg border-2 border-background transition-all duration-300 hover-quiet" 
              style={{ backgroundColor: displayedTrack.color || 'hsl(var(--primary))' }} 
            />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full animate-bounce border-2 border-background">
              <Sparkles className="w-2 h-2 text-white m-0.5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl text-primary font-bold tracking-tight flex items-center gap-2 min-w-0">
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent min-w-0 break-all">
                {displayedTrack.track_name || displayedTrack.title || 'Untitled Track'}
              </span>
              <div className="w-2 h-2 bg-success rounded-full animate-ping" />
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium border border-primary/30">
                🎯 Active Career Track
              </span>
              {displayedTrack.archived && <span className="text-warning font-medium">(Archived)</span>}
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/80 px-2 py-1 rounded border max-w-20 sm:max-w-none">
            <span className="truncate block">ID: {displayedTrack.id.slice(-8)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-3 text-sm p-3 bg-card/50 rounded-lg border border-primary/10 transition-all duration-200 hover:bg-primary/5 min-w-0">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-muted-foreground text-xs font-medium">Started</span>
              <span className="font-semibold truncate">{new Date(displayedTrack.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm p-3 bg-card/50 rounded-lg border border-primary/10 transition-all duration-200 hover:bg-primary/5 min-w-0">
            <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-muted-foreground text-xs font-medium">Status</span>
              <span className={`font-semibold truncate ${displayedTrack.archived ? 'text-warning' : 'text-success'}`}>
                {displayedTrack.archived ? '📁 Archived' : '🚀 Active'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm p-3 bg-card/50 rounded-lg border border-primary/10 transition-all duration-200 hover:bg-primary/5 min-w-0">
            <Target className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-muted-foreground text-xs font-medium">Focus</span>
              <span className="font-semibold truncate">🎯 Career Growth</span>
            </div>
          </div>
        </div>
        
        {displayedTrack.description && (
          <div className="mt-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Track Description
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{displayedTrack.description}</p>
          </div>
        )}

        {/* Track-specific visual indicator */}
        <div className="mt-4 flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
            <span className="text-sm font-medium text-success">Track Successfully Selected!</span>
          </div>
          <span className="text-xs text-success/80">Ready for planning 🎉</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackDisplay;