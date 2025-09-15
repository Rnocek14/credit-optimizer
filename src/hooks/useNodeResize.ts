import { useCallback, useRef, useEffect } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';

/**
 * Hook for tracking node size changes and updating React Flow internals
 * This is critical for the layout lifecycle pipeline to work correctly
 */
export function useNodeResize(nodeId: string) {
  const updateNodeInternals = useUpdateNodeInternals();
  const observerRef = useRef<ResizeObserver | null>(null);
  const previousSizeRef = useRef<{ width: number; height: number } | null>(null);

  const attachResizeObserver = useCallback((element: HTMLElement) => {
    if (!element || observerRef.current) return;

    observerRef.current = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      const previousSize = previousSizeRef.current;

      if (
        previousSize &&
        previousSize.width === rect.width &&
        previousSize.height === rect.height
      ) {
        return;
      }

      previousSizeRef.current = {
        width: rect.width,
        height: rect.height
      };

      // Debounce the update to prevent excessive re-layouts
      setTimeout(() => {
        updateNodeInternals(nodeId);

        // Emit event for canvas to trigger re-layout
        window.dispatchEvent(new CustomEvent('node:resized', {
          detail: { nodeId }
        }));
      }, 50);
    });

    observerRef.current.observe(element);
  }, [nodeId, updateNodeInternals]);

  const detachResizeObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    previousSizeRef.current = null;
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