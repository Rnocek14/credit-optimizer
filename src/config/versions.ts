/**
 * Centralized version configuration for query keys and caching
 * Bump these when schema/API changes require cache invalidation
 */

export const MARKETPLACE_VERSION = '2025-09-29' as const;
export const EVIDENCE_VERSION    = '2025-09-29' as const;
export const IN_CHUNK: number    = 500;     // keep as number for arithmetic
