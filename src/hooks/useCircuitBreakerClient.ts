import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime: number | null;
  nextRetryTime: number | null;
  successCount: number;
}

interface ErrorTaxonomy {
  error_code: string;
  error_category: string;
  user_message: string;
  technical_message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retry_strategy: 'none' | 'exponential' | 'linear' | 'circuit_breaker';
}

const FAILURE_THRESHOLD = 5;
const RETRY_TIMEOUT = 60000; // 1 minute
const HALF_OPEN_TIMEOUT = 30000; // 30 seconds

export function useCircuitBreakerClient() {
  const [circuitStates, setCircuitStates] = useState<Record<string, CircuitBreakerState>>({});
  const [errorTaxonomy, setErrorTaxonomy] = useState<Record<string, ErrorTaxonomy>>({});
  const errorTaxonomyLoaded = useRef(false);

  // Load error taxonomy on first use
  const loadErrorTaxonomy = useCallback(async () => {
    if (errorTaxonomyLoaded.current) return;
    
    try {
      const { data, error } = await supabase
        .from('error_taxonomy')
        .select('*');
      
      if (!error && data) {
        const taxonomy = data.reduce((acc, item) => {
          acc[item.error_code] = {
            error_code: item.error_code,
            error_category: item.error_category,
            user_message: item.user_message,
            technical_message: item.technical_message || '',
            severity: item.severity as 'low' | 'medium' | 'high' | 'critical',
            retry_strategy: item.retry_strategy as 'none' | 'exponential' | 'linear' | 'circuit_breaker'
          };
          return acc;
        }, {} as Record<string, ErrorTaxonomy>);
        setErrorTaxonomy(taxonomy);
        errorTaxonomyLoaded.current = true;
      }
    } catch (error) {
      console.warn('Failed to load error taxonomy:', error);
    }
  }, []);

  const getCircuitState = useCallback((serviceName: string): CircuitBreakerState => {
    return circuitStates[serviceName] || {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: null,
      nextRetryTime: null,
      successCount: 0
    };
  }, [circuitStates]);

  const updateCircuitState = useCallback((serviceName: string, updates: Partial<CircuitBreakerState>) => {
    setCircuitStates(prev => ({
      ...prev,
      [serviceName]: {
        ...getCircuitState(serviceName),
        ...updates
      }
    }));
  }, [getCircuitState]);

  const recordFailure = useCallback((serviceName: string) => {
    const state = getCircuitState(serviceName);
    const now = Date.now();
    const newFailureCount = state.failureCount + 1;

    if (newFailureCount >= FAILURE_THRESHOLD) {
      // Trip circuit breaker
      updateCircuitState(serviceName, {
        state: 'open',
        failureCount: newFailureCount,
        lastFailureTime: now,
        nextRetryTime: now + RETRY_TIMEOUT,
        successCount: 0
      });
    } else {
      updateCircuitState(serviceName, {
        failureCount: newFailureCount,
        lastFailureTime: now
      });
    }
  }, [getCircuitState, updateCircuitState]);

  const recordSuccess = useCallback((serviceName: string) => {
    const state = getCircuitState(serviceName);
    
    if (state.state === 'half_open') {
      // Successful call in half-open state - close circuit
      updateCircuitState(serviceName, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: null,
        nextRetryTime: null,
        successCount: state.successCount + 1
      });
    } else {
      updateCircuitState(serviceName, {
        successCount: state.successCount + 1
      });
    }
  }, [getCircuitState, updateCircuitState]);

  const canAttempt = useCallback((serviceName: string): boolean => {
    const state = getCircuitState(serviceName);
    const now = Date.now();

    switch (state.state) {
      case 'closed':
        return true;
      case 'open':
        if (state.nextRetryTime && now >= state.nextRetryTime) {
          // Move to half-open state
          updateCircuitState(serviceName, {
            state: 'half_open',
            nextRetryTime: now + HALF_OPEN_TIMEOUT
          });
          return true;
        }
        return false;
      case 'half_open':
        return true;
      default:
        return true;
    }
  }, [getCircuitState, updateCircuitState]);

  const getErrorMessage = useCallback(async (error: any, defaultMessage: string = 'An error occurred'): Promise<string> => {
    await loadErrorTaxonomy();
    
    // Try to match error to taxonomy
    const errorCode = error?.code || error?.error_code || 'UNKNOWN_ERROR';
    const taxonomyEntry = errorTaxonomy[errorCode];
    
    if (taxonomyEntry) {
      return taxonomyEntry.user_message;
    }

    // Fallback to parsing common error patterns
    const errorMessage = error?.message || error?.msg || String(error);
    
    if (errorMessage.includes('timeout')) {
      return errorTaxonomy['EDGE_FUNCTION_TIMEOUT']?.user_message || 'Service temporarily unavailable, please try again';
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return errorTaxonomy['TRACK_NOT_FOUND']?.user_message || 'Resource not found or access denied';
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return errorTaxonomy['RATE_LIMIT_EXCEEDED']?.user_message || 'Too many requests, please wait a moment';
    }
    
    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      return errorTaxonomy['AUTHENTICATION_REQUIRED']?.user_message || 'Please log in to continue';
    }

    return defaultMessage;
  }, [errorTaxonomy, loadErrorTaxonomy]);

  const executeWithCircuitBreaker = useCallback(async <T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> => {
    if (!canAttempt(serviceName)) {
      const fallbackResult = fallback?.();
      if (fallbackResult !== undefined) {
        return fallbackResult instanceof Promise ? await fallbackResult : fallbackResult;
      }
      
      const userMessage = await getErrorMessage(
        { code: 'SYSTEM_MAINTENANCE' },
        'Service temporarily unavailable'
      );
      throw new Error(userMessage);
    }

    try {
      const result = await operation();
      recordSuccess(serviceName);
      return result;
    } catch (error) {
      recordFailure(serviceName);
      
      const userMessage = await getErrorMessage(error, 'Operation failed, please try again');
      throw new Error(userMessage);
    }
  }, [canAttempt, recordSuccess, recordFailure, getErrorMessage]);

  const getRetryDelay = useCallback((attemptCount: number, strategy: string = 'exponential'): number => {
    switch (strategy) {
      case 'exponential':
        return Math.min(1000 * Math.pow(2, attemptCount), 30000);
      case 'linear':
        return Math.min(1000 * attemptCount, 10000);
      case 'circuit_breaker':
        return RETRY_TIMEOUT;
      default:
        return 0;
    }
  }, []);

  const getServiceHealth = useCallback((serviceName: string) => {
    const state = getCircuitState(serviceName);
    const totalCalls = state.successCount + state.failureCount;
    const successRate = totalCalls > 0 ? (state.successCount / totalCalls) * 100 : 100;
    
    return {
      serviceName,
      state: state.state,
      successRate,
      failureCount: state.failureCount,
      isHealthy: state.state === 'closed' && state.failureCount < FAILURE_THRESHOLD,
      nextRetryTime: state.nextRetryTime
    };
  }, [getCircuitState]);

  return {
    executeWithCircuitBreaker,
    canAttempt,
    getErrorMessage,
    getRetryDelay,
    getServiceHealth,
    recordSuccess,
    recordFailure
  };
}