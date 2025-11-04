/**
 * A/B Testing Framework
 * Stable 50/50 assignment with localStorage override support
 */

/**
 * Get A/B bucket for a user (stable hash-based assignment)
 * @param userIdOrAnon - User ID or anonymous identifier
 * @returns 'A' or 'B'
 */
export function getABBucket(userIdOrAnon: string): 'A' | 'B' {
  let h = 0;
  for (const c of userIdOrAnon) {
    h = (h * 31 + c.charCodeAt(0)) | 0;
  }
  return (Math.abs(h) % 2) === 0 ? 'A' : 'B';
}

/**
 * Resolve if exploration mode is enabled for a user
 * Precedence: localStorage override > A/B bucket assignment
 * @param userIdOrAnon - User ID or anonymous identifier
 * @returns true if exploration mode should be enabled
 */
export function isExplorationEnabled(userIdOrAnon: string): boolean {
  if (typeof window === 'undefined') return true; // SSR fallback
  
  const override = localStorage.getItem('v5_exploration_mode');
  if (override === 'false') return false;
  if (override === 'true') return true;
  
  // A/B test: B=ON, A=OFF
  const bucket = getABBucket(userIdOrAnon);
  return bucket === 'B';
}

/**
 * Track A/B assignment once per session
 * @param userIdOrAnon - User ID or anonymous identifier
 * @param logEventFn - Analytics logging function
 */
export function trackABAssignment(
  userIdOrAnon: string, 
  logEventFn: (name: string, payload: Record<string, unknown>) => void
): void {
  if (typeof window === 'undefined') return;
  
  const sessionKey = 'ab_exploration_assigned';
  if (sessionStorage.getItem(sessionKey)) return; // Already tracked this session
  
  const bucket = getABBucket(userIdOrAnon);
  const override = localStorage.getItem('v5_exploration_mode');
  
  logEventFn('ab_assignment', {
    test: 'exploration_mode',
    bucket,
    overridden: override !== null,
    finalEnabled: isExplorationEnabled(userIdOrAnon)
  });
  
  sessionStorage.setItem(sessionKey, '1');
}

/**
 * Get current A/B bucket for enriching telemetry
 */
export function getCurrentBucket(userIdOrAnon: string): 'A' | 'B' {
  return getABBucket(userIdOrAnon);
}
