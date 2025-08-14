import { telemetry, track, TelemetryEvent } from '../telemetry';
import { trackEvent } from '../analytics';

// Mock the analytics module
jest.mock('../analytics', () => ({
  trackEvent: jest.fn()
}));

const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

describe('telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('track function', () => {
    it('should warn and return early if no userId provided', () => {
      track('feed_card_view', { id: 'test', type: 'skill_gap' });
      
      expect(console.warn).toHaveBeenCalledWith(
        'Telemetry event fired without userId:', 
        'feed_card_view'
      );
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should enhance payload with standard fields', () => {
      const userId = 'user123';
      const mockTimestamp = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      track('feed_card_view', { userId, id: 'test', type: 'skill_gap' });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        userId,
        'planner_accessed',
        'unknown',
        expect.objectContaining({
          userId,
          id: 'test',
          type: 'skill_gap',
          timestamp: mockTimestamp,
          event_type: 'feed_card_view',
          source: 'unknown'
        })
      );
    });

    it('should use provided source in payload', () => {
      const userId = 'user123';
      
      track('save_to_plan', { 
        userId, 
        item_type: 'course', 
        source: 'discover',
        criBoost: 15 
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        userId,
        'planner_generate_plan',
        'discover',
        expect.objectContaining({
          source: 'discover',
          criBoost: 15
        })
      );
    });

    it('should handle unmapped events in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      track('discover_card_sort_changed' as TelemetryEvent, { 
        userId: 'user123', 
        sort: 'popularity' 
      });

      expect(console.log).toHaveBeenCalledWith(
        'Telemetry:',
        'discover_card_sort_changed',
        expect.objectContaining({
          userId: 'user123',
          sort: 'popularity'
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle tracking errors gracefully', () => {
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Tracking failed');
      });

      track('feed_card_view', { userId: 'user123', id: 'test' });

      expect(console.error).toHaveBeenCalledWith(
        'Telemetry tracking failed:',
        expect.any(Error)
      );
    });
  });

  describe('convenience functions', () => {
    it('should call feedCtaClick with correct source parameter', () => {
      const trackSpy = jest.spyOn(require('../telemetry'), 'track');
      
      telemetry.feedCtaClick('user123', 'rec-1', 'today', 'skill_gap');
      
      expect(trackSpy).toHaveBeenCalledWith('feed_primary_cta_click', {
        userId: 'user123',
        id: 'rec-1',
        source: 'today',
        type: 'skill_gap'
      });
    });

    it('should call saveToPlan with criBoost when provided', () => {
      const trackSpy = jest.spyOn(require('../telemetry'), 'track');
      
      telemetry.saveToPlan('user123', 'course', 'discover', 15);
      
      expect(trackSpy).toHaveBeenCalledWith('save_to_plan', {
        userId: 'user123',
        item_type: 'course',
        source: 'discover',
        criBoost: 15
      });
    });

    it('should call unstickCreated with correct days_inactive', () => {
      const trackSpy = jest.spyOn(require('../telemetry'), 'track');
      
      telemetry.unstickCreated('user123', 5);
      
      expect(trackSpy).toHaveBeenCalledWith('today_unstick_created', {
        userId: 'user123',
        days_inactive: 5
      });
    });
  });

  describe('event mapping', () => {
    const testMappings = [
      ['feed_card_view', 'planner_accessed'],
      ['feed_primary_cta_click', 'cta_click'],
      ['save_to_plan', 'planner_generate_plan'],
      ['today_quick_win_start', 'planner_set_goal'],
      ['discover_card_sort_changed', null],
      ['mentor_match_clicked', null]
    ] as const;

    testMappings.forEach(([telemetryEvent, expectedAnalyticsEvent]) => {
      it(`should map ${telemetryEvent} to ${expectedAnalyticsEvent || 'null'}`, () => {
        track(telemetryEvent as TelemetryEvent, { userId: 'user123' });
        
        if (expectedAnalyticsEvent) {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            'user123',
            expectedAnalyticsEvent,
            'unknown',
            expect.any(Object)
          );
        } else {
          expect(mockTrackEvent).not.toHaveBeenCalled();
        }
      });
    });
  });
});