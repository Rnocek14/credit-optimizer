import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavedCoursesList } from '@/components/plan/SavedCoursesList';

// Mock react-query
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mockUseQuery(),
  useMutation: () => mockUseMutation(),
}));

// Mock course intelligence hook
vi.mock('@/hooks/useCourseIntelligence', () => ({
  useCourseIntelligence: () => ({
    recordCourseEvent: vi.fn().mockResolvedValue(true),
  }),
}));

const mockSavedCourses = [
  {
    course_id: 'course-1',
    event_type: 'saved',
    created_at: '2024-01-01T00:00:00Z',
    course_details: {
      title: 'JavaScript Fundamentals',
      platform_name: 'Coursera',
      difficulty: 2,
      duration_hours: 20,
      instructor_name: 'John Doe',
      instructor_reputation: 4.8
    },
    expectedCRIChange: 12
  },
  {
    course_id: 'course-2', 
    event_type: 'enrolled',
    created_at: '2024-01-02T00:00:00Z',
    course_details: {
      title: 'React Advanced Patterns',
      platform_name: 'edX',
      difficulty: 4,
      duration_hours: 30,
      instructor_name: 'Jane Smith',
      instructor_reputation: 4.9
    },
    expectedCRIChange: 15
  },
  {
    course_id: 'course-3',
    event_type: 'completed',
    created_at: '2024-01-03T00:00:00Z',
    course_details: {
      title: 'Node.js Backend Development',
      platform_name: 'Udemy',
      difficulty: 3,
      duration_hours: 25,
      instructor_name: 'Bob Wilson',
      instructor_reputation: 4.7
    },
    expectedCRIChange: 10
  }
];

describe('SavedCoursesList', () => {
  const defaultProps = {
    currentCRI: 65,
    trackId: 'test-track-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseQuery.mockReturnValue({
      data: mockSavedCourses,
      isLoading: false,
      error: null,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('should render saved courses grouped by status', () => {
    render(<SavedCoursesList {...defaultProps} />);
    
    expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('React Advanced Patterns')).toBeInTheDocument();
    expect(screen.getByText('Node.js Backend Development')).toBeInTheDocument();
  });

  it('should calculate and display projected CRI correctly', () => {
    render(<SavedCoursesList {...defaultProps} />);
    
    // Projected CRI should be current CRI + top 5 non-completed courses
    // In this case: 65 + 12 (saved) + 15 (enrolled) = 92
    expect(screen.getByText(/projected cri.*92/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<SavedCoursesList {...defaultProps} />);
    
    expect(screen.getByTestId('saved-courses-skeleton')).toBeInTheDocument();
  });

  it('should show empty state when no courses', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<SavedCoursesList {...defaultProps} />);
    
    expect(screen.getByText(/no saved courses yet/i)).toBeInTheDocument();
  });

  it('should handle status transitions correctly', async () => {
    const mockMutate = vi.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<SavedCoursesList {...defaultProps} />);
    
    // Find "Start" button for saved course
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);
    
    expect(mockMutate).toHaveBeenCalledWith({
      courseId: 'course-1',
      eventType: 'enrolled',
      trackId: 'test-track-id',
    });
  });

  it('should handle course completion with score input', async () => {
    const mockMutate = vi.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<SavedCoursesList {...defaultProps} />);
    
    // Find "Complete" button for enrolled course
    const completeButton = screen.getByRole('button', { name: /complete/i });
    fireEvent.click(completeButton);
    
    // Should open score input dialog
    await waitFor(() => {
      expect(screen.getByText(/completion score/i)).toBeInTheDocument();
    });
    
    // Enter score and submit
    const scoreInput = screen.getByLabelText(/score/i);
    fireEvent.change(scoreInput, { target: { value: '85' } });
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    expect(mockMutate).toHaveBeenCalledWith({
      courseId: 'course-2',
      eventType: 'completed',
      trackId: 'test-track-id',
      score: 85,
    });
  });

  it('should display course metadata correctly', () => {
    render(<SavedCoursesList {...defaultProps} />);
    
    expect(screen.getByText('Coursera')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('20h')).toBeInTheDocument();
    expect(screen.getByText('+12 CRI')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load courses'),
    });

    render(<SavedCoursesList {...defaultProps} />);
    
    expect(screen.getByText(/error loading courses/i)).toBeInTheDocument();
  });

  it('should filter out invalid course data', () => {
    const invalidCourses = [
      ...mockSavedCourses,
      {
        course_id: 'invalid-course',
        event_type: 'saved',
        created_at: '2024-01-01T00:00:00Z',
        course_details: null, // Invalid
        expectedCRIChange: null
      }
    ];

    mockUseQuery.mockReturnValue({
      data: invalidCourses,
      isLoading: false,
      error: null,
    });

    render(<SavedCoursesList {...defaultProps} />);
    
    // Should only render valid courses
    expect(screen.queryByText('invalid-course')).not.toBeInTheDocument();
    expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
  });
});