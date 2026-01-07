/**
 * Design System Migration Utilities
 * Provides systematic migration from hardcoded colors to semantic design tokens
 */

// Purple color mapping to semantic tokens
export const purpleToSemanticMap = {
  // Primary purple variants -> semantic primary tokens
  'text-purple-500': 'text-primary',
  'text-purple-600': 'text-primary',
  'text-purple-700': 'text-primary-foreground',
  'text-purple-800': 'text-primary-foreground',
  
  'bg-purple-500': 'bg-primary',
  'bg-purple-600': 'bg-primary',
  'bg-purple-50': 'bg-primary-light',
  'bg-purple-100': 'bg-purple-secondary',
  'bg-purple-900': 'bg-purple-secondary dark:bg-purple-muted',
  'bg-purple-950': 'bg-purple-muted',
  
  'border-purple-500': 'border-primary',
  'border-purple-600': 'border-primary',
  'border-purple-500/20': 'border-primary/20',
  
  // Light/dark mode specific mappings
  'from-purple-50': 'from-purple-secondary',
  'to-purple-50': 'to-purple-secondary',
  'from-purple-950': 'from-purple-muted',
  'to-purple-900': 'to-purple-secondary',
} as const;

// Text size migration map
export const textSizeMap = {
  'text-xs': 'text-readable-xs', // 12px -> 14px minimum
} as const;

// WCAG AA compliant color combinations
export const colorCombinations = {
  // Primary combinations (4.5:1+ contrast ratio)
  primaryOnLight: 'text-primary bg-background', // 262 60% 65% on white
  primaryOnDark: 'text-primary bg-background', // Automatically handled by CSS variables
  
  // Secondary combinations
  secondaryOnLight: 'text-secondary-foreground bg-secondary',
  secondaryOnDark: 'text-secondary-foreground bg-secondary',
  
  // Status color combinations
  successOnLight: 'text-success-foreground bg-success',
  warningOnLight: 'text-warning-foreground bg-warning',
  errorOnLight: 'text-destructive-foreground bg-destructive',
} as const;

/**
 * Migration utility to convert old classes to new semantic tokens
 */
export function migrateClassName(className: string): string {
  let result = className;
  
  // Replace purple colors with semantic tokens
  Object.entries(purpleToSemanticMap).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass.replace(/[\[\]\/]/g, '\\$&')}\\b`, 'g');
    result = result.replace(regex, newClass);
  });
  
  // Replace text sizes
  Object.entries(textSizeMap).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
    result = result.replace(regex, newClass);
  });
  
  return result;
}

/**
 * Touch target compliance checker
 */
export function ensureTouchTargetCompliance(element: string): string {
  // Add touch-target class for interactive elements
  const interactiveElements = ['button', 'a', 'input[type="button"]', 'input[type="submit"]'];
  
  if (interactiveElements.some(el => element.includes(el))) {
    return `${element} touch-target`;
  }
  
  return element;
}

/**
 * Accessibility audit utilities
 */
export const accessibilityChecks = {
  // Minimum touch target size (44px x 44px)
  minimumTouchTarget: 44,
  
  // WCAG contrast ratios
  contrastRatios: {
    AA_NORMAL: 4.5,
    AA_LARGE: 3.0,
    AAA_NORMAL: 7.0,
    AAA_LARGE: 4.5,
  },
  
  // Typography minimums
  typography: {
    minimumBodySize: 16, // 16px
    minimumUISize: 14,   // 14px
    maximumLineHeight: 1.6,
    minimumLineHeight: 1.2,
  },
};

/**
 * Design token validation - OKLCH system
 * All CSS variables contain full oklch() values, so use var() directly
 */
export function validateDesignToken(token: string, value: string): boolean {
  // Reject double-wrapped color patterns (these cause the white outline bug)
  if (token.includes('color')) {
    if (value.includes('hsl(var(') || value.includes('oklch(var(')) {
      return false; // Invalid: double-wrapped
    }
  }
  
  // Ensure all spacing uses rem or consistent units
  if (token.includes('spacing') && !value.includes('rem')) {
    return false;
  }
  
  return true;
}