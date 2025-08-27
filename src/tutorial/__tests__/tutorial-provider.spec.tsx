import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock telemetry
vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn(),
}));

import { trackTelemetryEvent } from '@/utils/telemetry';
import TutorialProvider, { useTutorial } from '../TutorialProvider';

function Consumer() {
  const { enabled, setEnabled } = useTutorial();
  return (
    <div>
      <span data-testid="enabled-state">{String(enabled)}</span>
      <button onClick={() => setEnabled(true)}>on</button>
      <button onClick={() => setEnabled(false)}>off</button>
    </div>
  );
}

describe('TutorialProvider persistence and telemetry', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('loads initial state from localStorage', async () => {
    localStorage.setItem('lp:tutorial:enabled', 'true');

    const utils = render(
      <TutorialProvider>
        <Consumer />
      </TutorialProvider>
    );

    const enabledEl = await utils.findByTestId('enabled-state');
    expect(enabledEl.textContent).toBe('true');
  });

  it('persists state to localStorage and emits telemetry on toggle', async () => {
    const utils = render(
      <TutorialProvider>
        <Consumer />
      </TutorialProvider>
    );

    // Toggle ON
    await userEvent.click(utils.getByText('on'));
    expect(localStorage.getItem('lp:tutorial:enabled')).toBe('true');
    expect(trackTelemetryEvent).toHaveBeenCalledWith({
      task: 'tutorial_toggle',
      complexity: { enabled: true, source: 'header' },
    });

    // Toggle OFF
    await userEvent.click(utils.getByText('off'));
    expect(localStorage.getItem('lp:tutorial:enabled')).toBe('false');
    expect(trackTelemetryEvent).toHaveBeenCalledWith({
      task: 'tutorial_toggle',
      complexity: { enabled: false, source: 'header' },
    });
  });
});
