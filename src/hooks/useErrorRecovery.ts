import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trackTelemetryEvent } from '@/utils/telemetry';

interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackData?: any;
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: (data: any, attempt: number) => void;
}

interface ErrorRecoveryState {
  isRecovering: boolean;
  attemptCount: number;
  lastError: Error | null;
  hasExhaustedRetries: boolean;
}

export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    fallbackData = null,
    onError,
    onSuccess
  } = options;

  const queryClient = useQueryClient();
  const [state, setState] = useState<ErrorRecoveryState>({
    isRecovering: false,
    attemptCount: 0,
    lastError: null,
    hasExhaustedRetries: false
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const reset = useCallback(() => {
    setState({
      isRecovering: false,
      attemptCount: 0,
      lastError: null,
      hasExhaustedRetries: false
    });
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    if (state.hasExhaustedRetries) {
      return fallbackData;
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
      attemptCount: prev.attemptCount + 1
    }));

    try {
      const result = await operation();
      
      // Success - reset state
      setState({
        isRecovering: false,
        attemptCount: 0,
        lastError: null,
        hasExhaustedRetries: false
      });

      onSuccess?.(result, state.attemptCount + 1);
      
      // Track successful recovery
      if (state.attemptCount > 0) {
        await trackTelemetryEvent({
          task: 'error_recovery_success',
          complexity: {
            context,
            attempts: state.attemptCount + 1,
            finalAttempt: true
          }
        });
      }

      return result;
    } catch (error) {
      const currentAttempt = state.attemptCount + 1;
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      setState(prev => ({
        ...prev,
        lastError: err,
        isRecovering: false,
        hasExhaustedRetries: currentAttempt >= maxRetries
      }));

      onError?.(err, currentAttempt);

      // Track error
      await trackTelemetryEvent({
        task: 'error_recovery_attempt',
        success: false,
        complexity: {
          context,
          attempt: currentAttempt,
          maxRetries,
          errorType: err.name,
          errorMessage: err.message.slice(0, 100) // Truncate for telemetry
        }
      });

      if (currentAttempt < maxRetries) {
        // Schedule retry with exponential backoff
        const delay = retryDelay * Math.pow(2, currentAttempt - 1);
        
        return new Promise((resolve) => {
          retryTimeoutRef.current = setTimeout(async () => {
            const result = await retry(operation, context);
            resolve(result);
          }, delay);
        });
      } else {
        // Exhausted retries
        await trackTelemetryEvent({
          task: 'error_recovery_exhausted',
          success: false,
          complexity: {
            context,
            attempts: currentAttempt,
            errorType: err.name,
            fallbackUsed: fallbackData !== null
          }
        });

        return fallbackData;
      }
    }
  }, [state, maxRetries, retryDelay, fallbackData, onError, onSuccess]);

  const invalidateAndRetry = useCallback(async (
    queryKeys: string[][],
    operation?: () => Promise<any>
  ) => {
    // Invalidate related queries
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    // Wait a bit for queries to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Retry operation if provided
    if (operation) {
      return retry(operation, 'invalidate_and_retry');
    }
  }, [queryClient, retry]);

  const recoverFromNetworkError = useCallback(async (
    operation: () => Promise<any>,
    cacheKey?: string[]
  ) => {
    // First try from cache if available
    if (cacheKey) {
      const cachedData = queryClient.getQueryData(cacheKey);
      if (cachedData) {
        console.log('Using cached data for recovery');
        return cachedData;
      }
    }

    // Retry with network recovery strategy
    return retry(async () => {
      // Check if online
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Device is offline');
      }

      return operation();
    }, 'network_recovery');
  }, [queryClient, retry]);

  const withErrorBoundary = useCallback(<T>(
    operation: () => Promise<T>,
    errorBoundary?: (error: Error) => T | null
  ) => {
    return retry(operation).catch(error => {
      if (errorBoundary) {
        return errorBoundary(error);
      }
      
      console.error('Unhandled error in recovery:', error);
      return fallbackData;
    });
  }, [retry, fallbackData]);

  return {
    // State
    ...state,
    
    // Actions
    retry,
    reset,
    invalidateAndRetry,
    recoverFromNetworkError,
    withErrorBoundary,
    
    // Computed
    canRetry: !state.hasExhaustedRetries,
    remainingRetries: Math.max(0, maxRetries - state.attemptCount)
  };
}