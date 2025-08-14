import { trackEvent } from './analytics';

/**
 * Telemetry events for P3/P4 features
 */
export type TelemetryEvent = 
  // Feed events
  | 'feed_card_view'
  | 'feed_primary_cta_click'
  | 'save_to_plan'
  
  // Roadmap events  
  | 'roadmap_step_completed'
  | 'skill_node_upgraded'
  
  // Discovery events
  | 'discover_card_sort_changed'
  | 'mentor_match_clicked'
  | 'market_badge_viewed'
  
  // Today Dashboard events
  | 'today_next_step_rendered'
  | 'today_quick_win_start'
  | 'today_unstick_created';

export interface TelemetryPayload {
  // Common
  userId?: string;
  timestamp?: number;
  
  // Feed events
  id?: string;
  type?: string;
  rank?: number;
  origin?: 'discover' | 'plan' | 'today';
  
  // Save events
  item_type?: string;
  source?: string;
  criBoost?: number;
  
  // Progress events
  step_id?: string;
  skills?: string[];
  skill?: string;
  level?: number;
  
  // Discovery events
  sort?: string;
  filters?: Record<string, any>;
  
  // Today events
  days_inactive?: number;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Simple telemetry wrapper for P3/P4 events
 */
export function track(event: TelemetryEvent, payload: TelemetryPayload = {}) {
  const userId = payload.userId;
  if (!userId) {
    console.warn('Telemetry event fired without userId:', event);
    return;
  }

  // Enhance payload with standard fields
  const enhancedPayload = {
    ...payload,
    timestamp: Date.now(),
    event_type: event,
    source: payload.source || 'unknown',
  };

  // Map to existing analytics events or create new ones
  const mappedEvent = mapToAnalyticsEvent(event);
  
  try {
    if (mappedEvent) {
      trackEvent(userId, mappedEvent as any, enhancedPayload.source, enhancedPayload);
    } else {
      // For new events not yet in analytics, log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Telemetry:', event, enhancedPayload);
      }
    }
  } catch (error) {
    console.error('Telemetry tracking failed:', error);
  }
}

/**
 * Map telemetry events to existing analytics events
 */
function mapToAnalyticsEvent(event: TelemetryEvent): string | null {
  const eventMap: Record<TelemetryEvent, string | null> = {
    'feed_card_view': 'planner_accessed',
    'feed_primary_cta_click': 'cta_click',
    'save_to_plan': 'planner_generate_plan',
    'roadmap_step_completed': 'planner_generate_plan',
    'skill_node_upgraded': 'planner_generate_plan',
    'discover_card_sort_changed': null,
    'mentor_match_clicked': null,
    'market_badge_viewed': null,
    'today_next_step_rendered': 'planner_accessed',
    'today_quick_win_start': 'planner_set_goal',
    'today_unstick_created': 'planner_set_goal',
  };
  
  return eventMap[event];
}

/**
 * Convenience functions for common events
 */
export const telemetry = {
  feedCardView: (userId: string, id: string, type: string, rank: number) =>
    track('feed_card_view', { userId, id, type, rank }),
    
  feedCtaClick: (userId: string, id: string, origin: 'discover' | 'plan' | 'today', type: string) =>
    track('feed_primary_cta_click', { userId, id, origin, type }),
    
  saveToPlan: (userId: string, itemType: string, source: string, criBoost?: number) =>
    track('save_to_plan', { userId, item_type: itemType, source, criBoost }),
    
  stepCompleted: (userId: string, stepId: string, skills: string[]) =>
    track('roadmap_step_completed', { userId, step_id: stepId, skills }),
    
  skillUpgraded: (userId: string, skill: string, level: number) =>
    track('skill_node_upgraded', { userId, skill, level }),
    
  nextStepRendered: (userId: string, id: string, type: string) =>
    track('today_next_step_rendered', { userId, id, type }),
    
  quickWinStart: (userId: string, id: string) =>
    track('today_quick_win_start', { userId, id }),
    
  unstickCreated: (userId: string, daysInactive: number) =>
    track('today_unstick_created', { userId, days_inactive: daysInactive }),
};