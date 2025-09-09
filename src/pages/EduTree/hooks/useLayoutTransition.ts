import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing layout transition state with bulletproof cleanup
 * Prevents stuck transitions and provides error recovery
 */
export function useLayoutTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Safety timeout to prevent stuck transitions (max 10 seconds)
  const SAFETY_TIMEOUT = 10000;
  
  const startTransition = useCallback(() => {
    setIsTransitioning(true);
    startTimeRef.current = Date.now();
    
    // Clear any existing safety timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set safety timeout to force end transition
    timeoutRef.current = setTimeout(() => {
      console.warn('[LayoutTransition] Safety timeout triggered, forcing transition end');
      setIsTransitioning(false);
      startTimeRef.current = null;
    }, SAFETY_TIMEOUT);
  }, []);
  
  const endTransition = useCallback(() => {
    setIsTransitioning(false);
    startTimeRef.current = null;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  const forceEnd = useCallback(() => {
    console.warn('[LayoutTransition] Forced transition end');
    endTransition();
  }, [endTransition]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Debug info
  const getDebugInfo = useCallback(() => {
    return {
      isTransitioning,
      duration: startTimeRef.current ? Date.now() - startTimeRef.current : null,
      hasTimeout: timeoutRef.current !== null
    };
  }, [isTransitioning]);
  
  return {
    isTransitioning,
    startTransition,
    endTransition,
    forceEnd,
    getDebugInfo
  };
}