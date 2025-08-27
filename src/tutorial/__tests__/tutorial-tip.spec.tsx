import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock telemetry
vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn(),
}));
import { trackTelemetryEvent } from '@/utils/telemetry';

// Mock Tooltip primitives to deterministically trigger onOpenChange
vi.mock('@/components/ui/tooltip', () => {
  return {
    Tooltip: ({ onOpenChange, children }: any) => (
      <div data-testid="tooltip" onMouseEnter={() => onOpenChange?.(true)}>
        {children}
      </div>
    ),
    TooltipTrigger: ({ children }: any) => <>{children}</>,
    TooltipContent: ({ children }: any) => <div>{children}</div>,
  };
});

import TutorialProvider from '../TutorialProvider';
import TutorialTip from '../TutorialTip';

describe('TutorialTip telemetry', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('fires tutorial_tip_view when tooltip opens', async () => {
    localStorage.setItem('lp:tutorial:enabled', 'true');

    const { getByTestId } = render(
      <TutorialProvider>
        <TutorialTip id="test-tip" label="Test Label" />
      </TutorialProvider>
    );

    // Simulate opening the tooltip
    const tooltip = getByTestId('tooltip');
    tooltip.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(trackTelemetryEvent).toHaveBeenCalledWith({
      task: 'tutorial_tip_view',
      complexity: { tip_id: 'test-tip' },
    });
  });
});
