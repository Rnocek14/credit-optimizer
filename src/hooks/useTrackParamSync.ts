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

  // Sync URL from active track changes (one-way: store → URL)
  useEffect(() => {
    if (!safeTrackId) return;
    const expected = `/build?track=${encodeURIComponent(safeTrackId)}`;
    const current = `${location.pathname}${location.search}`;
    if (current !== expected) {
      navigate(expected, { replace: true });
    }
  }, [safeTrackId, location.pathname, location.search, navigate]);

  // Validate & set store; clean bad params
  useEffect(() => {
    if (!safeTrackId) {
      // Clean invalid track params from URL
      if (fromQuery || location.search.includes('track=')) {
        navigate('/build', { replace: true });
      }
      setActiveTrackId(undefined);
      setLastOpenedTrackId(undefined);
      return;
    }

    // Set valid track in store
    setActiveTrackId(safeTrackId);
    setLastOpenedTrackId(safeTrackId);

    // Show success toast (deduplicated)
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
      if (location.search.includes('track=')) {
        navigate('/build', { replace: true });
      }
    }
  }, [user, location.search, navigate, setActiveTrackId, setLastOpenedTrackId]);

  return { safeTrackId, currentTrack };
}