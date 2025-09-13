export function safe<T>(fn: () => T, fallback: T, tag = 'SAFE') {
  try { 
    return fn(); 
  } catch (e) {
    // don't setState here; render-safe log only
    // eslint-disable-next-line no-console
    console.warn(`[${tag}]`, e);
    return fallback;
  }
}