/**
 * Frame-Locked FitView Hook
 * Ensures camera always frames Years 1–4 + Degree, regardless of highlight state
 */

import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { RenderMode } from '../utils/renderMode';
import type { Selection } from '../ctx/PathHighlightContext';
import { FRAME_NODE_IDS } from '../utils/renderMode';

interface UseFrameLockedFitViewProps {
  mode: RenderMode;
  primarySelection?: Selection | null;
  secondarySelection?: Selection | null;
  enabled?: boolean;
}

/**
 * Hook that manages frame-locked fitView behavior
 * Triggers fitView on mode/selection changes with consistent frame boundaries
 */
export function useFrameLockedFitView({
  mode,
  primarySelection,
  secondarySelection,
  enabled = true
}: UseFrameLockedFitViewProps) {
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (!enabled || !reactFlow) return;

    // Small delay to ensure nodes are rendered
    const timeoutId = setTimeout(() => {
      try {
        reactFlow.fitView({
          nodes: FRAME_NODE_IDS.map(id => ({ id })),
          padding: 0.15,
          includeHiddenNodes: true,
          duration: 300
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[FrameLockedFitView] Applied fitView:', {
            mode,
            primarySelection: primarySelection?.id,
            secondarySelection: secondarySelection?.id,
            frameNodes: FRAME_NODE_IDS
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[FrameLockedFitView] FitView failed:', error);
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [reactFlow, mode, primarySelection?.id, secondarySelection?.id, enabled]);
}