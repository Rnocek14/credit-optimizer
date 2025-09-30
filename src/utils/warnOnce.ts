/**
 * Shared utility for one-time console warnings
 * Prevents log spam across the application
 */
export const warnOnce = (key: string, ...args: any[]) => {
  // Silent in production
  const IS_PROD =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD) ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
  if (IS_PROD) return;

  const bag: Set<string> = (typeof window !== 'undefined' && (window as any).__warnOnce) ?? new Set<string>();
  if (bag.has(key)) return;
  console.warn(...args);
  bag.add(key);
  if (typeof window !== 'undefined') (window as any).__warnOnce = bag;
};
