/**
 * WCAG Contrast Validation Utilities
 * Validates design system color contrast ratios for accessibility compliance
 */

interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passes: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate luminance
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Validate contrast level
function getContrastLevel(ratio: number): 'AA' | 'AAA' | 'FAIL' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'FAIL';
}

export function validateDesignSystemContrast(): ContrastResult[] {
  // Common design system color pairs to test
  const testPairs = [
    // Primary colors
    { fg: '#000000', bg: '#ffffff', name: 'Black on White' },
    { fg: '#ffffff', bg: '#000000', name: 'White on Black' },
    { fg: '#6366f1', bg: '#ffffff', name: 'Primary on White' },
    { fg: '#ffffff', bg: '#6366f1', name: 'White on Primary' },
    // Muted colors
    { fg: '#64748b', bg: '#ffffff', name: 'Muted on White' },
    { fg: '#ffffff', bg: '#64748b', name: 'White on Muted' },
    // Success/Warning/Error
    { fg: '#16a34a', bg: '#ffffff', name: 'Success on White' },
    { fg: '#f59e0b', bg: '#ffffff', name: 'Warning on White' },
    { fg: '#dc2626', bg: '#ffffff', name: 'Destructive on White' },
  ];

  return testPairs.map(({ fg, bg, name }) => {
    const ratio = getContrastRatio(fg, bg);
    const level = getContrastLevel(ratio);
    
    return {
      foreground: fg,
      background: bg,
      ratio: Math.round(ratio * 100) / 100,
      passes: ratio >= 4.5,
      level,
    };
  });
}

export function generateContrastReport(): string {
  const results = validateDesignSystemContrast();
  
  let report = '# WCAG Contrast Validation Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n`;
  report += `- Total tests: ${results.length}\n`;
  report += `- Passing (≥4.5): ${results.filter(r => r.passes).length}\n`;
  report += `- AAA level (≥7.0): ${results.filter(r => r.level === 'AAA').length}\n\n`;
  
  report += `## Detailed Results\n\n`;
  report += `| Colors | Ratio | Level | Status |\n`;
  report += `|--------|-------|-------|--------|\n`;
  
  results.forEach(result => {
    const status = result.passes ? '✅' : '❌';
    report += `| ${result.foreground} on ${result.background} | ${result.ratio}:1 | ${result.level} | ${status} |\n`;
  });
  
  if (results.some(r => !r.passes)) {
    report += '\n## Recommendations\n\n';
    report += '- Failing pairs should be adjusted to meet WCAG AA (4.5:1) minimum\n';
    report += '- Consider AAA level (7:1) for body text and critical content\n';
    report += '- Use design system semantic tokens instead of hardcoded colors\n';
  }
  
  return report;
}