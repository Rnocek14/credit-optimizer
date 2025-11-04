import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExplorationAnalytics } from '../useExplorationAnalytics';
import * as explorationApi from '../explorationApi';

// Mock the exploration API
vi.mock('../explorationApi', () => ({
  getExplorationAnalytics: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

const mockData = {
  split: [
    { bucket: 'A', users: 100, assignment_events: 120 },
    { bucket: 'B', users: 102, assignment_events: 122 },
  ],
  funnel: [
    { bucket: 'A', explored: 250, applied: 40, apply_rate_pct: 16.0 },
    { bucket: 'B', explored: 260, applied: 55, apply_rate_pct: 21.2 },
  ],
  daily: [
    { day: '2025-11-01', bucket: 'A', explored: 15, applied: 2, apply_rate_pct: 13.3 },
  ],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useExplorationAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns analytics data successfully', async () => {
    vi.mocked(explorationApi.getExplorationAnalytics).mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useExplorationAnalytics({ since: '21 days' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('passes filter parameters correctly', async () => {
    vi.mocked(explorationApi.getExplorationAnalytics).mockResolvedValue(mockData);

    const params = {
      since: '30 days',
      moduleCategory: 'gen_ed',
      planYear: 2,
      providerType: 'ACE',
    };

    renderHook(() => useExplorationAnalytics(params), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(explorationApi.getExplorationAnalytics).toHaveBeenCalledWith(
        expect.anything(),
        params
      );
    });
  });

  it('handles errors gracefully', async () => {
    const error = new Error('RPC failed');
    vi.mocked(explorationApi.getExplorationAnalytics).mockRejectedValue(error);

    const { result } = renderHook(() => useExplorationAnalytics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('respects enabled flag', async () => {
    vi.mocked(explorationApi.getExplorationAnalytics).mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useExplorationAnalytics({ enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(explorationApi.getExplorationAnalytics).not.toHaveBeenCalled();
  });

  it('uses correct query key for caching', async () => {
    vi.mocked(explorationApi.getExplorationAnalytics).mockResolvedValue(mockData);

    const params = { since: '14 days', moduleCategory: 'core' };
    const { result } = renderHook(() => useExplorationAnalytics(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Second render with same params should use cache
    const { result: result2 } = renderHook(() => useExplorationAnalytics(params), {
      wrapper: createWrapper(),
    });

    // Should immediately have data from cache
    expect(result2.current.data).toEqual(mockData);
  });
});
