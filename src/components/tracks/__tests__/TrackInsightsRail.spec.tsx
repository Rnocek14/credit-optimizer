import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock stores and integrations
vi.mock('@/stores/useActiveTrackStore', () => ({
  useActiveTrackStore: vi.fn(() => ({
    activeTrackId: 'test-track-id'
  }))
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn(),
}));

import { trackTelemetryEvent } from '@/utils/telemetry';
import { TrackInsightsRail } from '../TrackInsightsRail';

describe('TrackInsightsRail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders no active track message when no track selected', () => {
    // Mock no active track
    vi.mocked(require('@/stores/useActiveTrackStore').useActiveTrackStore).mockReturnValue({
      activeTrackId: null
    });

    const { getByText } = render(<TrackInsightsRail />);

    expect(getByText('No Active Track')).toBeInTheDocument();
    expect(getByText('Select a career track to view insights and progress metrics.')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    const { container } = render(<TrackInsightsRail />);

    // Should show loading state
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('tracks telemetry events when action buttons are clicked', async () => {
    const user = userEvent.setup();

    // Mock successful data fetch
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        cri_trend: [{ day: '2024-01-01', cri_score: 75 }],
        recent_activity: [],
        next_milestones: []
      },
      error: null
    });

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              track_id: 'test-track-id',
              track_name: 'Test Track',
              xp: 100,
              badges: 2,
              goals: 3,
              cri_score: 75
            },
            error: null
          })
        }))
      }))
    }));

    vi.mocked(require('@/integrations/supabase/client').supabase).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom
    });

    const { getByRole, queryByRole } = render(<TrackInsightsRail />);

    // Wait for component to load data (would need to wait for loading to complete)
    await vi.waitFor(() => {
      expect(queryByRole('generic')).not.toHaveClass('animate-pulse');
    });

    // Click compare tracks button
    const compareButton = getByRole('button', { name: /compare tracks/i });
    await user.click(compareButton);

    expect(trackTelemetryEvent).toHaveBeenCalledWith({
      task: 'track_compare_initiated',
      complexity: { source: 'insights_rail', active_track: 'test-track-id' }
    });
  });
});