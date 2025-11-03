/**
 * Scoped debug utility for EduTree V5
 * Gated by ?debug=1 URL parameter
 */

export const dbg = (scope: string, payload?: unknown) => {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
    // eslint-disable-next-line no-console
    console.debug(`[EduV5:${scope}]`, payload ?? '');
  }
};
