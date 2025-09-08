/**
 * Motion Guards System - Phase 3 Implementation
 * Ensures all animations respect user's reduced motion preferences
 */

export const motionGuards = {
  // Check if reduced motion is preferred
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Safe animation wrapper
  safeAnimate: (element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    if (motionGuards.prefersReducedMotion()) {
      // Provide immediate, non-animated result
      return element.animate(
        [keyframes[keyframes.length - 1]], // Jump to final state
        { ...options, duration: 1, iterations: 1 }
      );
    }
    return element.animate(keyframes, options);
  },

  // CSS class helper for conditional animations
  getMotionSafeClasses: (animationClasses: string, staticClasses: string = ''): string => {
    return `${staticClasses} motion-safe:${animationClasses}`;
  }
};

// Animation utilities that respect motion preferences
export const animations = {
  fadeInUp: (element: HTMLElement, duration = 300) => {
    return motionGuards.safeAnimate(element, [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration, easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', fill: 'forwards' });
  },

  fadeInScale: (element: HTMLElement, duration = 200) => {
    return motionGuards.safeAnimate(element, [
      { opacity: 0, transform: 'scale(0.96)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration, easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', fill: 'forwards' });
  },

  slideIn: (element: HTMLElement, direction: 'left' | 'right' | 'up' | 'down' = 'right', duration = 300) => {
    const transforms = {
      left: ['translateX(-100%)', 'translateX(0)'],
      right: ['translateX(100%)', 'translateX(0)'],
      up: ['translateY(-100%)', 'translateY(0)'],
      down: ['translateY(100%)', 'translateY(0)']
    };
    
    const [start, end] = transforms[direction];
    return motionGuards.safeAnimate(element, [
      { transform: start },
      { transform: end }
    ], { duration, easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', fill: 'forwards' });
  }
};