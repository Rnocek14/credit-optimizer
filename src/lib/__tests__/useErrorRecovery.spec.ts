import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorRecovery } from '@/hooks/useErrorRecovery';

// Mock the telemetry
vi.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: vi.fn(),
}));

describe('useErrorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useErrorRecovery());

    expect(result.current.state).toEqual({
      isRecovering: false,
      attemptCount: 0,
      lastError: null,
      isExhausted: false,
    });
  });

  it('should handle successful operation without retry', async () => {
    const { result } = renderHook(() => useErrorRecovery());
    const successOperation = vi.fn().mockResolvedValue('success');

    let resultValue;
    await act(async () => {
      resultValue = await result.current.retry(successOperation);
    });

    expect(resultValue).toBe('success');
    expect(successOperation).toHaveBeenCalledTimes(1);
    expect(result.current.state.attemptCount).toBe(0);
    expect(result.current.state.isRecovering).toBe(false);
  });

  it('should retry on failure and eventually succeed', async () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 3, retryDelay: 10 }));
    
    const failTwiceThenSucceed = vi.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValueOnce('success');

    let resultValue;
    await act(async () => {
      resultValue = await result.current.retry(failTwiceThenSucceed);
    });

    expect(resultValue).toBe('success');
    expect(failTwiceThenSucceed).toHaveBeenCalledTimes(3);
    expect(result.current.state.attemptCount).toBe(2); // 2 retries before success
    expect(result.current.state.isRecovering).toBe(false);
  });

  it('should exhaust retries and throw final error', async () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 2, retryDelay: 10 }));
    
    const alwaysFail = vi.fn().mockRejectedValue(new Error('Persistent failure'));

    await act(async () => {
      await expect(result.current.retry(alwaysFail)).rejects.toThrow('Persistent failure');
    });

    expect(alwaysFail).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(result.current.state.attemptCount).toBe(2);
    expect(result.current.state.isExhausted).toBe(true);
    expect(result.current.state.lastError?.message).toBe('Persistent failure');
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useErrorRecovery());

    act(() => {
      // Simulate some error state
      result.current.state.attemptCount = 3;
      result.current.state.isExhausted = true;
      result.current.state.lastError = new Error('Test error');
      
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      isRecovering: false,
      attemptCount: 0,
      lastError: null,
      isExhausted: false,
    });
  });

  it('should handle network errors specifically', async () => {
    const { result } = renderHook(() => useErrorRecovery());
    
    const networkError = new Error('Network error');
    networkError.name = 'NetworkError';
    
    const mockOperation = vi.fn().mockRejectedValue(networkError);

    await act(async () => {
      await expect(result.current.recoverFromNetworkError(mockOperation)).rejects.toThrow('Network error');
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result.current.state.lastError?.name).toBe('NetworkError');
  });

  it('should execute onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useErrorRecovery({ onSuccess }));
    
    const successOperation = vi.fn().mockResolvedValue('success');

    await act(async () => {
      await result.current.retry(successOperation);
    });

    expect(onSuccess).toHaveBeenCalledWith('success');
  });

  it('should execute onError callback', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 1, retryDelay: 10, onError }));
    
    const error = new Error('Test error');
    const failOperation = vi.fn().mockRejectedValue(error);

    await act(async () => {
      await expect(result.current.retry(failOperation)).rejects.toThrow('Test error');
    });

    expect(onError).toHaveBeenCalledWith(error);
  });
});