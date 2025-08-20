import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { HubNavigation } from '@/components/HubNavigation';
import { PathCanvas } from '@/components/path/PathCanvas';
import { LoadingState } from '@/components/LoadingState';
import { EmptyBuildState } from '@/components/EmptyBuildState';
import { usePathStore } from '@/stores/usePathStore';
import { TrackManager } from '@/components/multi-track/TrackManager';
import { useState } from 'react';

export default function Build() {
  const { user, isLoading } = useSecureAuth();
  const [searchParams] = useSearchParams();
  const [showTrackManager, setShowTrackManager] = useState(false);
  const { setLastOpenedTrackId, getLastOpenedTrackId, setActiveTrackId } = usePathStore();

  // Get track ID from URL query params or fallback to last opened
  const fromQuery = searchParams.get("track") ?? undefined;
  const trackId = fromQuery || getLastOpenedTrackId();

  useEffect(() => {
    if (!trackId) return;

    // Set active track in store
    setActiveTrackId(trackId);
    
    // Remember it for future direct visits
    setLastOpenedTrackId(trackId);
  }, [trackId, setActiveTrackId, setLastOpenedTrackId]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!user) {
    return <div>Access denied. Please log in.</div>;
  }

  // Show empty state if no track is selected
  if (!trackId) {
    return (
      <>
        <HubNavigation />
        <EmptyBuildState
          onOpenTrackManager={() => setShowTrackManager(true)}
          onCreateTrack={() => setShowTrackManager(true)}
        />
        {showTrackManager && (
          <TrackManager 
            onTrackSelect={() => setShowTrackManager(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <div className="h-[calc(100vh-60px)]">
        <PathCanvas userId={user.id} trackId={trackId} />
      </div>
    </div>
  );
}