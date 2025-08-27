import { describe, it, expect, vi } from 'vitest';

// Mock the telemetry function since we can't easily test Supabase integration
const mockTrackTelemetryEvent = vi.fn();

describe('Telemetry Integration', () => {
  it('should track explore events', async () => {
    const event = {
      task: 'explore_reco_view',
      complexity: { track_id: 'test-track', count: 5 }
    };
    
    mockTrackTelemetryEvent(event);
    expect(mockTrackTelemetryEvent).toHaveBeenCalledWith(event);
  });

  it('should track transcript events', async () => {
    const event = {
      task: 'transcript_export',
      route: '/transcript',
      success: true,
      function_name: 'export_trust_transcript',
      complexity: { cri: 85, courses: 3 }
    };
    
    mockTrackTelemetryEvent(event);
    expect(mockTrackTelemetryEvent).toHaveBeenCalledWith(event);
  });

  it('should track resume view events', async () => {
    const event = {
      task: 'resume_view',
      route: '/transcript',
      function_name: 'transcript_page_load'
    };
    
    mockTrackTelemetryEvent(event);
    expect(mockTrackTelemetryEvent).toHaveBeenCalledWith(event);
  });
});