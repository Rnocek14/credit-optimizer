/**
 * OKLCH Color Tokens - Phase 2 Design System Migration
 * Provides perceptually uniform color scaling with better contrast and accessibility
 */

export const colorTokens = {
  // Core OKLCH brand ramp (Purple @ ~270° hue)
  primary: {
    50:  "0.98 0.01 270",   // Almost white with subtle purple tint
    100: "0.96 0.02 270",   // Very light purple
    200: "0.92 0.04 270",   // Light purple
    300: "0.87 0.06 270",   // Medium light purple
    400: "0.82 0.09 270",   // Medium purple
    500: "0.75 0.12 270",   // Brand mid - primary color
    600: "0.70 0.13 270",   // Medium dark purple
    700: "0.63 0.12 270",   // Dark purple
    800: "0.56 0.10 270",   // Very dark purple
    900: "0.47 0.08 270"    // Almost black purple
  },

  // Status ramps (color-blind safe emphasis via chroma difference)
  success: {
    50:  "0.97 0.02 140",
    500: "0.80 0.11 140",   // Green success
    700: "0.63 0.09 140",   // Dark green
    900: "0.45 0.08 140"
  },
  
  warning: {
    50:  "0.97 0.03 70",
    500: "0.85 0.15 70",    // Yellow/orange warning
    700: "0.70 0.12 70",    // Dark orange
    900: "0.50 0.10 70"
  },
  
  destructive: {
    50:  "0.97 0.02 30",
    500: "0.68 0.16 30",    // Red error
    700: "0.55 0.14 30",    // Dark red
    900: "0.40 0.12 30"
  },
  
  info: {
    50:  "0.97 0.02 240",
    500: "0.75 0.10 240",   // Blue info
    700: "0.60 0.09 240",   // Dark blue
    900: "0.42 0.08 240"
  },

  // Neutral grays (achromatic - no hue/chroma)
  neutral: {
    50:  "0.99 0.00 0",     // White
    100: "0.96 0.00 0",     // Very light gray
    200: "0.92 0.00 0",     // Light gray
    300: "0.87 0.00 0",     // Medium light gray
    400: "0.68 0.00 0",     // Medium gray
    500: "0.55 0.00 0",     // Mid gray
    600: "0.42 0.00 0",     // Dark gray
    700: "0.32 0.00 0",     // Very dark gray
    800: "0.23 0.00 0",     // Almost black
    900: "0.15 0.00 0",     // Black
    950: "0.09 0.00 0"      // Pure black
  }
} as const;

// Light mode semantic mapping
export const lightModeTokens = {
  // Surfaces
  surface:     colorTokens.neutral[50],   // White background
  surface2:    colorTokens.neutral[100],  // Card background
  surface3:    colorTokens.neutral[200],  // Elevated surface
  
  // Text
  text:        colorTokens.neutral[800],  // Primary text ~#2A2A2A
  textMuted:   colorTokens.neutral[600],  // Secondary text
  textSubtle:  colorTokens.neutral[500],  // Tertiary text
  
  // Borders
  border:      colorTokens.neutral[300],
  borderMuted: colorTokens.neutral[200],
  
  // Brand colors (full saturation for light mode)
  primary:     colorTokens.primary[500],
  primaryHover: colorTokens.primary[600],
  primaryLight: colorTokens.primary[100],
  primaryMuted: colorTokens.primary[200],
  
  // Status colors
  success:     colorTokens.success[500],
  successLight: colorTokens.success[50],
  warning:     colorTokens.warning[500],
  warningLight: colorTokens.warning[50],
  destructive: colorTokens.destructive[500],
  destructiveLight: colorTokens.destructive[50],
  info:        colorTokens.info[500],
  infoLight:   colorTokens.info[50],
} as const;

// Dark mode semantic mapping (reduced chroma, adjusted lightness)
export const darkModeTokens = {
  // Surfaces (dark backgrounds)
  surface:     colorTokens.neutral[950], // Very dark background
  surface2:    colorTokens.neutral[900], // Card background
  surface3:    colorTokens.neutral[800], // Elevated surface
  
  // Text (light on dark)
  text:        colorTokens.neutral[100], // Light text
  textMuted:   colorTokens.neutral[400], // Muted text
  textSubtle:  colorTokens.neutral[500], // Subtle text
  
  // Borders
  border:      colorTokens.neutral[700],
  borderMuted: colorTokens.neutral[800],
  
  // Brand colors (reduced chroma for dark mode comfort - 60% of light mode)
  primary:     "0.78 0.07 270", // Reduced from 0.12 to 0.07 chroma
  primaryHover: "0.82 0.08 270",
  primaryLight: "0.25 0.04 270", // Dark mode "light" is actually dark
  primaryMuted: "0.20 0.03 270",
  
  // Status colors (adjusted for dark mode)
  success:     "0.75 0.07 140", // Reduced chroma
  successLight: "0.22 0.04 140",
  warning:     "0.80 0.09 70",
  warningLight: "0.25 0.05 70", 
  destructive: "0.65 0.10 30",
  destructiveLight: "0.22 0.04 30",
  info:        "0.70 0.06 240",
  infoLight:   "0.22 0.03 240",
} as const;

// Color contrast validation pairs
export const contrastPairs = [
  { fg: 'text', bg: 'surface', minRatio: 7.0 },       // AAA for body text
  { fg: 'textMuted', bg: 'surface', minRatio: 4.5 },   // AA for secondary text
  { fg: 'primary', bg: 'surface', minRatio: 4.5 },     // AA for interactive elements
  { fg: 'text', bg: 'surface2', minRatio: 4.5 },      // AA for card content
  { fg: 'success', bg: 'surface', minRatio: 4.5 },     // AA for status colors
  { fg: 'warning', bg: 'surface', minRatio: 4.5 },
  { fg: 'destructive', bg: 'surface', minRatio: 4.5 },
  { fg: 'info', bg: 'surface', minRatio: 4.5 },
] as const;

export type ColorToken = keyof typeof lightModeTokens;
export type ContrastPair = typeof contrastPairs[number];