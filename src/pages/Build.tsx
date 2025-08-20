import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { getCurrentUser } from '@/lib/authHelper';

export default function Build() {
  const { user, isLoading } = useSecureAuth();
  const [searchParams] = useSearchParams();
  const [showTrackManager, setShowTrackManager] = useState(false);
  const navigate = useNavigate();
  const { setLastOpenedTrackId, getLastOpenedTrackId, setActiveTrackId, activeTrackId } = usePathStore();

  // Get track ID from URL query params or fallback to last opened
  const fromQuery = searchParams.get("track") ?? undefined;
  const trackId = fromQuery || getLastOpenedTrackId();

  // Track validation - check if track exists and belongs to user
  const { data: trackExists, isLoading: trackValidationLoading } = useQuery({
    queryKey: ['track-validation', trackId],
    queryFn: async () => {
      if (!trackId || !user) return null;
      
      const { data, error } = await supabase
        .from('career_tracks')
        .select('id, archived')
        .eq('id', trackId)
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!trackId && !!user,
  });

  // URL sync effect - keep URL in sync with active track changes
  useEffect(() => {
    if (activeTrackId && activeTrackId !== fromQuery) {
      const params = new URLSearchParams(window.location.search);
      params.set('track', activeTrackId);
      navigate(`/build?${params.toString()}`, { replace: true });
    }
  }, [activeTrackId, fromQuery, navigate]);

  useEffect(() => {
    if (!trackId) return;

    // Validate track ownership and existence
    if (user && trackExists === null && !trackValidationLoading) {
      // Track not found or doesn't belong to user - clear stale references
      setActiveTrackId(undefined);
      setLastOpenedTrackId(undefined);
      return;
    }

    // Track is archived - clear references and show empty state
    if (trackExists?.archived) {
      setActiveTrackId(undefined);
      setLastOpenedTrackId(undefined);
      return;
    }

    // Set active track in store
    setActiveTrackId(trackId);
    
    // Remember it for future direct visits
    setLastOpenedTrackId(trackId);
  }, [trackId, trackExists, trackValidationLoading, user, setActiveTrackId, setLastOpenedTrackId]);

  if (isLoading || trackValidationLoading) {
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
        <TrackManager 
          open={showTrackManager}
          onOpenChange={setShowTrackManager}
          onTrackSelect={(trackId) => {
            setActiveTrackId(trackId);
            setShowTrackManager(false);
            navigate(`/build?track=${encodeURIComponent(trackId)}`);
          }}
        />
      </>
    );
  }

  // Show track not found state if track doesn't exist or is archived
  if (trackExists === null) {
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
            navigate(`/build?track=${encodeURIComponent(trackId)}`);
          }}
        />
      </>
    );
  }

  if (trackExists?.archived) {
    return (
      <>
        <HubNavigation />
        <TrackNotFoundState
          reason="archived"
          onOpenTrackManager={() => setShowTrackManager(true)}
        />
        <TrackManager 
          open={showTrackManager}
          onOpenChange={setShowTrackManager}
          onTrackSelect={(trackId) => {
            setActiveTrackId(trackId);
            setShowTrackManager(false);
            navigate(`/build?track=${encodeURIComponent(trackId)}`);
          }}
        />
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