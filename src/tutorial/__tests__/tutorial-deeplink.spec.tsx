import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock telemetry
vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn(),
}));

import { trackTelemetryEvent } from '@/utils/telemetry';
import TutorialProvider from '../TutorialProvider';
import { useTutorialDeeplink } from '../useTutorialDeeplink';

// Test component that uses the deep-link hook
function TestComponent() {
  useTutorialDeeplink();
  return <div data-testid="test-component">Test</div>;
}

describe('Tutorial Deep-link Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Mock URL with tutorial parameters
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        href: 'http://localhost:3000/test?tutorial=on&tip=test-tip',
        search: '?tutorial=on&tip=test-tip',
        pathname: '/test'
      },
      writable: true
    });
  });

  it('enables tutorial mode when deep-link is accessed', async () => {
    const TestWrapper = () => (
      <BrowserRouter>
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>
      </BrowserRouter>
    );

    render(<TestWrapper />);

    // Should track the deep-link attempt
    await vi.waitFor(() => {
      expect(trackTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          task: 'tutorial_deeplink_open',
          complexity: expect.objectContaining({
            tip_id: 'test-tip',
            route: '/test',
            success: false, // No tip element found in test
            reason: 'tip_not_found'
          })
        })
      );
    });
  });

  it('handles missing tip parameter gracefully', () => {
    // Mock URL without tip parameter
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '?tutorial=on',
      },
      writable: true
    });

    const TestWrapper = () => (
      <BrowserRouter>
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>
      </BrowserRouter>
    );

    render(<TestWrapper />);

    // Should not attempt to track deep-link event
    expect(trackTelemetryEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'tutorial_deeplink_open'
      })
    );
  });
});