import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecommendationsRail } from '@/components/course/RecommendationsRail';

// Mock the security utility
vi.mock('@/utils/security', () => ({
  sanitizeUrl: vi.fn((url: string) => {
    // Mock implementation - reject malicious URLs
    if (url.includes('malicious')) return null;
    return url;
  }),
}));

const mockRecommendations = [
  {
    course: {
      id: 'course-1',
      platform: { id: 'p1', slug: 'coursera', name: 'Coursera' },
      instructor: { id: 'i1', name: 'John Doe', org: 'Stanford', reputation: 4.8 },
      title: 'JavaScript Fundamentals',
      slug: 'javascript-fundamentals',
      url: 'https://coursera.org/course/javascript',
      difficulty: 2,
      durationHours: 20
    },
    reason: 'Fills JavaScript skill gap',
    score: 0.85,
    expectedCRIChange: 12,
    covers: [{ skillId: 'javascript', from: 20, to: 60, weight: 0.8 }]
  },
  {
    course: {
      id: 'course-2',
      platform: { id: 'p2', slug: 'edx', name: 'edX' },
      instructor: null,
      title: 'React Advanced Patterns',
      slug: 'react-advanced',
      url: 'https://malicious-site.com/course', // This should be blocked
      difficulty: 4,
      durationHours: 30
    },
    reason: 'Advanced React concepts',
    score: 0.90,
    expectedCRIChange: 15,
    covers: [{ skillId: 'react', from: 40, to: 80, weight: 0.9 }]
  }
];

describe('RecommendationsRail', () => {
  const defaultProps = {
    recommendations: mockRecommendations,
    onSaveCourse: vi.fn(),
    onOpenCourse: vi.fn(),
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render recommendations', () => {
    render(<RecommendationsRail {...defaultProps} />);
    
    expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('React Advanced Patterns')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<RecommendationsRail {...defaultProps} isLoading={true} />);
    
    expect(screen.getByTestId('recommendations-skeleton')).toBeInTheDocument();
  });

  it('should show error state with retry button', () => {
    const onRetry = vi.fn();
    render(
      <RecommendationsRail 
        {...defaultProps} 
        error={new Error('Failed to load')}
        onRetry={onRetry}
      />
    );
    
    expect(screen.getByText(/error loading recommendations/i)).toBeInTheDocument();
    
    const retryButton = screen.getByText(/try again/i);
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when no recommendations', () => {
    render(<RecommendationsRail {...defaultProps} recommendations={[]} />);
    
    expect(screen.getByText(/no recommendations found/i)).toBeInTheDocument();
  });

  it('should filter by difficulty', async () => {
    render(<RecommendationsRail {...defaultProps} />);
    
    // Both courses should be visible initially
    expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('React Advanced Patterns')).toBeInTheDocument();
    
    // Filter by advanced difficulty (4-5)
    const difficultySelect = screen.getByLabelText(/difficulty/i);
    fireEvent.change(difficultySelect, { target: { value: '4-5' } });
    
    await waitFor(() => {
      expect(screen.queryByText('JavaScript Fundamentals')).not.toBeInTheDocument();
      expect(screen.getByText('React Advanced Patterns')).toBeInTheDocument();
    });
  });

  it('should filter by platform', async () => {
    render(<RecommendationsRail {...defaultProps} />);
    
    // Find and click Coursera platform filter
    const courseraCheckbox = screen.getByLabelText('Coursera');
    fireEvent.click(courseraCheckbox);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
      expect(screen.queryByText('React Advanced Patterns')).not.toBeInTheDocument();
    });
  });

  it('should call onSaveCourse when Save button is clicked', () => {
    const onSaveCourse = vi.fn();
    render(<RecommendationsRail {...defaultProps} onSaveCourse={onSaveCourse} />);
    
    const saveButtons = screen.getAllByText(/save/i);
    fireEvent.click(saveButtons[0]);
    
    expect(onSaveCourse).toHaveBeenCalledWith('course-1');
  });

  it('should not open malicious URLs', () => {
    const onOpenCourse = vi.fn();
    render(<RecommendationsRail {...defaultProps} onOpenCourse={onOpenCourse} />);
    
    const openButtons = screen.getAllByText(/open/i);
    fireEvent.click(openButtons[1]); // The malicious URL
    
    // Should not call onOpenCourse for malicious URLs
    expect(onOpenCourse).not.toHaveBeenCalled();
  });

  it('should open safe URLs', () => {
    const onOpenCourse = vi.fn();
    render(<RecommendationsRail {...defaultProps} onOpenCourse={onOpenCourse} />);
    
    const openButtons = screen.getAllByText(/open/i);
    fireEvent.click(openButtons[0]); // The safe URL
    
    expect(onOpenCourse).toHaveBeenCalledWith('https://coursera.org/course/javascript');
  });

  it('should display course metadata correctly', () => {
    render(<RecommendationsRail {...defaultProps} />);
    
    expect(screen.getByText('Coursera')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('20h')).toBeInTheDocument();
    expect(screen.getByText('Elementary')).toBeInTheDocument(); // Difficulty level 2
  });
});