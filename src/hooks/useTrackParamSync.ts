import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { usePathStore } from '@/stores/usePathStore';
import { toast } from '@/hooks/use-toast';

export interface UseTrackParamSyncOptions {
  user: any;
  userTracks?: { id: string; title?: string; archived?: boolean }[];
}

export function useTrackParamSync(opts: UseTrackParamSyncOptions) {
  const { userTracks, user } = opts;
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const fromQuery = params.get('track') ?? undefined;
  const { activeTrackId, setActiveTrackId, setLastOpenedTrackId, getLastOpenedTrackId } = usePathStore();

  const isValid = (id?: string) =>
    !!id && !!userTracks?.some(t => t.id === id && !t.archived);

  // Priority: URL param > active track from store > last opened from store
  const candidateTrackId = fromQuery || activeTrackId || getLastOpenedTrackId();
  const safeTrackId = isValid(candidateTrackId) ? candidateTrackId : undefined;
  const currentTrack = userTracks?.find(t => t.id === safeTrackId);
  const didToastRef = useRef(false);
  const lastIdRef = useRef<string | undefined>(undefined);

  // Reset toast flag when switching between two valid tracks
  useEffect(() => {
    if (safeTrackId && lastIdRef.current && lastIdRef.current !== safeTrackId) {
      didToastRef.current = false;
    }
    lastIdRef.current = safeTrackId;
  }, [safeTrackId]);

  // Sync URL from active track changes (one-way: store → URL)
  useEffect(() => {
    if (!safeTrackId) return;
    if (location.pathname !== '/build') return; // Guard: only sync on /build route
    const expected = `/build?track=${encodeURIComponent(safeTrackId)}`;
    const current = `${location.pathname}${location.search}`;
    // Strict equality check to prevent navigation thrash
    if (current !== expected) {
      navigate(expected, { replace: true });
    }
  }, [safeTrackId, location.pathname, location.search, navigate]);

  // Validate & set store; clean bad params
  useEffect(() => {
    if (!safeTrackId) {
      // Clean invalid track params from URL - handle both explicit param and any track= query
      if (fromQuery || location.search.includes('track=')) {
        navigate('/build', { replace: true });
      }
      setActiveTrackId(undefined);
      setLastOpenedTrackId(undefined);
      didToastRef.current = false; // Reset toast flag when clearing track
      return;
    }

    // Set valid track in store
    setActiveTrackId(safeTrackId);
    setLastOpenedTrackId(safeTrackId);

    // Show success toast (deduplicated) - only once per track load
    if (!didToastRef.current && currentTrack?.title) {
      toast({
        title: 'Builder Opened',
        description: `Opened builder for: ${currentTrack.title}`,
      });
      didToastRef.current = true;
    }
  }, [safeTrackId, fromQuery, currentTrack?.title, location.search, navigate, setActiveTrackId, setLastOpenedTrackId]);

  // Clear on sign-out
  useEffect(() => {
    if (!user) {
      setActiveTrackId(undefined);
      setLastOpenedTrackId(undefined);
      didToastRef.current = false; // Reset toast flag on sign-out
      if (location.search.includes('track=')) {
        navigate('/build', { replace: true });
      }
    }
  }, [user, location.search, navigate, setActiveTrackId, setLastOpenedTrackId]);

  return { safeTrackId, currentTrack };
}