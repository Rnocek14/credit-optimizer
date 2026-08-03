import { supabase } from '@/integrations/supabase/client';

type EventPayload = Record<string, unknown> & { ts?: number };

// Stable anonymous session id so funnel steps can be joined without auth.
function getSessionId(): string {
  try {
    const KEY = 'pv_session_id';
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'no-session';
  }
}

export function logEvent(name: string, payload: EventPayload = {}) {
  const enriched = { ...payload, ts: Date.now() };

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${name}`, enriched);
  }

  // Fire-and-forget; analytics must never block or break the UI.
  try {
    // Cast: `events` is created by migration 20260803180000 and is not yet in
    // the generated Database types; regenerate types to drop this cast.
    void (supabase as any)
      .from('events')
      .insert({
        name,
        payload: enriched,
        session_id: getSessionId(),
        path: typeof window !== 'undefined' ? window.location.pathname : null,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      })
      .then(({ error }) => {
        if (error && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[analytics] insert failed', error.message);
        }
      });
  } catch {
    // Swallow — never let telemetry surface to users.
  }
}

// Legacy compatibility exports
export function trackEvent(userId: string, event: any, source?: string, payload?: any) {
  logEvent(`${event}`, { userId, source, ...payload });
}

export function useAnalytics() {
  return {
    trackPlannerGeneratePlan: (payload?: any, metadata?: any) => logEvent('planner_generate_plan', { ...payload, ...metadata }),
    trackPlannerSetGoal: (payload?: any, metadata?: any) => logEvent('planner_set_goal', { ...payload, ...metadata }),
    trackPlannerViewedUnlockAnalysis: (payload?: any, metadata?: any) => logEvent('planner_viewed_unlock_analysis', { ...payload, ...metadata }),
    trackPlannerAccessed: (payload?: any, metadata?: any) => logEvent('planner_accessed', { ...payload, ...metadata }),
    trackEmbedInteraction: (userId?: string, payload?: any) => logEvent('embed_interaction', { userId, ...payload }),
    trackCTAClick: (userId?: string, action?: string, payload?: any) => logEvent('cta_click', { userId, action, ...payload }),
  };
}
