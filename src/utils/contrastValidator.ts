/**
 * WCAG Contrast Validation for OKLCH Color System
 * Ensures all color combinations meet accessibility standards
 */

/**
 * Convert OKLCH to sRGB for contrast calculations
 */
function oklchToSrgb(l: number, c: number, h: number): [number, number, number] {
  // Simplified OKLCH to sRGB conversion
  // In production, use a proper color conversion library like culori
  
  // Convert hue to radians
  const hRad = (h * Math.PI) / 180;
  
  // Convert to LAB
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  
  // Simplified LAB to sRGB conversion (approximation)
  // This is a simplified version - use proper color science library in production
  const r = Math.max(0, Math.min(1, l + 0.3963377774 * a + 0.2158037573 * b));
  const g = Math.max(0, Math.min(1, l - 0.1055613458 * a - 0.0638541728 * b));
  const b_srgb = Math.max(0, Math.min(1, l - 0.0894841775 * a - 1.2914855480 * b));
  
  return [r, g, b_srgb];
}

/**
 * Calculate relative luminance from sRGB values
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const linearize = (val: number) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };
  
  const rLin = linearize(r);
  const gLin = linearize(g);
  const bLin = linearize(b);
  
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
function calculateContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
  const l1 = getRelativeLuminance(...color1);
  const l2 = getRelativeLuminance(...color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse OKLCH string to components
 */
function parseOklch(oklchString: string): [number, number, number] {
  // Extract numbers from OKLCH string like "0.75 0.12 270"
  const matches = oklchString.match(/[\d.]+/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Invalid OKLCH string: ${oklchString}`);
  }
  
  return [
    parseFloat(matches[0]), // Lightness
    parseFloat(matches[1]), // Chroma
    parseFloat(matches[2])  // Hue
  ];
}

/**
 * Validate contrast ratio between two OKLCH colors
 */
export function validateContrastRatio(
  foregroundOklch: string,
  backgroundOklch: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): { passes: boolean; ratio: number; required: number } {
  const requiredRatios = {
    AA: size === 'large' ? 3.0 : 4.5,
    AAA: size === 'large' ? 4.5 : 7.0,
  };
  
  try {
    const [l1, c1, h1] = parseOklch(foregroundOklch);
    const [l2, c2, h2] = parseOklch(backgroundOklch);
    
    const fgSrgb = oklchToSrgb(l1, c1, h1);
    const bgSrgb = oklchToSrgb(l2, c2, h2);
    
    const ratio = calculateContrastRatio(fgSrgb, bgSrgb);
    const required = requiredRatios[level];
    
    return {
      passes: ratio >= required,
      ratio: Math.round(ratio * 100) / 100,
      required
    };
  } catch (error) {
    console.error('Error calculating contrast ratio:', error);
    return {
      passes: false,
      ratio: 0,
      required: requiredRatios[level]
    };
  }
}

/**
 * Validate all contrast pairs in the design system
 */
export function validateDesignSystemContrast(): Array<{
  pair: string;
  passes: boolean;
  ratio: number;
  required: number;
  level: 'AA' | 'AAA';
}> {
  // Import color tokens (this would be dynamic in real implementation)
  const lightTokens = {
    text: "0.23 0.00 0",
    textMuted: "0.42 0.00 0",
    surface: "0.99 0.00 0",
    surface2: "0.96 0.00 0",
    primary: "0.75 0.12 270",
    success: "0.80 0.11 140",
    warning: "0.85 0.15 70",
    destructive: "0.68 0.16 30",
    info: "0.75 0.10 240"
  };
  
  const darkTokens = {
    text: "0.92 0.00 0",
    textMuted: "0.75 0.00 0",
    surface: "0.09 0.00 0",
    surface2: "0.15 0.00 0",
    primary: "0.78 0.07 270",
    success: "0.75 0.07 140",
    warning: "0.80 0.09 70",
    destructive: "0.65 0.10 30",
    info: "0.70 0.06 240"
  };
  
  const testPairs = [
    { fg: 'text', bg: 'surface', level: 'AAA' as const },
    { fg: 'textMuted', bg: 'surface', level: 'AA' as const },
    { fg: 'text', bg: 'surface2', level: 'AA' as const },
    { fg: 'primary', bg: 'surface', level: 'AA' as const },
    { fg: 'success', bg: 'surface', level: 'AA' as const },
    { fg: 'warning', bg: 'surface', level: 'AA' as const },
    { fg: 'destructive', bg: 'surface', level: 'AA' as const },
    { fg: 'info', bg: 'surface', level: 'AA' as const },
  ];
  
  const results: Array<{
    pair: string;
    passes: boolean;
    ratio: number;
    required: number;
    level: 'AA' | 'AAA';
  }> = [];
  
  // Test light mode
  testPairs.forEach(({ fg, bg, level }) => {
    const result = validateContrastRatio(
      lightTokens[fg as keyof typeof lightTokens],
      lightTokens[bg as keyof typeof lightTokens],
      level
    );
    
    results.push({
      pair: `light-${fg}-on-${bg}`,
      passes: result.passes,
      ratio: result.ratio,
      required: result.required,
      level
    });
  });
  
  // Test dark mode
  testPairs.forEach(({ fg, bg, level }) => {
    const result = validateContrastRatio(
      darkTokens[fg as keyof typeof darkTokens],
      darkTokens[bg as keyof typeof darkTokens],
      level
    );
    
    results.push({
      pair: `dark-${fg}-on-${bg}`,
      passes: result.passes,
      ratio: result.ratio,
      required: result.required,
      level
    });
  });
  
  return results;
}

/**
 * Generate contrast validation report
 */
export function generateContrastReport(): string {
  const results = validateDesignSystemContrast();
  const passed = results.filter(r => r.passes).length;
  const total = results.length;
  
  let report = `# WCAG Contrast Validation Report\n\n`;
  report += `## Summary: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)\n\n`;
  
  report += `## Results\n\n`;
  results.forEach(result => {
    const status = result.passes ? '✅' : '❌';
    const ratio = result.ratio.toFixed(2);
    report += `${status} **${result.pair}**: ${ratio}:1 (required: ${result.required}:1 ${result.level})\n`;
  });
  
  const failures = results.filter(r => !r.passes);
  if (failures.length > 0) {
    report += `\n## ⚠️ Failed Tests\n\n`;
    failures.forEach(failure => {
      report += `- **${failure.pair}**: ${failure.ratio.toFixed(2)}:1 < ${failure.required}:1 (${failure.level})\n`;
    });
  }
  
  report += `\n---\nGenerated: ${new Date().toISOString()}\n`;
  
  return report;
}