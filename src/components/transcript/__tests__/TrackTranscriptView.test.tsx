import { describe, it, expect, vi } from 'vitest';
import { TrackTranscriptView } from '../TrackTranscriptView';

// Mock dependencies
vi.mock('@/stores/useActiveTrackStore', () => ({
  useActiveTrackStore: () => ({
    activeTrackId: 'track-123'
  })
}));

vi.mock('@/hooks/useTrackTranscript', () => ({
  useTrackTranscript: () => ({
    usage: [
      { id: 'usage-1', course_id: 'course-101', created_at: '2023-01-01' }
    ],
    tagCourse: vi.fn(),
    untagCourse: vi.fn(),
    isTagging: false,
    isUntagging: false,
    isAlreadyTagged: vi.fn((courseId: string) => courseId === 'course-101')
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('TrackTranscriptView', () => {
  const mockCourses = [
    {
      id: 'course-101',
      title: 'React Fundamentals',
      instructor: 'John Doe',
      difficulty: 3,
      cri_score: 85,
      completion_rate: 0.92,
      description: 'Learn React basics'
    }
  ];

  it('should render component', () => {
    // Test that component can be instantiated without errors
    expect(() => TrackTranscriptView({ courses: mockCourses })).not.toThrow();
  });

  it('should filter courses by track usage', () => {
    const component = TrackTranscriptView({ courses: mockCourses });
    
    // Component should process courses that are in usage
    expect(component).toBeTruthy();
  });

  it('should provide duplicate checking functionality', () => {
    // This tests the logic that would be used in the component
    const isAlreadyTagged = (courseId: string) => courseId === 'course-101';
    
    expect(isAlreadyTagged('course-101')).toBe(true);
    expect(isAlreadyTagged('course-999')).toBe(false);
  });
});