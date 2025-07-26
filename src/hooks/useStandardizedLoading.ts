import { useState, useCallback } from 'react';
import { useUnifiedError } from './useUnifiedState';

interface LoadingState {
  [key: string]: boolean;
}

// Standardized loading state pattern for all components
export function useStandardizedLoading(initialStates: string[] = []) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>(() => {
    const initial: LoadingState = {};
    initialStates.forEach(key => {
      initial[key] = false;
    });
    return initial;
  });

  const { setError, clearErrors } = useUnifiedError();

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
    if (value) {
      // Clear any existing errors when starting a new operation
      setError(key, null);
    }
  }, [setError]);

  const isLoading = useCallback((key?: string) => {
    if (key) {
      return loadingStates[key] || false;
    }
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  // Utility for async operations with automatic loading state management
  const withLoading = useCallback(async <T>(
    key: string,
    operation: () => Promise<T>,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    setLoading(key, true);
    try {
      const result = await operation();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(key, errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return null;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading, setError]);

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    withLoading,
    loadingStates
  };
}

// Hook for components that need consistent error + loading handling
export function useStandardizedState(keys: string[] = ['default']) {
  const loading = useStandardizedLoading(keys);
  const error = useUnifiedError();

  return {
    ...loading,
    ...error,
    // Convenience method to reset all state
    reset: () => {
      keys.forEach(key => {
        loading.setLoading(key, false);
        error.setError(key, null);
      });
    }
  };
}