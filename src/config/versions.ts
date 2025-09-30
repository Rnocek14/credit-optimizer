/**
 * Centralized version configuration for query keys and caching
 * Bump these when schema/API changes require cache invalidation
 * Can be overridden via VITE_* environment variables
 */

import { ENV } from './env';

export const MARKETPLACE_VERSION = ENV.MARKETPLACE_VERSION;
export const EVIDENCE_VERSION    = ENV.EVIDENCE_VERSION;
export const IN_CHUNK: number    = ENV.IN_CHUNK;
