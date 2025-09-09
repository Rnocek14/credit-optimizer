import { useCallback, useRef, useEffect } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';

/**
 * Hook for tracking node size changes and updating React Flow internals
 * This is critical for the layout lifecycle pipeline to work correctly
 */
export function useNodeResize(nodeId: string) {
  const updateNodeInternals = useUpdateNodeInternals();
  const observerRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  
  const attachResizeObserver = useCallback((element: HTMLElement) => {
    if (!element || observerRef.current) return;

    observerRef.current = new ResizeObserver(() => {
      // Cancel any pending frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // Batch updates using requestAnimationFrame to prevent jitter
      rafRef.current = requestAnimationFrame(() => {
        updateNodeInternals(nodeId);
        
        // Emit event for canvas to trigger re-layout
        window.dispatchEvent(new CustomEvent('node:resized', {
          detail: { nodeId }
        }));
        rafRef.current = null;
      });
    });

    observerRef.current.observe(element);
  }, [nodeId, updateNodeInternals]);

  const detachResizeObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      detachResizeObserver();
    };
  }, [detachResizeObserver]);

  return {
    attachResizeObserver,
    detachResizeObserver
  };
}