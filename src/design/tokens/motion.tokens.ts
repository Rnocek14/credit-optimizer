/**
 * Motion System Tokens - Phase 3 Implementation  
 * Consistent animation durations, easing curves, and reduced-motion support
 */

export const motionTokens = {
  // Duration scale (in milliseconds)
  duration: {
    instant: "0ms",
    fast: "100ms",      // Micro-interactions (hover, focus)
    normal: "200ms",    // Standard transitions (buttons, tabs)
    slow: "300ms",      // Layout changes, modals
    slower: "500ms",    // Page transitions, complex animations
    slowest: "800ms",   // Dramatic reveals, onboarding
  },
  
  // Easing curves for different interaction types
  easing: {
    // Standard Material Design curves
    standard: "cubic-bezier(0.4, 0.0, 0.2, 1)",     // Balanced in/out
    decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)",   // Fast start, slow end
    accelerate: "cubic-bezier(0.4, 0.0, 1, 1)",     // Slow start, fast end
    sharp: "cubic-bezier(0.4, 0.0, 0.6, 1)",        // Crisp, intentional
    
    // Custom curves for specific interactions
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", // Playful bounce
    smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",   // Very smooth
    snappy: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",  // Quick snap
  },
  
  // Animation presets for common interactions
  presets: {
    // Button interactions
    buttonHover: {
      duration: "var(--motion-fast)",
      easing: "var(--ease-standard)",
    },
    
    // Modal/dialog animations
    modalEnter: {
      duration: "var(--motion-slow)", 
      easing: "var(--ease-decelerate)",
    },
    modalExit: {
      duration: "var(--motion-normal)",
      easing: "var(--ease-accelerate)", 
    },
    
    // Page transitions
    pageTransition: {
      duration: "var(--motion-slower)",
      easing: "var(--ease-standard)",
    },
    
    // Micro-interactions
    focusRing: {
      duration: "var(--motion-fast)",
      easing: "var(--ease-decelerate)",
    },
    
    // Loading states
    skeleton: {
      duration: "var(--motion-slower)",
      easing: "var(--ease-standard)",
      iterationCount: "infinite",
    },
  },
} as const;

// Reduced motion variants
export const reducedMotionOverrides = {
  // Disable all animations for users who prefer reduced motion
  global: `
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      
      /* Disable specific problematic animations */
      .animate-pulse,
      .animate-spin,
      .animate-bounce,
      .animate-ping {
        animation: none !important;
      }
      
      /* Keep essential focus indicators */
      :focus-visible {
        transition-duration: 0ms !important;
      }
    }
  `,
  
  // Respect reduced motion in JavaScript
  respectsReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
} as const;

// Animation keyframes for common patterns
export const keyframes = {
  // Fade animations with subtle movement
  fadeInUp: {
    '0%': {
      opacity: '0',
      transform: 'translateY(8px)',
    },
    '100%': {
      opacity: '1', 
      transform: 'translateY(0)',
    },
  },
  
  fadeInScale: {
    '0%': {
      opacity: '0',
      transform: 'scale(0.96)',
    },
    '100%': {
      opacity: '1',
      transform: 'scale(1)',
    },
  },
  
  // Slide animations for sidebars/drawers
  slideInLeft: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  
  slideInRight: {
    '0%': { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  
  // Gentle hover effects
  liftHover: {
    '0%': { 
      transform: 'translateY(0) scale(1)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    '100%': { 
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
  },
  
  // Loading animations
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(200%)' },
  },
  
  // Pulse for notifications
  gentlePulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.7' },
  },
  
  // Progress indicator
  progressIndeterminate: {
    '0%': { transform: 'translateX(-100%) scaleX(0.5)' },
    '50%': { transform: 'translateX(0) scaleX(1)' },
    '100%': { transform: 'translateX(100%) scaleX(0.5)' },
  },
} as const;

// Utility classes for common motion patterns
export const motionUtilities = {
  // Interactive states
  '.motion-safe': {
    '@media (prefers-reduced-motion: no-preference)': {
      // Only apply animations when motion is safe
    },
  },
  
  '.hover-lift': {
    transition: 'transform var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard)',
    '&:hover': {
      transform: 'translateY(-1px) scale(1.01)',
      boxShadow: 'var(--shadow-md)',
    },
  },
  
  '.hover-glow': {
    transition: 'box-shadow var(--motion-normal) var(--ease-standard)',
    '&:hover': {
      boxShadow: '0 0 0 1px var(--primary), var(--shadow-colored)',
    },
  },
  
  '.focus-ring': {
    transition: 'outline-color var(--motion-fast) var(--ease-decelerate)',
    '&:focus-visible': {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },
  
  // Entrance animations
  '.animate-fade-in-up': {
    animation: 'fadeInUp var(--motion-slow) var(--ease-decelerate) forwards',
  },
  
  '.animate-fade-in-scale': {
    animation: 'fadeInScale var(--motion-normal) var(--ease-decelerate) forwards',
  },
  
  // Loading states
  '.animate-shimmer': {
    animation: 'shimmer var(--motion-slower) var(--ease-standard) infinite',
  },
  
  '.animate-gentle-pulse': {
    animation: 'gentlePulse 2s var(--ease-standard) infinite',
  },
} as const;

export type MotionDuration = keyof typeof motionTokens.duration;
export type MotionEasing = keyof typeof motionTokens.easing;
export type MotionPreset = keyof typeof motionTokens.presets;