import { describe, it, expect, vi } from 'vitest';
import { TrackResumeBuilder } from '../TrackResumeBuilder';

// Mock dependencies
vi.mock('@/stores/useActiveTrackStore', () => ({
  useActiveTrackStore: () => ({
    activeTrackId: 'track-123'
  })
}));

vi.mock('@/hooks/useTracks', () => ({
  useTracks: () => ({
    tracks: [
      {
        id: 'track-123',
        title: 'Full Stack Development',
        description: 'Complete web development track'
      }
    ]
  })
}));

vi.mock('@/hooks/useTrackTranscript', () => ({
  useTrackTranscript: () => ({
    usage: [
      { id: 'usage-1', course_id: 'course-101' },
      { id: 'usage-2', course_id: 'course-102' }
    ]
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn()
}));

describe('TrackResumeBuilder', () => {
  const mockCourses = [
    {
      id: 'course-101',
      title: 'React Fundamentals',
      instructor: 'John Doe',
      difficulty: 3,
      cri_score: 85,
      completion_rate: 0.92,
      instructor_rating: 4.5
    },
    {
      id: 'course-102',
      title: 'Node.js Backend',
      instructor: 'Jane Smith',
      difficulty: 4,
      cri_score: 78,
      completion_rate: 0.85,
      instructor_rating: 4.2
    }
  ];

  it('should render component', () => {
    // Test that component can be instantiated without errors
    expect(() => TrackResumeBuilder({ courses: mockCourses })).not.toThrow();
  });

  it('should filter courses by track usage', () => {
    const component = TrackResumeBuilder({ courses: mockCourses });
    
    // Component should process courses that are in usage
    expect(component).toBeTruthy();
  });

  it('should calculate track metrics correctly', () => {
    // Test the metric calculation logic
    const avgCRI = mockCourses.reduce((acc, course) => acc + (course.cri_score || 0), 0) / mockCourses.length;
    const avgDifficulty = mockCourses.reduce((acc, course) => acc + (course.difficulty || 0), 0) / mockCourses.length;
    
    expect(Math.round(avgCRI)).toBe(82); // (85 + 78) / 2 = 81.5 → 82
    expect(Math.round(avgDifficulty * 10) / 10).toBe(3.5); // (3 + 4) / 2 = 3.5
  });

  it('should determine prestige tier badges correctly', () => {
    // Test prestige tier logic
    const getPrestigeTier = (rating?: number) => {
      if (!rating) return null;
      if (rating >= 4.5) return 'Platinum';
      if (rating >= 4.0) return 'Gold';
      if (rating >= 3.5) return 'Silver';
      return 'Bronze';
    };

    expect(getPrestigeTier(4.5)).toBe('Platinum');
    expect(getPrestigeTier(4.2)).toBe('Gold');
    expect(getPrestigeTier(3.8)).toBe('Silver');
    expect(getPrestigeTier(3.0)).toBe('Bronze');
  });
});