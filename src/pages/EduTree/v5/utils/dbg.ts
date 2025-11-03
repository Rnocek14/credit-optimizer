/**
 * Debug utility for EduTree V5
 * Enable with ?debug=1 in URL
 */

export const dbg = (scope: string, payload?: any) => {
  if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
    console.debug(`[EduV5:${scope}]`, payload ?? '');
  }
};
