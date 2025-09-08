/**
 * Tailwind Color Configuration - OKLCH Integration
 * Provides color tokens for Tailwind CSS configuration
 */

const { colorTokens, lightModeTokens, darkModeTokens } = require('./color.tokens.ts');

// Export for Tailwind config
module.exports = {
  lightModeTokens,
  darkModeTokens,
  colorTokens,
};