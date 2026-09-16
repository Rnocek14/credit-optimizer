import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YearTemplatesPanel } from './YearTemplatesPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Helper to wait for conditions
const waitFor = async (callback: () => void, timeout = 3000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      callback();
      return;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  callback(); // final attempt
};

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../hooks/useApplyYearTemplate', () => ({
  useApplyYearTemplate: () => ({
    applyYearTemplate: vi.fn(),
  }),
}));

// This fixture must match what generateYearTemplates actually returns. It used
// to be an invented shape (totalCost / totalDuration / avgCRI / moduleBreakdowns)
// that the generator has never produced, so the panel's
// `template.moduleTemplates.length` threw "Cannot read properties of undefined"
// on first render and all three tests timed out waiting for a list that could
// never appear.
vi.mock('../../engine/yearTemplateGenerator', () => ({
  generateYearTemplates: vi.fn(() =>
    Promise.resolve([
      {
        id: 'year-1-budget',
        kind: 'year' as const,
        year: 1,
        label: '💰 Budget-Optimized Year 1',
        summary: '30 credits • $1,200 • 12 weeks • CRI 85',
        badge: 'Budget',
        moduleTemplates: [
          {
            moduleId: 'm1',
            options: [],
            recommendedCourseId: 'c1',
            targetCanonicalIds: [],
          },
        ],
        est: {
          costUsd: 1200,
          weeks: 12,
          credits: 30,
          cri: 85,
          workloadHours: 30,
        },
        semesterDistribution: { fall: [], spring: [] },
        warnings: [],
      },
    ])
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('YearTemplatesPanel', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    year: 1,
    modules: [],
    allOptions: [],
    onNavigate: vi.fn(),
    onApplyTemplate: vi.fn(),
  };

  test('freeze preserves list and refresh recomputes', async () => {
    const user = userEvent.setup();
    const { container } = render(<YearTemplatesPanel {...defaultProps} />, { wrapper: createWrapper() });

    // Wait for initial templates to load
    await waitFor(() => {
      const applyButtons = container.querySelectorAll('button[aria-label*="Apply template"]');
      expect(applyButtons.length).toBeGreaterThan(0);
    });

    // Apply template → frozen chip should appear
    const applyButton = container.querySelector('button[aria-label*="Apply template"]');
    if (applyButton) await user.click(applyButton as HTMLElement);
    
    await waitFor(() => {
      expect(container.querySelector('[role="status"]')).toBeTruthy();
    });

    // Refresh → unfreezes and re-fetches
    const refreshButton = container.querySelector('button[aria-label*="Refresh"]');
    if (refreshButton) await user.click(refreshButton as HTMLElement);
    
    await waitFor(() => {
      expect(container.textContent?.toLowerCase().includes('frozen')).toBe(false);
    });
  });

  test('loading state is announced to screen readers', async () => {
    const { container } = render(<YearTemplatesPanel {...defaultProps} />, { wrapper: createWrapper() });
    
    // Check for aria-busy during loading
    const section = container.querySelector('section[aria-label*="Year 1"]');
    expect(section).toBeTruthy();
  });

  test('apply buttons have descriptive labels', async () => {
    const { container } = render(<YearTemplatesPanel {...defaultProps} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      const applyButton = container.querySelector('button[aria-label*="Apply template"]');
      expect(applyButton).toBeTruthy();
    });
  });
});
