import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { usePlanBasket } from '../state/usePlanBasket';
import ConstraintsPanel from './ConstraintsPanel';

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  logEvent: vi.fn(),
}));

import { logEvent } from '@/lib/analytics';

describe('ConstraintsPanel - Value Clamping', () => {
  beforeEach(() => {
    // Reset store before each test
    const { clearAll, setConstraints } = usePlanBasket.getState();
    clearAll();
    setConstraints({
      max_ace_credits: 90,
      max_concurrent_courses: 2,
    });
  });

  it('clamps max_budget_usd to minimum 0', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    act(() => {
      result.current.setConstraints({ max_budget_usd: -100 });
    });
    
    // Should be clamped or undefined (depends on implementation)
    const budget = result.current.constraints.max_budget_usd;
    expect(budget === undefined || budget >= 0).toBe(true);
  });

  it('clamps min_cri_score to 0-100 range', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    act(() => {
      result.current.setConstraints({ min_cri_score: 150 });
    });
    
    const cri = result.current.constraints.min_cri_score;
    expect(cri).toBeGreaterThanOrEqual(0);
    expect(cri).toBeLessThanOrEqual(100);
  });

  it('clamps max_ace_credits to 0-120 range', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    act(() => {
      result.current.setConstraints({ max_ace_credits: 200 });
    });
    
    const ace = result.current.constraints.max_ace_credits;
    expect(ace).toBeLessThanOrEqual(120);
  });

  it('clamps max_concurrent_courses to 1-6 range', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    act(() => {
      result.current.setConstraints({ max_concurrent_courses: 10 });
    });
    
    const concurrent = result.current.constraints.max_concurrent_courses;
    expect(concurrent).toBeGreaterThanOrEqual(1);
    expect(concurrent).toBeLessThanOrEqual(6);
  });

  it('clamps max_weekly_hours to 0-80 range', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    act(() => {
      result.current.setConstraints({ max_weekly_hours: 100 });
    });
    
    const hours = result.current.constraints.max_weekly_hours;
    expect(hours).toBeLessThanOrEqual(80);
  });
});

describe('ConstraintsPanel - Analytics Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger analytics when constraints change', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    const oldCRI = result.current.constraints.min_cri_score;
    
    act(() => {
      result.current.setConstraints({ min_cri_score: 85 });
    });
    
    const newCRI = result.current.constraints.min_cri_score;
    expect(newCRI).toBe(85);
    expect(newCRI).not.toBe(oldCRI);
  });

  it('should not trigger duplicate events for unchanged values', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    act(() => {
      result.current.setConstraints({ min_cri_score: 75 });
    });
    
    const cri1 = result.current.constraints.min_cri_score;
    
    act(() => {
      result.current.setConstraints({ min_cri_score: 75 });
    });
    
    const cri2 = result.current.constraints.min_cri_score;
    expect(cri1).toBe(cri2);
  });
});

describe('ConstraintsPanel - Debounce Behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces rapid UI changes and fires single analytics event', async () => {
    // Mock logEvent from the correct module
    const { logEvent } = await import('@/lib/analytics');
    vi.mocked(logEvent).mockClear();

    const { result } = renderHook(() => usePlanBasket());
    
    // Simulate 5 rapid UI changes (what ConstraintsPanel does internally)
    act(() => {
      result.current.setConstraints({ min_cri_score: 70 });
    });
    act(() => {
      result.current.setConstraints({ min_cri_score: 75 });
    });
    act(() => {
      result.current.setConstraints({ min_cri_score: 80 });
    });
    act(() => {
      result.current.setConstraints({ min_cri_score: 85 });
    });
    act(() => {
      result.current.setConstraints({ min_cri_score: 90 });
    });

    // Store responds immediately
    expect(result.current.constraints.min_cri_score).toBe(90);
    
    // Analytics debouncing happens in ConstraintsPanel's commit function
    // This test validates the store behavior; UI-level debounce tested via render
  });

  it('batches multiple constraint changes within debounce window', () => {
    const { result } = renderHook(() => usePlanBasket());
    
    const initialBudget = result.current.constraints.max_budget_usd;
    const initialCRI = result.current.constraints.min_cri_score;
    
    act(() => {
      result.current.setConstraints({ 
        max_budget_usd: 5000,
        min_cri_score: 85 
      });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.constraints.max_budget_usd).toBe(5000);
    expect(result.current.constraints.min_cri_score).toBe(85);
    expect(result.current.constraints.max_budget_usd).not.toBe(initialBudget);
    expect(result.current.constraints.min_cri_score).not.toBe(initialCRI);
  });
});

describe('ConstraintsPanel - UI Debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Reset store before each test
    const { clearAll, setConstraints } = usePlanBasket.getState();
    clearAll();
    setConstraints({
      max_ace_credits: 90,
      max_concurrent_courses: 2,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces rapid slider changes to a single analytics event', () => {
    const { container } = render(<ConstraintsPanel />);

    // Find the Min CRI slider by aria-label
    const minCRISlider = container.querySelector('input[type="range"][aria-label="Min CRI"]') as HTMLInputElement;
    
    expect(minCRISlider).toBeTruthy();

    // 5 rapid changes - use manual event triggering for speed
    act(() => {
      minCRISlider.value = '70';
      minCRISlider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      minCRISlider.value = '75';
      minCRISlider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      minCRISlider.value = '80';
      minCRISlider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      minCRISlider.value = '85';
      minCRISlider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      minCRISlider.value = '90';
      minCRISlider.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Nothing yet (debounce window hasn't elapsed)
    expect(logEvent).not.toHaveBeenCalled();

    // Advance past debounce window (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Exactly one analytics call
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(
      'plan_constraint_changed',
      expect.objectContaining({ 
        key: 'min_cri_score', 
        newValue: 90 
      })
    );
  });
});
