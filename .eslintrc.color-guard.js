/**
 * ESLint Color Guard Rules - Prevents hardcoded colors and incorrect OKLCH usage
 * 
 * CRITICAL: This project uses OKLCH color values in CSS variables.
 * Never wrap CSS variables in hsl() - they already contain complete color values.
 * 
 * Add to existing ESLint config or use as standalone config
 * See: src/design/COLOR_SYSTEM.md
 */

module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      // ===== OKLCH Color System Guards =====
      // These are the MOST IMPORTANT rules - prevent the white outline bug
      {
        selector: 'Literal[value=/hsl\\(var\\(--(?!lp-)/]',
        message: '❌ OKLCH ERROR: Don\'t wrap CSS variables in hsl(). Variables contain full OKLCH values. Use var(--xxx) directly or color-mix(in oklch, var(--xxx) 50%, transparent) for opacity. See src/design/COLOR_SYSTEM.md'
      },
      {
        selector: 'TemplateLiteral[quasis.0.value.raw=/hsl\\(var\\(--(?!lp-)/]',
        message: '❌ OKLCH ERROR: Don\'t wrap CSS variables in hsl(). Variables contain full OKLCH values. Use var(--xxx) directly or color-mix(in oklch, var(--xxx) 50%, transparent) for opacity. See src/design/COLOR_SYSTEM.md'
      },
      
      // ===== Hardcoded Tailwind Color Guards =====
      {
        selector: 'Literal[value*="purple-"]',
        message: 'Hardcoded purple-* classes are forbidden. Use semantic primary-* tokens instead.'
      },
      {
        selector: 'Literal[value*="blue-"]',
        message: 'Hardcoded blue-* classes are forbidden. Use semantic info-* tokens instead.'
      },
      {
        selector: 'Literal[value*="red-"]',
        message: 'Hardcoded red-* classes are forbidden. Use semantic destructive-* tokens instead.'
      },
      {
        selector: 'Literal[value*="green-"]',
        message: 'Hardcoded green-* classes are forbidden. Use semantic success-* tokens instead.'
      },
      {
        selector: 'Literal[value*="yellow-"]',
        message: 'Hardcoded yellow-* classes are forbidden. Use semantic warning-* tokens instead.'
      },
      {
        selector: 'TemplateLiteral *[value*="purple-"]',
        message: 'Hardcoded purple-* classes are forbidden in template literals. Use semantic primary-* tokens instead.'
      }
    ],
    
    // Prevent hex colors in JavaScript/TypeScript
    'no-restricted-patterns': [
      'error',
      {
        pattern: '#([0-9a-f]{3}|[0-9a-f]{6})\\b',
        message: 'Hex colors are forbidden. Use design system tokens instead.'
      },
      {
        pattern: 'rgb\\([^)]+\\)',
        message: 'RGB colors are forbidden. Use design system tokens instead.'
      }
      // Note: We don't block all hsl() - only hsl(var(--)) patterns
      // because some hardcoded hsl values are acceptable for edge cases
    ]
  }
};

/**
 * QUICK REFERENCE:
 * 
 * ❌ WRONG:
 *   background: 'hsl(var(--primary))'
 *   border: '1px solid hsl(var(--border))'
 *   box-shadow: '0 4px 12px hsl(var(--foreground) / 0.1)'
 * 
 * ✅ CORRECT:
 *   background: 'var(--primary)'
 *   border: '1px solid var(--border)'
 *   box-shadow: '0 4px 12px color-mix(in oklch, var(--foreground) 10%, transparent)'
 * 
 * EXCEPTION - These --lp-* variables ARE raw HSL triplets:
 *   ✅ className="bg-[hsl(var(--lp-green-50))]"
 */