type EventPayload = Record<string, unknown> & { ts?: number };

export function logEvent(name: string, payload: EventPayload = {}) {
  const enriched = { ...payload, ts: Date.now() };
  // Console sink
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${name}`, enriched);

  // OPTIONAL: send to Supabase if you have a table
  // void supabase.from('events').insert({ name, payload: enriched, created_at: new Date().toISOString() });
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