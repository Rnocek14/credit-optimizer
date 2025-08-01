import { useState, useCallback, useRef } from 'react';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export function useCircuitBreaker(config: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  monitoringWindow: 60000 // 1 minute
}) {
  const [state, setState] = useState<CircuitBreakerState>({
    state: 'closed',
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0
  });

  const recentFailures = useRef<number[]>([]);

  const cleanOldFailures = useCallback(() => {
    const now = Date.now();
    recentFailures.current = recentFailures.current.filter(
      time => now - time < config.monitoringWindow
    );
  }, [config.monitoringWindow]);

  const recordFailure = useCallback(() => {
    const now = Date.now();
    recentFailures.current.push(now);
    cleanOldFailures();

    setState(prevState => {
      const newFailureCount = recentFailures.current.length;
      
      if (newFailureCount >= config.failureThreshold) {
        return {
          state: 'open',
          failureCount: newFailureCount,
          lastFailureTime: now,
          nextAttemptTime: now + config.resetTimeout
        };
      }

      return {
        ...prevState,
        failureCount: newFailureCount,
        lastFailureTime: now
      };
    });
  }, [config.failureThreshold, config.resetTimeout, cleanOldFailures]);

  const recordSuccess = useCallback(() => {
    recentFailures.current = [];
    setState({
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    });
  }, []);

  const canAttempt = useCallback(() => {
    const now = Date.now();
    
    if (state.state === 'closed') {
      return true;
    }
    
    if (state.state === 'open' && now >= state.nextAttemptTime) {
      setState(prevState => ({ ...prevState, state: 'half-open' }));
      return true;
    }
    
    if (state.state === 'half-open') {
      return true;
    }
    
    return false;
  }, [state]);

  const executeWithCircuitBreaker = useCallback(async <T>(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> => {
    if (!canAttempt()) {
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker is OPEN. Next attempt at ${new Date(state.nextAttemptTime).toLocaleTimeString()}`);
    }

    try {
      const result = await operation();
      recordSuccess();
      return result;
    } catch (error) {
      recordFailure();
      
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }, [canAttempt, recordSuccess, recordFailure, state.nextAttemptTime]);

  return {
    state: state.state,
    failureCount: state.failureCount,
    canAttempt: canAttempt(),
    nextAttemptTime: state.nextAttemptTime,
    executeWithCircuitBreaker,
    recordFailure,
    recordSuccess
  };
}