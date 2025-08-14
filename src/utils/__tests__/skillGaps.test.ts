import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSkillGaps } from '@/hooks/useSkillGaps';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function WrapperComponent({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useSkillGaps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty data when no userId provided', async () => {
    const { result } = renderHook(() => useSkillGaps(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should use fallback skills when no goals exist', async () => {
    const mockGoals: any[] = [];
    const mockUserSkills = [{ skills: { name: 'HTML' } }];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'career_goals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: () => ({ eq: () => ({ data: mockGoals, error: null }) }),
        };
      }
      if (table === 'user_skill_progress') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: () => ({ eq: () => ({ data: mockUserSkills, error: null }) }),
        };
      }
    });

    const { result } = renderHook(() => useSkillGaps('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBeGreaterThan(0);
    expect(result.current.data!.some(gap => gap.skill === 'sql')).toBe(true);
  });
});