import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Plans from '@/pages/Plans';

// Mock dependencies
vi.mock('@/stores/useActiveTrackStore', () => ({
  useActiveTrackStore: () => ({
    activeTrackId: 'test-track-id',
    setActiveTrackId: vi.fn()
  })
}));

vi.mock('@/hooks/useCourseIntelligence', () => ({
  useCourseIntelligence: () => ({
    getCRI: vi.fn().mockResolvedValue({
      cri: 65,
      components: [
        { skillId: 'javascript', target: 80, current: 60, weight: 0.3 }
      ],
      computedAt: '2024-01-01T00:00:00Z'
    })
  })
}));

vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn()
}));

// Mock React Query
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mockUseQuery(),
}));

const mockCareerTracks = [
  {
    id: 'track-1',
    track_name: 'Frontend Developer',
    goal: 'Build modern web applications',
    created_at: '2024-01-01T00:00:00Z',
    archived: false
  },
  {
    id: 'track-2', 
    track_name: 'Backend Developer',
    goal: 'Build scalable server applications',
    created_at: '2024-01-02T00:00:00Z',
    archived: false
  }
];

describe('Plans Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful queries
    mockUseQuery
      .mockReturnValueOnce({
        data: mockCareerTracks,
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({
        data: {
          cri: 65,
          components: [
            { skillId: 'javascript', target: 80, current: 60, weight: 0.3 }
          ],
          computedAt: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      });
  });

  it('should render career tracks overview', async () => {
    render(<Plans />);
    
    await waitFor(() => {
      expect(screen.getByText(/learning plans/i)).toBeInTheDocument();
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    });
  });

  it('should track telemetry on page load', async () => {
    const { trackTelemetryEvent } = await import('@/utils/telemetry');
    
    render(<Plans />);
    
    await waitFor(() => {
      expect(trackTelemetryEvent).toHaveBeenCalledWith({
        task: 'plan_view',
        route: '/plan',
        complexity: { track_id: 'test-track-id' },
        function_name: 'plans_page_load'
      });
    });
  });

  it('should render CRI information for active track', async () => {
    render(<Plans />);
    
    await waitFor(() => {
      expect(screen.getByText(/current cri/i)).toBeInTheDocument();
      expect(screen.getByText('65')).toBeInTheDocument();
    });
  });

  it('should render SavedCoursesList component', async () => {
    render(<Plans />);
    
    await waitFor(() => {
      // This will be rendered by the SavedCoursesList component
      expect(screen.getByTestId('saved-courses-list')).toBeInTheDocument();
    });
  });

  it('should handle track switching', async () => {
    const { useActiveTrackStore } = await import('@/stores/useActiveTrackStore');
    const mockSetActiveTrackId = vi.fn();
    
    vi.mocked(useActiveTrackStore).mockReturnValue({
      activeTrackId: 'track-1',
      setActiveTrackId: mockSetActiveTrackId
    });
    
    render(<Plans />);
    
    await waitFor(() => {
      const trackSelector = screen.getByDisplayValue('Frontend Developer');
      fireEvent.change(trackSelector, { target: { value: 'track-2' } });
    });
    
    expect(mockSetActiveTrackId).toHaveBeenCalledWith('track-2');
  });

  it('should show loading state for tracks', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null
      })
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: null
      });
    
    render(<Plans />);
    
    expect(screen.getByTestId('plans-skeleton')).toBeInTheDocument();
  });

  it('should show loading state for CRI', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: mockCareerTracks,
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null
      });
    
    render(<Plans />);
    
    expect(screen.getByTestId('cri-skeleton')).toBeInTheDocument();
  });

  it('should handle fallback when no active track', () => {
    const { useActiveTrackStore } = await import('@/stores/useActiveTrackStore');
    
    vi.mocked(useActiveTrackStore).mockReturnValue({
      activeTrackId: null,
      setActiveTrackId: vi.fn()
    });
    
    render(<Plans />);
    
    // Should use first non-archived track as fallback
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('should filter out archived tracks', () => {
    const tracksWithArchived = [
      ...mockCareerTracks,
      {
        id: 'track-3',
        track_name: 'Archived Track',
        goal: 'Old goal',
        created_at: '2024-01-03T00:00:00Z',
        archived: true
      }
    ];
    
    mockUseQuery
      .mockReturnValueOnce({
        data: tracksWithArchived,
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({
        data: { cri: 65 },
        isLoading: false,
        error: null
      });
    
    render(<Plans />);
    
    expect(screen.queryByText('Archived Track')).not.toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('should handle error state for tracks', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to load tracks')
      })
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: null
      });
    
    render(<Plans />);
    
    expect(screen.getByText(/error loading tracks/i)).toBeInTheDocument();
  });

  it('should handle error state for CRI', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: mockCareerTracks,
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to load CRI')
      });
    
    render(<Plans />);
    
    expect(screen.getByText(/error loading cri/i)).toBeInTheDocument();
  });
});