import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { HubNavigation } from '@/components/HubNavigation';
import { PathCanvas } from '@/components/path/PathCanvas';
import { LoadingState } from '@/components/LoadingState';
import { EmptyBuildState } from '@/components/EmptyBuildState';
import { TrackNotFoundState } from '@/components/TrackNotFoundState';
import { usePathStore } from '@/stores/usePathStore';
import { TrackManager } from '@/components/multi-track/TrackManager';
import { supabase } from '@/integrations/supabase/client';
import { useTrackParamSync } from '@/hooks/useTrackParamSync';

export default function Build() {
  const { user, isLoading } = useSecureAuth();
  const [showTrackManager, setShowTrackManager] = useState(false);
  const navigate = useNavigate();
  const { setActiveTrackId } = usePathStore();

  // Fetch user tracks for validation
  const { data: userTracks } = useQuery({
    queryKey: ['user-tracks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('career_tracks')
        .select('id, title, archived')
        .eq('user_id', user.id);
      if (error) return [];
      return data;
    },
    enabled: !!user,
  });

  // Use centralized track parameter synchronization
  const { safeTrackId, currentTrack } = useTrackParamSync({ user, userTracks });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!user) {
    return <div>Access denied. Please log in.</div>;
  }

  // Show empty state if no valid track is selected
  if (!safeTrackId) {
    return (
      <>
        <HubNavigation />
        <EmptyBuildState
          onOpenTrackManager={() => setShowTrackManager(true)}
          onCreateTrack={() => setShowTrackManager(true)}
        />
        <TrackManager 
          open={showTrackManager}
          onOpenChange={setShowTrackManager}
          onTrackSelect={(trackId) => {
            setActiveTrackId(trackId);
            setShowTrackManager(false);
          }}
        />
      </>
    );
  }

  // Show track not found state if track doesn't exist or is archived
  if (!currentTrack) {
    return (
      <>
        <HubNavigation />
        <TrackNotFoundState
          reason="not-found"
          onOpenTrackManager={() => setShowTrackManager(true)}
        />
        <TrackManager 
          open={showTrackManager}
          onOpenChange={setShowTrackManager}
          onTrackSelect={(trackId) => {
            setActiveTrackId(trackId);
            setShowTrackManager(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <div className="h-[calc(100vh-60px)]">
        <PathCanvas userId={user.id} trackId={safeTrackId} />
      </div>
    </div>
  );
}