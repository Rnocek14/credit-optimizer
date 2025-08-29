import { describe, it, expect, vi } from 'vitest';

// Import the hook
import { useTrackTranscript } from '../useTrackTranscript';

// Mock telemetry
vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn()
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('useTrackTranscript', () => {
  it('should provide expected hook interface', () => {
    // Mock the react-query hooks to return expected structure
    const mockQueryResult = {
      data: [
        { id: '1', user_id: 'user-1', track_id: 'track-1', course_id: 'course-101', created_at: '2023-01-01' }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    };

    const mockMutation = {
      mutateAsync: vi.fn(),
      isPending: false,
      error: null
    };

    // Override the mocked useQuery and useMutation for this test
    vi.doMock('@tanstack/react-query', () => ({
      useQuery: vi.fn(() => mockQueryResult),
      useMutation: vi.fn(() => mockMutation),
      useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn()
      }))
    }));

    const result = useTrackTranscript('track-1');
    
    // Test that hook returns expected interface
    expect(result).toHaveProperty('usage');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('tagCourse');
    expect(result).toHaveProperty('untagCourse');
    expect(result).toHaveProperty('isTagging');
    expect(result).toHaveProperty('isUntagging');
    expect(result).toHaveProperty('refetch');
    expect(result).toHaveProperty('isAlreadyTagged');
    
    // Test isAlreadyTagged function
    expect(typeof result.isAlreadyTagged).toBe('function');
    expect(result.isAlreadyTagged('course-101')).toBe(true);
    expect(result.isAlreadyTagged('course-999')).toBe(false);
  });

  it('should return empty usage when no trackId', () => {
    const result = useTrackTranscript(null);
    expect(result.usage).toEqual([]);
  });
});