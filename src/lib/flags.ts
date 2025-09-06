/**
 * Visual V2 Feature Flag
 * 
 * Enable via:
 * - localStorage.setItem('LP_VISUAL_V2', '1') + reload
 * - Set environment variable LP_VISUAL_V2=1
 * 
 * Disable via:
 * - localStorage.removeItem('LP_VISUAL_V2') + reload
 * - Remove environment variable
 */
export const LP_VISUAL_V2 =
  (typeof window !== 'undefined' && localStorage.getItem('LP_VISUAL_V2') === '1') ||
  (typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env?.LP_VISUAL_V2 === '1') ||
  (import.meta.env?.LP_VISUAL_V2 === '1') ||
  false;