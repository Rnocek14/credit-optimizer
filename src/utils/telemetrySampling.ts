/**
 * Telemetry sampling helper to reduce analytics noise
 * Use for high-frequency events like focus changes, scroll events, etc.
 */

/**
 * Determine if an event should be sampled based on rate
 * @param rate - Sampling rate between 0 and 1 (default: 0.25 = 25%)
 * @returns true if event should be logged, false otherwise
 */
export function shouldSample(rate = 0.25): boolean {
  return Math.random() < rate;
}

/**
 * Get client session ID for telemetry correlation
 * Creates one per browser session (survives page reloads)
 */
let cachedSessionId: string | null = null;

export function getClientSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  
  if (typeof window !== 'undefined') {
    try {
      let sessionId = sessionStorage.getItem('edutree-session-id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        sessionStorage.setItem('edutree-session-id', sessionId);
      }
      cachedSessionId = sessionId;
      return sessionId;
    } catch {
      // Fallback if sessionStorage fails
      cachedSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return cachedSessionId;
    }
  }
  
  // SSR fallback
  return `session_ssr_${Date.now()}`;
}

/**
 * Get module open sequence number for the current session
 * Helps track user journey across module interactions
 */
const moduleOpenCounts = new Map<string, number>();

export function getModuleOpenSeq(moduleId: string): number {
  const current = moduleOpenCounts.get(moduleId) || 0;
  const next = current + 1;
  moduleOpenCounts.set(moduleId, next);
  return next;
}
