/**
 * Shared utility for one-time console warnings
 * Prevents log spam across the application
 */
export const warnOnce = (key: string, ...args: any[]) => {
  const bag: Set<string> = (typeof window !== 'undefined' && (window as any).__warnOnce) ?? new Set<string>();
  if (bag.has(key)) return;
  console.warn(...args);
  bag.add(key);
  if (typeof window !== 'undefined') (window as any).__warnOnce = bag;
};
