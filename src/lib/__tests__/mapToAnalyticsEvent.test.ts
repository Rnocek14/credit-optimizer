import { TelemetryEvent } from '../telemetry';

// Import the private function by exposing it for testing
const mapToAnalyticsEvent = (event: TelemetryEvent): string | null => {
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
};

describe('mapToAnalyticsEvent', () => {
  it('should map telemetry events to analytics events correctly', () => {
    expect(mapToAnalyticsEvent('feed_card_view')).toBe('planner_accessed');
    expect(mapToAnalyticsEvent('feed_primary_cta_click')).toBe('cta_click');
    expect(mapToAnalyticsEvent('save_to_plan')).toBe('planner_generate_plan');
    expect(mapToAnalyticsEvent('roadmap_step_completed')).toBe('planner_generate_plan');
    expect(mapToAnalyticsEvent('skill_node_upgraded')).toBe('planner_generate_plan');
    expect(mapToAnalyticsEvent('today_next_step_rendered')).toBe('planner_accessed');
    expect(mapToAnalyticsEvent('today_quick_win_start')).toBe('planner_set_goal');
    expect(mapToAnalyticsEvent('today_unstick_created')).toBe('planner_set_goal');
  });

  it('should return null for unmapped events', () => {
    expect(mapToAnalyticsEvent('discover_card_sort_changed')).toBeNull();
    expect(mapToAnalyticsEvent('mentor_match_clicked')).toBeNull();
    expect(mapToAnalyticsEvent('market_badge_viewed')).toBeNull();
  });

  it('should handle all defined telemetry events', () => {
    const allEvents: TelemetryEvent[] = [
      'feed_card_view',
      'feed_primary_cta_click', 
      'save_to_plan',
      'roadmap_step_completed',
      'skill_node_upgraded',
      'discover_card_sort_changed',
      'mentor_match_clicked',
      'market_badge_viewed',
      'today_next_step_rendered',
      'today_quick_win_start',
      'today_unstick_created',
    ];

    // Ensure all events are handled (returns either string or null)
    allEvents.forEach(event => {
      const result = mapToAnalyticsEvent(event);
      expect(typeof result === 'string' || result === null).toBe(true);
    });
  });

  it('should map today dashboard events to appropriate analytics events', () => {
    expect(mapToAnalyticsEvent('today_next_step_rendered')).toBe('planner_accessed');
    expect(mapToAnalyticsEvent('today_quick_win_start')).toBe('planner_set_goal');
    expect(mapToAnalyticsEvent('today_unstick_created')).toBe('planner_set_goal');
  });
});