/**
 * ESLint configuration for enforcing motion preferences guard rules
 * Phase 3 Design System - Motion Guards
 */

module.exports = {
  rules: {
    // Custom rule to enforce motion guards
    'motion-guards/no-unguarded-animations': 'error',
    'motion-guards/require-reduced-motion-support': 'warn'
  },
  plugins: ['motion-guards'],
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        // Ensure animations are wrapped with motion-safe utilities
        'motion-guards/no-unguarded-animations': [
          'error',
          {
            // Patterns that require motion guards
            animationPatterns: [
              'animate-*',
              'transition-*',
              '@keyframes',
              'animation:',
              'transform:',
              'translateX',
              'translateY',
              'scale\\(',
              'rotate\\('
            ],
            // Required guard patterns
            guardPatterns: [
              'motion-safe:',
              'motion-reduce:',
              '@media (prefers-reduced-motion',
              'motionGuards.prefersReducedMotion',
              'respectsReducedMotion'
            ],
            // Exceptions - these are allowed without guards
            exceptions: [
              'focus:',
              'hover:',
              'transition-colors',
              'transition-opacity'
            ]
          }
        ]
      }
    }
  ]
};

// Custom ESLint plugin for motion guards
const motionGuardsPlugin = {
  rules: {
    'no-unguarded-animations': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce motion guards for animations',
          category: 'Accessibility',
          recommended: true
        },
        messages: {
          unguardedAnimation: 'Animation "{{animation}}" must be wrapped with motion guards (motion-safe: or @media prefers-reduced-motion)',
          missingReducedMotion: 'Custom keyframes must include @media (prefers-reduced-motion: reduce) fallback'
        }
      },
      create(context) {
        const options = context.options[0] || {};
        const animationPatterns = options.animationPatterns || [];
        const guardPatterns = options.guardPatterns || [];
        const exceptions = options.exceptions || [];

        function checkForMotionGuards(node, animationValue) {
          const sourceCode = context.getSourceCode();
          const text = sourceCode.getText();
          
          // Check if this animation has any guard patterns nearby
          const hasGuard = guardPatterns.some(pattern => {
            const regex = new RegExp(pattern, 'i');
            return regex.test(text);
          });

          // Check if this is an exception
          const isException = exceptions.some(exception => {
            const regex = new RegExp(exception, 'i');
            return regex.test(animationValue);
          });

          if (!hasGuard && !isException) {
            context.report({
              node,
              messageId: 'unguardedAnimation',
              data: {
                animation: animationValue
              }
            });
          }
        }

        return {
          // Check JSX className attributes
          JSXAttribute(node) {
            if (node.name.name === 'className' && node.value) {
              const classValue = node.value.value || '';
              
              animationPatterns.forEach(pattern => {
                const regex = new RegExp(pattern, 'g');
                let match;
                while ((match = regex.exec(classValue)) !== null) {
                  checkForMotionGuards(node, match[0]);
                }
              });
            }
          },

          // Check CSS-in-JS and styled-components
          TemplateLiteral(node) {
            const templateValue = node.quasis.map(q => q.value.raw).join('');
            
            animationPatterns.forEach(pattern => {
              const regex = new RegExp(pattern, 'g');
              let match;
              while ((match = regex.exec(templateValue)) !== null) {
                checkForMotionGuards(node, match[0]);
              }
            });
          },

          // Check object properties for style objects
          Property(node) {
            if (node.key.name && ['animation', 'transform', 'transition'].includes(node.key.name)) {
              const value = node.value.value || '';
              checkForMotionGuards(node, value);
            }
          }
        };
      }
    },

    'require-reduced-motion-support': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Suggest adding reduced motion support to keyframes',
          category: 'Accessibility'
        },
        messages: {
          addReducedMotion: 'Consider adding @media (prefers-reduced-motion: reduce) support for better accessibility'
        }
      },
      create(context) {
        return {
          // Look for @keyframes definitions
          AtRule(node) {
            if (node.name === 'keyframes') {
              const sourceCode = context.getSourceCode();
              const text = sourceCode.getText();
              
              // Check if there's a corresponding reduced motion rule
              if (!text.includes('prefers-reduced-motion')) {
                context.report({
                  node,
                  messageId: 'addReducedMotion'
                });
              }
            }
          }
        };
      }
    }
  }
};

// Export as a standard ESLint plugin
module.exports = motionGuardsPlugin;