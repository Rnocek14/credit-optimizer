import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Transcript from '@/pages/Transcript';

// Mock dependencies
vi.mock('@/hooks/useCourseIntelligence', () => ({
  useCourseIntelligence: () => ({
    getCRI: vi.fn().mockResolvedValue({
      cri: 75,
      components: [
        { skillId: 'javascript', target: 80, current: 60, weight: 0.3 }
      ],
      computedAt: '2024-01-01T00:00:00Z'
    })
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

const mockCompletedCourses = [
  {
    course_id: 'course-1',
    completion_date: '2024-01-01T00:00:00Z',
    score: 85,
    course_details: {
      title: 'JavaScript Fundamentals',
      platform_name: 'Coursera',
      difficulty: 2,
      duration_hours: 20,
      instructor_name: 'John Doe',
      instructor_reputation: 4.8
    },
    criContribution: 12
  },
  {
    course_id: 'course-2',
    completion_date: '2024-01-02T00:00:00Z',
    score: 92,
    course_details: {
      title: 'React Advanced Patterns',
      platform_name: 'edX',
      difficulty: 4,
      duration_hours: 30,
      instructor_name: 'Jane Smith',
      instructor_reputation: 4.9
    },
    criContribution: 15
  }
];

describe('Transcript Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful CRI query
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          cri: 75,
          components: [
            { skillId: 'javascript', target: 80, current: 60, weight: 0.3 }
          ],
          computedAt: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      })
      // Mock completed courses query (TrustTranscript component)
      .mockReturnValueOnce({
        data: mockCompletedCourses,
        isLoading: false,
        error: null
      })
      // Mock user profile query (TrustTranscript component)
      .mockReturnValueOnce({
        data: {
          name: 'testuser',
          email: 'test@example.com'
        },
        isLoading: false,
        error: null
      });
  });

  it('should render transcript page header', async () => {
    render(<Transcript />);
    
    await waitFor(() => {
      expect(screen.getByText(/learning transcript/i)).toBeInTheDocument();
      expect(screen.getByText(/your learning history/i)).toBeInTheDocument();
    });
  });

  it('should track resume_view telemetry on load', async () => {
    const { trackTelemetryEvent } = await import('@/utils/telemetry');
    
    render(<Transcript />);
    
    await waitFor(() => {
      expect(trackTelemetryEvent).toHaveBeenCalledWith({
        task: 'resume_view',
        route: '/transcript',
        function_name: 'transcript_page_load'
      });
    });
  });

  it('should render TrustTranscript component with correct props', async () => {
    render(<Transcript />);
    
    await waitFor(() => {
      expect(screen.getByText(/trust transcript/i)).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument(); // CRI score
    });
  });

  it('should handle export PDF functionality', async () => {
    const { trackTelemetryEvent } = await import('@/utils/telemetry');
    const { useToast } = await import('@/hooks/use-toast');
    
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    
    // Mock window.print
    const mockPrint = vi.fn();
    Object.defineProperty(window, 'print', { value: mockPrint });
    
    render(<Transcript />);
    
    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      fireEvent.click(exportButton);
    });
    
    expect(trackTelemetryEvent).toHaveBeenCalledWith({
      task: 'transcript_export',
      route: '/transcript',
      success: true,
      function_name: 'export_trust_transcript',
      complexity: JSON.stringify({ cri: 75, courses: 2 })
    });
    
    expect(mockPrint).toHaveBeenCalled();
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Trust Transcript Export',
      description: 'Use your browser\'s print dialog to save as PDF.',
    });
  });

  it('should render completed courses in Trust Transcript', async () => {
    render(<Transcript />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('React Advanced Patterns')).toBeInTheDocument();
      expect(screen.getByText('Coursera')).toBeInTheDocument();
      expect(screen.getByText('edX')).toBeInTheDocument();
    });
  });

  it('should show achievement summary statistics', async () => {
    render(<Transcript />);
    
    await waitFor(() => {
      expect(screen.getByText(/completed courses.*2/i)).toBeInTheDocument();
      expect(screen.getByText(/50\.0h/i)).toBeInTheDocument(); // Total learning hours
      expect(screen.getByText(/88\.5%/i)).toBeInTheDocument(); // Average score
      expect(screen.getByText(/\+27\.0 points/i)).toBeInTheDocument(); // CRI contribution
    });
  });

  it('should handle transcript entry form submission', async () => {
    render(<Transcript />);
    
    await waitFor(() => {
      // Fill out the form
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'New Course' } });
      
      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, { target: { value: 'Course description' } });
      
      const submitButton = screen.getByRole('button', { name: /add entry/i });
      fireEvent.click(submitButton);
    });
    
    // The form submission will be handled by Supabase mock
    expect(screen.getByDisplayValue('New Course')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null
      })
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null
      })
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null
      });
    
    render(<Transcript />);
    
    expect(screen.getByTestId('transcript-skeleton')).toBeInTheDocument();
  });

  it('should handle empty completed courses state', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: { cri: 75 },
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({
        data: [], // No completed courses
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({
        data: { name: 'testuser', email: 'test@example.com' },
        isLoading: false,
        error: null
      });
    
    render(<Transcript />);
    
    expect(screen.getByText(/no completed courses yet/i)).toBeInTheDocument();
  });

  it('should display instructor ratings correctly', async () => {
    render(<Transcript />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('4.9')).toBeInTheDocument();
    });
  });
});