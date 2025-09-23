/**
 * React Flow Event System Debugger and Recovery
 * Monitors React Flow's canvas event handling and provides recovery mechanisms
 */

import { useEffect, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

interface EventDebuggerOptions {
  enabled?: boolean;
  recoveryEnabled?: boolean;
  onCorruptionDetected?: (details: any) => void;
}

export function useReactFlowEventDebugger({
  enabled = process.env.NODE_ENV === 'development',
  recoveryEnabled = true,
  onCorruptionDetected
}: EventDebuggerOptions = {}) {
  const reactFlowInstance = useReactFlow();
  const lastHealthCheck = useRef<number>(0);
  const corruptionCount = useRef<number>(0);
  const recoveryTimer = useRef<NodeJS.Timeout>();
  
  // Check if React Flow's event system is healthy
  const checkEventSystemHealth = useCallback(() => {
    if (!enabled) return true;
    
    try {
      const reactFlowElement = document.querySelector('.react-flow');
      if (!reactFlowElement) return false;
      
      // Check if React Flow element can receive events
      const reactFlowElementTyped = reactFlowElement as HTMLElement;
      const canReceiveEvents = (
        getComputedStyle(reactFlowElementTyped).pointerEvents !== 'none' &&
        reactFlowElementTyped.style.pointerEvents !== 'none'
      );
      
      // Check if React Flow instance has required methods
      const instanceHealthy = (
        reactFlowInstance &&
        typeof reactFlowInstance.getNodes === 'function' &&
        typeof reactFlowInstance.getEdges === 'function' &&
        typeof reactFlowInstance.fitView === 'function'
      );
      
      // Check for console errors related to React Flow
      const hasRecentErrors = performance.now() - lastHealthCheck.current < 5000;
      
      const isHealthy = canReceiveEvents && instanceHealthy && !hasRecentErrors;
      
      if (!isHealthy && enabled) {
        console.warn('[EventDebugger] React Flow event system health check failed:', {
          canReceiveEvents,
          instanceHealthy,
          hasRecentErrors,
          elementExists: !!reactFlowElement,
          pointerEvents: getComputedStyle(reactFlowElementTyped).pointerEvents
        });
        
        corruptionCount.current += 1;
        onCorruptionDetected?.({
          canReceiveEvents,
          instanceHealthy,
          hasRecentErrors,
          corruptionCount: corruptionCount.current
        });
      }
      
      lastHealthCheck.current = performance.now();
      return isHealthy;
      
    } catch (error) {
      if (enabled) {
        console.error('[EventDebugger] Health check failed:', error);
      }
      return false;
    }
  }, [enabled, reactFlowInstance, onCorruptionDetected]);
  
  // Attempt to recover React Flow's event system
  const recoverEventSystem = useCallback(() => {
    if (!recoveryEnabled) return false;
    
    try {
      console.log('[EventDebugger] Attempting event system recovery...');
      
      // Step 1: Clear any existing recovery timer
      if (recoveryTimer.current) {
        clearTimeout(recoveryTimer.current);
      }
      
      // Step 2: Force React Flow to re-register event listeners
      const reactFlowElement = document.querySelector('.react-flow') as HTMLElement;
      if (reactFlowElement) {
        // Ensure pointer events are enabled
        reactFlowElement.style.pointerEvents = 'auto';
        
        // Force React Flow to reinitialize by triggering a layout change
        const originalTransform = reactFlowElement.style.transform;
        reactFlowElement.style.transform = 'scale(0.99999)';
        
        // Force reflow
        reactFlowElement.offsetHeight;
        
        // Restore transform
        reactFlowElement.style.transform = originalTransform;
      }
      
      // Step 3: Reset React Flow instance state
      if (reactFlowInstance) {
        // Trigger internal state refresh
        const currentNodes = reactFlowInstance.getNodes();
        const currentEdges = reactFlowInstance.getEdges();
        
        // Force a minimal update to trigger event re-registration
        reactFlowInstance.setNodes(currentNodes.map(n => ({ ...n })));
        reactFlowInstance.setEdges(currentEdges.map(e => ({ ...e })));
        
        // Restore viewport
        setTimeout(() => {
          if (reactFlowInstance.fitView) {
            reactFlowInstance.fitView({ duration: 0 });
          }
        }, 50);
      }
      
      // Step 4: Schedule health check after recovery
      recoveryTimer.current = setTimeout(() => {
        const recovered = checkEventSystemHealth();
        if (recovered) {
          console.log('[EventDebugger] Event system recovery successful');
          corruptionCount.current = 0;
        } else {
          console.error('[EventDebugger] Event system recovery failed');
        }
      }, 200);
      
      return true;
      
    } catch (error) {
      console.error('[EventDebugger] Recovery attempt failed:', error);
      return false;
    }
  }, [recoveryEnabled, reactFlowInstance, checkEventSystemHealth]);
  
  // Monitor for edge-related console errors that indicate corruption
  useEffect(() => {
    if (!enabled) return;
    
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    const errorHandler = (level: 'error' | 'warn') => (...args: any[]) => {
      const message = args.join(' ');
      
      // Look for React Flow corruption indicators
      const corruptionIndicators = [
        "Couldn't create edge for source handle id",
        'sourceHandle "null"',
        'targetHandle "null"',
        'invalid handle',
        'React Flow internal error'
      ];
      
      const hasCorruption = corruptionIndicators.some(indicator => 
        message.includes(indicator)
      );
      
      if (hasCorruption) {
        console.log('[EventDebugger] React Flow corruption detected in console:', message);
        
        onCorruptionDetected?.({ 
          type: 'console', 
          level, 
          message,
          timestamp: Date.now()
        });
        
        // Attempt automatic recovery if enabled
        if (recoveryEnabled && corruptionCount.current < 3) {
          setTimeout(() => recoverEventSystem(), 100);
        }
      }
      
      // Call original console method
      (level === 'error' ? originalConsoleError : originalConsoleWarn)(...args);
    };
    
    console.error = errorHandler('error');
    console.warn = errorHandler('warn');
    
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [enabled, recoveryEnabled, recoverEventSystem, onCorruptionDetected]);
  
  // Periodic health checks
  useEffect(() => {
    if (!enabled) return;
    
    const healthCheckInterval = setInterval(() => {
      const isHealthy = checkEventSystemHealth();
      
      if (!isHealthy && recoveryEnabled && corruptionCount.current < 5) {
        console.log('[EventDebugger] Periodic health check failed, attempting recovery');
        recoverEventSystem();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(healthCheckInterval);
  }, [enabled, recoveryEnabled, checkEventSystemHealth, recoverEventSystem]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (recoveryTimer.current) {
        clearTimeout(recoveryTimer.current);
      }
    };
  }, []);
  
  return {
    checkHealth: checkEventSystemHealth,
    recover: recoverEventSystem,
    corruptionCount: corruptionCount.current
  };
}