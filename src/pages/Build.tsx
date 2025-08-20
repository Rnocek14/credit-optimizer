import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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
import { toast } from '@/hooks/use-toast';

export default function Build() {
  const { user, isLoading } = useSecureAuth();
  const [searchParams] = useSearchParams();
  const [showTrackManager, setShowTrackManager] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setLastOpenedTrackId, getLastOpenedTrackId, setActiveTrackId, activeTrackId } = usePathStore();

  // Get track ID from URL query params or fallback to last opened
  const fromQuery = searchParams.get("track") ?? undefined;
  const trackId = fromQuery || getLastOpenedTrackId();

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

  // Enhanced track validation with user tracks
  const isValidTrackId = trackId && userTracks?.some(t => t.id === trackId && !t.archived);
  const safeTrackId = isValidTrackId ? trackId : undefined;
  const currentTrack = userTracks?.find(t => t.id === safeTrackId);

  // Track validation - check if track exists and belongs to user
  const { data: trackExists, isLoading: trackValidationLoading } = useQuery({
    queryKey: ['track-validation', safeTrackId],
    queryFn: async () => {
      if (!safeTrackId || !user) return null;
      
      const { data, error } = await supabase
        .from('career_tracks')
        .select('id, title, archived')
        .eq('id', safeTrackId)
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!safeTrackId && !!user,
  });

  // Enhanced URL sync effect - keep URL in sync with active track changes
  useEffect(() => {
    if (activeTrackId && userTracks?.some(t => t.id === activeTrackId && !t.archived)) {
      const expectedUrl = `/build?track=${encodeURIComponent(activeTrackId)}`;
      const currentUrl = location.pathname + location.search;
      
      if (currentUrl !== expectedUrl) {
        navigate(expectedUrl, { replace: true });
      }
    }
  }, [activeTrackId, location.pathname, location.search, navigate, userTracks]);

  useEffect(() => {
    if (!safeTrackId) {
      // Clear invalid track references
      if (trackId && !isValidTrackId) {
        setActiveTrackId(undefined);
        setLastOpenedTrackId(undefined);
      }
      return;
    }

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
    setActiveTrackId(safeTrackId);
    
    // Remember it for future direct visits
    setLastOpenedTrackId(safeTrackId);

    // Show success toast when track loads
    if (trackExists?.title && !trackValidationLoading) {
      toast({
        title: "Builder Opened",
        description: `Opened builder for: ${trackExists.title}`,
      });
    }
  }, [safeTrackId, trackExists, trackValidationLoading, user, setActiveTrackId, setLastOpenedTrackId, isValidTrackId, trackId]);

  if (isLoading || trackValidationLoading) {
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
        <PathCanvas userId={user.id} trackId={safeTrackId} />
      </div>
    </div>
  );
}