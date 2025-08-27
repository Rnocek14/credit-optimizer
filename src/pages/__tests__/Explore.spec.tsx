import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Explore from '@/pages/Explore';

// Mock all dependencies
vi.mock('@/hooks/useCourseIntelligence', () => ({
  useCourseIntelligence: () => ({
    getCRI: vi.fn().mockResolvedValue({
      cri: 75,
      components: [
        { skillId: 'javascript', target: 80, current: 60, weight: 0.3 },
        { skillId: 'react', target: 70, current: 50, weight: 0.4 }
      ],
      computedAt: '2024-01-01T00:00:00Z'
    }),
    getRecommendations: vi.fn().mockResolvedValue([
      {
        course: {
          id: 'course-1',
          platform: { id: 'p1', slug: 'coursera', name: 'Coursera' },
          instructor: { id: 'i1', name: 'John Doe', org: 'Stanford', reputation: 4.8 },
          title: 'JavaScript Fundamentals',
          slug: 'js-fundamentals',
          url: 'https://coursera.org/course/javascript',
          difficulty: 2,
          durationHours: 20
        },
        reason: 'Fills JavaScript skill gap',
        score: 0.85,
        expectedCRIChange: 12,
        covers: [{ skillId: 'javascript', from: 20, to: 60, weight: 0.8 }]
      }
    ]),
    recordCourseEvent: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('@/stores/useActiveTrackStore', () => ({
  useActiveTrackStore: () => ({
    activeTrackId: 'test-track-id'
  })
}));

vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn()
}));

vi.mock('@/utils/security', () => ({
  sanitizeUrl: vi.fn((url: string) => url) // Mock as always valid for tests
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock React Query
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mockUseQuery(),
}));

describe('Explore Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful query mock
    mockUseQuery.mockReturnValue({
      data: {
        cri: 75,
        components: [
          { skillId: 'javascript', target: 80, current: 60, weight: 0.3 },
          { skillId: 'react', target: 70, current: 50, weight: 0.4 }
        ],
        recommendations: [
          {
            course: {
              id: 'course-1',
              platform: { id: 'p1', slug: 'coursera', name: 'Coursera' },
              instructor: { id: 'i1', name: 'John Doe', org: 'Stanford', reputation: 4.8 },
              title: 'JavaScript Fundamentals',
              slug: 'js-fundamentals', 
              url: 'https://coursera.org/course/javascript',
              difficulty: 2,
              durationHours: 20
            },
            reason: 'Fills JavaScript skill gap',
            score: 0.85,
            expectedCRIChange: 12,
            covers: [{ skillId: 'javascript', from: 20, to: 60, weight: 0.8 }]
          }
        ]
      },
      isLoading: false,
      error: null
    });
  });

  it('should render CRI gauge and skill breakdown', async () => {
    render(<Explore />);
    
    await waitFor(() => {
      expect(screen.getByText(/career readiness index/i)).toBeInTheDocument();
      expect(screen.getByText(/skill breakdown/i)).toBeInTheDocument();
    });
  });

  it('should render recommendations rail', async () => {
    render(<Explore />);
    
    await waitFor(() => {
      expect(screen.getByText(/recommended courses/i)).toBeInTheDocument();
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
    });
  });

  it('should track telemetry on recommendations view', async () => {
    const { trackTelemetryEvent } = await import('@/utils/telemetry');
    
    render(<Explore />);
    
    await waitFor(() => {
      expect(trackTelemetryEvent).toHaveBeenCalledWith({
        task: 'explore_reco_view',
        route: '/explore',
        complexity: expect.objectContaining({
          cri: 75,
          recommendations_count: 1
        }),
        function_name: 'explore_recommendations_load'
      });
    });
  });

  it('should handle save course action', async () => {
    const { useCourseIntelligence } = await import('@/hooks/useCourseIntelligence');
    const { trackTelemetryEvent } = await import('@/utils/telemetry');
    const mockRecordCourseEvent = vi.fn().mockResolvedValue(true);
    
    // Update mock to return our spy
    vi.mocked(useCourseIntelligence).mockReturnValue({
      getCRI: vi.fn(),
      getRecommendations: vi.fn(),
      recordCourseEvent: mockRecordCourseEvent
    });
    
    render(<Explore />);
    
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
    });
    
    expect(mockRecordCourseEvent).toHaveBeenCalledWith(
      'test-user-id', 
      'course-1', 
      'saved',
      undefined,
      'Saved from Explore'
    );
    
    expect(trackTelemetryEvent).toHaveBeenCalledWith({
      task: 'explore_reco_action',
      route: '/explore',
      complexity: { action: 'save', course_id: 'course-1' },
      function_name: 'save_course_from_explore'
    });
  });

  it('should handle open course action with URL sanitization', async () => {
    const { sanitizeUrl } = await import('@/utils/security');
    const { trackTelemetryEvent } = await import('@/utils/telemetry');
    
    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });
    
    render(<Explore />);
    
    await waitFor(() => {
      const openButton = screen.getByRole('button', { name: /open/i });
      fireEvent.click(openButton);
    });
    
    expect(sanitizeUrl).toHaveBeenCalledWith('https://coursera.org/course/javascript');
    expect(mockOpen).toHaveBeenCalledWith(
      'https://coursera.org/course/javascript',
      '_blank',
      'noopener,noreferrer'
    );
    
    expect(trackTelemetryEvent).toHaveBeenCalledWith({
      task: 'explore_reco_action',
      route: '/explore',
      complexity: { action: 'open', url: 'https://coursera.org/course/javascript' },
      function_name: 'open_course_link'
    });
  });

  it('should show loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    });
    
    render(<Explore />);
    
    expect(screen.getByTestId('course-intelligence-skeleton')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load data')
    });
    
    render(<Explore />);
    
    expect(screen.getByText(/error loading course intelligence/i)).toBeInTheDocument();
  });

  it('should prevent opening malicious URLs', async () => {
    const { sanitizeUrl } = await import('@/utils/security');
    const { useToast } = await import('@/hooks/use-toast');
    
    // Mock sanitizeUrl to reject URL
    vi.mocked(sanitizeUrl).mockReturnValue(null);
    
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });
    
    render(<Explore />);
    
    await waitFor(() => {
      const openButton = screen.getByRole('button', { name: /open/i });
      fireEvent.click(openButton);
    });
    
    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Security Error',
      description: 'This URL is not allowed for security reasons.',
      variant: 'destructive',
    });
  });
});