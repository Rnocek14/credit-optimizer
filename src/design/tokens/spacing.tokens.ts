/**
 * Spacing System Tokens - Phase 3 Implementation
 * 8pt grid system with half-step increments for flexible layouts
 */

export const spacingTokens = {
  // 8pt grid base (4pt half-steps where needed)
  0: "0rem",         // 0px
  1: "0.25rem",      // 4px - half step
  2: "0.5rem",       // 8px - base unit
  3: "0.75rem",      // 12px - half step  
  4: "1rem",         // 16px - double base
  5: "1.25rem",      // 20px - golden ratio increment
  6: "1.5rem",       // 24px - triple base
  8: "2rem",         // 32px - quadruple base
  10: "2.5rem",      // 40px - 5x base
  12: "3rem",        // 48px - 6x base
  16: "4rem",        // 64px - 8x base
  20: "5rem",        // 80px - 10x base
  24: "6rem",        // 96px - 12x base
  32: "8rem",        // 128px - 16x base
  40: "10rem",       // 160px - 20x base
  48: "12rem",       // 192px - 24x base
} as const;

// Semantic spacing for common UI patterns
export const semanticSpacing = {
  // Component internal spacing
  buttonPadding: {
    sm: `${spacingTokens[2]} ${spacingTokens[3]}`,    // 8px 12px
    md: `${spacingTokens[3]} ${spacingTokens[4]}`,    // 12px 16px  
    lg: `${spacingTokens[4]} ${spacingTokens[6]}`,    // 16px 24px
  },
  
  // Card hierarchy
  cardPadding: {
    sm: spacingTokens[3],   // 12px - compact cards
    md: spacingTokens[4],   // 16px - standard cards
    lg: spacingTokens[6],   // 24px - hero cards
    xl: spacingTokens[8],   // 32px - feature cards
  },
  
  // Layout spacing
  sectionSpacing: {
    sm: spacingTokens[6],   // 24px - tight sections
    md: spacingTokens[8],   // 32px - standard sections
    lg: spacingTokens[12],  // 48px - loose sections
    xl: spacingTokens[16],  // 64px - page sections
  },
  
  // Safe areas for mobile
  safeArea: {
    top: "env(safe-area-inset-top)",
    bottom: "env(safe-area-inset-bottom)", 
    left: "env(safe-area-inset-left)",
    right: "env(safe-area-inset-right)",
  },
  
  // Touch target compliance
  touchTarget: {
    minimum: "44px",        // WCAG AAA minimum
    comfortable: "48px",    // More comfortable target
    generous: "52px",       // Extra generous target
  },
  
  // Container system
  container: {
    padding: spacingTokens[4],     // 16px base padding
    maxWidth: {
      sm: "640px",
      md: "768px", 
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    }
  },
} as const;

// Migration helpers - common arbitrary values to token mapping
export const spacingMigrationMap = {
  // Padding migrations
  'p-[3px]': 'p-1',
  'p-[6px]': 'p-1.5',  
  'p-[10px]': 'p-2.5',
  'p-[14px]': 'p-3.5',
  'p-[18px]': 'p-4.5',
  'p-[22px]': 'p-5.5',
  
  // Margin migrations  
  'm-[3px]': 'm-1',
  'm-[6px]': 'm-1.5',
  'm-[10px]': 'm-2.5', 
  'm-[14px]': 'm-3.5',
  'm-[18px]': 'm-4.5',
  'm-[22px]': 'm-5.5',
  
  // Gap migrations
  'gap-[6px]': 'gap-1.5',
  'gap-[10px]': 'gap-2.5',
  'gap-[14px]': 'gap-3.5',
  'gap-[18px]': 'gap-4.5',
  'gap-[22px]': 'gap-5.5',
  
  // Width/height migrations
  'w-[44px]': 'w-11',
  'h-[44px]': 'h-11',
  'min-w-[44px]': 'min-w-11',
  'min-h-[44px]': 'min-h-11',
} as const;

export type SpacingToken = keyof typeof spacingTokens;
export type SemanticSpacing = keyof typeof semanticSpacing;