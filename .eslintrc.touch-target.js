/**
 * Touch Target Compliance ESLint Rules
 * Prevents undersized interactive elements that violate WCAG guidelines
 */

module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value*="min-h-8"], Literal[value*="min-h-9"], Literal[value*="min-h-10"], Literal[value*="min-h-11"]',
        message: 'Interactive elements must use min-h-12 or larger (≥48px) for WCAG AAA compliance. Found undersized min-height.',
      },
      {
        selector: 'Literal[value*="h-8"], Literal[value*="h-9"], Literal[value*="h-10"], Literal[value*="h-11"]',
        message: 'Interactive elements should use h-12 or larger (≥48px) for optimal touch targets. Consider if this is an interactive element.',
      },
      {
        selector: 'Literal[value*="min-w-8"], Literal[value*="min-w-9"], Literal[value*="min-w-10"], Literal[value*="min-w-11"]',
        message: 'Interactive elements must use min-w-12 or larger (≥48px) for WCAG AAA compliance. Found undersized min-width.',
      },
      // Catch button components with undersized classes
      {
        selector: 'JSXElement[openingElement.name.name="Button"] JSXAttribute[name.name="className"] Literal[value*="h-8"]',
        message: 'Button components must use h-12 or larger (≥48px) for touch target compliance.',
      },
      {
        selector: 'JSXElement[openingElement.name.name="Button"] JSXAttribute[name.name="className"] Literal[value*="h-9"]',
        message: 'Button components must use h-12 or larger (≥48px) for touch target compliance.',
      },
      {
        selector: 'JSXElement[openingElement.name.name="Button"] JSXAttribute[name.name="className"] Literal[value*="h-10"]',
        message: 'Button components must use h-12 or larger (≥48px) for touch target compliance.',
      },
      {
        selector: 'JSXElement[openingElement.name.name="Button"] JSXAttribute[name.name="className"] Literal[value*="h-11"]',
        message: 'Button components must use h-12 or larger (≥48px) for touch target compliance.',
      },
    ],
  },
};