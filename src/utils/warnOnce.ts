/**
 * Shared utility for one-time console warnings
 * Prevents log spam across the application
 */
import { ENV } from '@/config/env';

export const warnOnce = (key: string, ...args: unknown[]) => {
  if (ENV.PROD) return; // silent in prod
  const bag: Set<string> = (typeof window !== 'undefined' && (window as any).__warnOnce) ?? new Set<string>();
  if (bag.has(key)) return;
  console.warn(...args);
  bag.add(key);
  if (typeof window !== 'undefined') (window as any).__warnOnce = bag;
};
