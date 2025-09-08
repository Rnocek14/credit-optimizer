/**
 * ESLint Color Guard Rules - Prevents hardcoded colors in codebase
 * Add to existing ESLint config or use as standalone config
 */

module.exports = {
  rules: {
    // Prevent hardcoded Tailwind color utilities
    'no-restricted-syntax': [
      'error',
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
      },
      {
        pattern: 'hsl\\([^)]+\\)',
        message: 'HSL colors are forbidden. Use design system tokens instead.'
      }
    ]
  }
};