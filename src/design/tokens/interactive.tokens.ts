/**
 * Interactive State Tokens - Phase 3 Implementation
 * Consistent hover, focus, active, and disabled states across components
 */

export const interactiveTokens = {
  // State overlays using OKLCH for consistent behavior
  states: {
    hover: {
      // Subtle surface tint for hover states
      overlay: "0.02 0.00 0",     // 2% lightness increase
      opacity: "0.08",            // 8% overlay opacity
      scale: "1.01",              // Subtle scale increase
      translateY: "-1px",         // Gentle lift effect
    },
    
    active: {
      // More pronounced active state
      overlay: "0.04 0.00 0",     // 4% lightness increase  
      opacity: "0.12",            // 12% overlay opacity
      scale: "0.98",              // Slight scale decrease (pressed)
      translateY: "0px",          // No lift when pressed
    },
    
    focus: {
      // High contrast focus ring using primary color
      ringColor: "var(--primary-500)",
      ringWidth: "2px", 
      ringOffset: "2px",
      ringOpacity: "1",
    },
    
    disabled: {
      // Consistent disabled appearance
      opacity: "0.5",
      cursor: "not-allowed",
      overlay: "0.01 0.00 0",     // Slight desaturation effect
    },
  },
  
  // Touch target specifications
  touchTargets: {
    // WCAG AAA compliance (44px minimum)
    minimum: {
      width: "44px",
      height: "44px",
    },
    
    // Comfortable touch targets
    comfortable: {
      width: "48px", 
      height: "48px",
    },
    
    // Generous touch targets for primary actions
    generous: {
      width: "52px",
      height: "52px", 
    },
  },
  
  // Interactive element padding for different sizes
  padding: {
    // Button padding that ensures touch compliance
    button: {
      sm: "8px 12px",   // Minimum 32px height + padding = 44px+ 
      md: "12px 16px",  // Standard comfortable size
      lg: "16px 24px",  // Large prominent buttons
    },
    
    // Input field padding
    input: {
      sm: "8px 12px",
      md: "12px 16px", 
      lg: "16px 20px",
    },
    
    // Tab/navigation item padding
    tab: {
      sm: "8px 12px",
      md: "12px 16px",
      lg: "16px 20px",
    },
  },
  
  // Focus ring variants for different contexts
  focusRings: {
    // Standard focus ring for most elements
    default: {
      outline: "2px solid var(--primary-500)",
      outlineOffset: "2px",
      borderRadius: "var(--radius-sm)",
    },
    
    // Inset focus ring for form controls
    inset: {
      outline: "none",
      boxShadow: "0 0 0 2px var(--primary-500)",
      borderRadius: "inherit",
    },
    
    // High contrast focus for better visibility
    highContrast: {
      outline: "3px solid var(--primary-500)",
      outlineOffset: "1px", 
      boxShadow: "0 0 0 1px var(--background)",
    },
    
    // Subtle focus for dense interfaces
    subtle: {
      outline: "1px solid var(--primary-500)", 
      outlineOffset: "1px",
      opacity: "0.7",
    },
  },
} as const;

// Interactive state utilities for Tailwind
export const interactiveUtilities = {
  // Base interactive element
  '.interactive': {
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all var(--motion-fast) var(--ease-standard)',
    '&:disabled, &[aria-disabled="true"]': {
      opacity: 'var(--disabled-opacity)',
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
  },
  
  // Hover effects
  '.hover-overlay': {
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: '0',
      borderRadius: 'inherit',
      backgroundColor: 'oklch(var(--hover-overlay))',
      opacity: '0',
      transition: 'opacity var(--motion-fast) var(--ease-standard)',
      pointerEvents: 'none',
    },
    '&:hover::before': {
      opacity: 'var(--hover-opacity)',
    },
  },
  
  '.hover-lift': {
    transition: 'transform var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard)',
    '&:hover': {
      transform: 'translateY(var(--hover-translateY)) scale(var(--hover-scale))',
      boxShadow: 'var(--shadow-md)',
    },
    '&:active': {
      transform: 'translateY(var(--active-translateY)) scale(var(--active-scale))',
    },
  },
  
  // Focus rings
  '.focus-ring': {
    '&:focus': {
      outline: 'none', // Remove default
    },
    '&:focus-visible': {
      outline: 'var(--focus-ring-width) solid var(--focus-ring-color)',
      outlineOffset: 'var(--focus-ring-offset)',
    },
  },
  
  '.focus-ring-inset': {
    '&:focus': {
      outline: 'none',
    },
    '&:focus-visible': {
      boxShadow: '0 0 0 var(--focus-ring-width) var(--focus-ring-color)',
    },
  },
  
  // Touch target compliance
  '.touch-target': {
    minWidth: 'var(--touch-target-width)',
    minHeight: 'var(--touch-target-height)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  '.touch-target-generous': {
    minWidth: 'var(--touch-target-generous-width)',
    minHeight: 'var(--touch-target-generous-height)',
  },
  
  // State indicators
  '.state-loading': {
    position: 'relative',
    color: 'transparent !important',
    pointerEvents: 'none',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: '0',
      margin: 'auto',
      width: '20px',
      height: '20px',
      border: '2px solid transparent',
      borderTopColor: 'currentColor',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  },
  
  // Pressed/active states
  '.active-pressed': {
    '&[data-state="active"], &[aria-pressed="true"]': {
      backgroundColor: 'var(--primary-100)',
      color: 'var(--primary-700)',
    },
    '.dark &[data-state="active"], .dark &[aria-pressed="true"]': {
      backgroundColor: 'var(--primary-700)',
      color: 'var(--primary-100)',
    },
  },
} as const;

// Component-specific state configurations
export const componentStates = {
  button: {
    primary: {
      default: {
        backgroundColor: 'var(--primary-500)',
        color: 'var(--primary-foreground)',
      },
      hover: {
        backgroundColor: 'var(--primary-600)',
      },
      active: {
        backgroundColor: 'var(--primary-700)',
      },
      focus: {
        outline: '2px solid var(--primary-500)',
        outlineOffset: '2px',
      },
      disabled: {
        opacity: '0.5',
        cursor: 'not-allowed',
      },
    },
    
    secondary: {
      default: {
        backgroundColor: 'var(--secondary)',
        color: 'var(--secondary-foreground)',
        border: '1px solid var(--border)',
      },
      hover: {
        backgroundColor: 'var(--secondary-hover)',
      },
      active: {
        backgroundColor: 'var(--accent)',
      },
      focus: {
        outline: '2px solid var(--primary-500)',
        outlineOffset: '2px',
      },
    },
  },
  
  input: {
    default: {
      backgroundColor: 'var(--background)',
      border: '1px solid var(--border)',
      color: 'var(--foreground)',
    },
    focus: {
      outline: 'none',
      borderColor: 'var(--primary-500)',
      boxShadow: '0 0 0 2px color-mix(in oklch, var(--primary-500) 20%, transparent)',
    },
    error: {
      borderColor: 'var(--destructive)',
      boxShadow: '0 0 0 2px color-mix(in oklch, var(--destructive) 20%, transparent)',
    },
  },
  
  tab: {
    default: {
      color: 'var(--muted-foreground)',
    },
    hover: {
      color: 'var(--foreground)',
      backgroundColor: 'var(--muted)',
    },
    active: {
      color: 'var(--primary-foreground)',
      backgroundColor: 'var(--primary)',
    },
    focus: {
      outline: '2px solid var(--primary-500)',
      outlineOffset: '2px',
    },
  },
} as const;

export type InteractiveState = 'default' | 'hover' | 'active' | 'focus' | 'disabled';
export type TouchTargetSize = keyof typeof interactiveTokens.touchTargets;
export type FocusRingVariant = keyof typeof interactiveTokens.focusRings;