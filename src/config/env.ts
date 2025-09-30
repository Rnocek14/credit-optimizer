/**
 * Centralized environment variable access
 * Works across Vite, Next.js, Node, SSR, and browser contexts
 * Prevents "process is not defined" errors
 */

type Boolish = string | boolean | undefined | null;

const read = (k: string): string | undefined => {
  // Prefer Vite/RSBuild-style
  // @ts-ignore - some bundlers don't type env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && k in (import.meta as any).env) {
    // @ts-ignore
    return (import.meta as any).env[k];
  }
  // Node/Next/webpack
  if (typeof process !== 'undefined' && process.env && k in process.env) {
    return process.env[k];
  }
  return undefined;
};

const asBool = (v: Boolish, defaultVal = false) =>
  v === true || v === 'true' ? true : v === false || v === 'false' ? false : defaultVal;

export const ENV = {
  PROD: asBool(read('PROD') ?? read('NODE_ENV') === 'production', false),
  AUDIT_SEEDS: asBool(read('AUDIT_SEEDS'), false),
  AUDIT_MP: asBool(read('AUDIT_MP'), true),            // default true
  DEGREE_MARKETPLACE: asBool(read('VITE_LP_DEGREE_MARKETPLACE'), false),
  MARKETPLACE_VERSION: read('VITE_MARKETPLACE_VERSION') ?? '2025-09-29',
  EVIDENCE_VERSION: read('VITE_EVIDENCE_VERSION') ?? '2025-09-29',
  IN_CHUNK: Number(read('VITE_IN_CHUNK') ?? 500),
} as const;
