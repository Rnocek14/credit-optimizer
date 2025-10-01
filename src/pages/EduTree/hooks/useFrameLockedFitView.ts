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

  // Stable selection hash to prevent re-runs on object identity changes
  const selectionHash = `${primarySelection?.id ?? ''}|${secondarySelection?.id ?? ''}`;

  useEffect(() => {
    if (!enabled || !reactFlow) return;

    // Increased debounce from 100ms to 300ms to reduce viewport churn
    const timeoutId = setTimeout(() => {
      // RAF alignment keeps fitView synced with paint cycle
      requestAnimationFrame(() => {
        try {
          // Track fitView calls for debugging
          if (import.meta.env.DEV) {
            console.count('[FitView] Calls');
          }
          
          // DEBUG: Check if IT nodes exist and get their positions for viewport planning
          const allNodes = reactFlow.getNodes();
          const itNodes = allNodes.filter(n => 
            n.data?.program_id === 'bs_it' || n.data?.programId === 'bs_it'
          );
          
          if (itNodes.length > 0) {
            if (Math.random() < 0.02) {
              console.log('[FrameLockedFitView] IT nodes detected, adjusting viewport:', {
                count: itNodes.length,
                positions: itNodes.map(n => ({ id: n.id, y: n.position?.y })),
                yRange: {
                  min: Math.min(...itNodes.map(n => n.position?.y || 0)),
                  max: Math.max(...itNodes.map(n => n.position?.y || 0))
                }
              });
            }
            
            // Include IT nodes in fitView to ensure they're visible
            const frameNodes = [...FRAME_NODE_IDS.map(id => ({ id })), ...itNodes.map(n => ({ id: n.id }))];
            reactFlow.fitView({
              nodes: frameNodes,
              padding: 0.25,
              includeHiddenNodes: true,
              duration: 300
            });
          } else {
            // Standard frame-locked fitView
            reactFlow.fitView({
              nodes: FRAME_NODE_IDS.map(id => ({ id })),
              padding: 0.25,
              includeHiddenNodes: true,
              duration: 300
            });
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[FrameLockedFitView] FitView failed:', error);
          }
        }
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [reactFlow, mode, enabled, selectionHash]);
}