import { useEffect, useMemo } from 'react';
import { isExplorationEnabled, trackABAssignment, getCurrentBucket } from '@/utils/abTesting';
import { getClientSessionId } from '@/utils/telemetrySampling';
import { logEvent } from '@/lib/analytics';

/**
 * Hook to manage exploration mode A/B test
 * Handles assignment, tracking, and bucket resolution
 */
export function useExplorationAB(userId?: string) {
  const userIdOrAnon = userId || getClientSessionId();
  
  const explorationEnabled = useMemo(
    () => isExplorationEnabled(userIdOrAnon),
    [userIdOrAnon]
  );
  
  const bucket = useMemo(
    () => getCurrentBucket(userIdOrAnon),
    [userIdOrAnon]
  );
  
  // Track assignment once per session
  useEffect(() => {
    trackABAssignment(userIdOrAnon, logEvent);
  }, [userIdOrAnon]);
  
  return {
    explorationEnabled,
    bucket,
    userIdOrAnon
  };
}
