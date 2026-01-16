/**
 * Invariant Explainer System - Public API
 * 
 * This module provides human-readable explanations for invariant violations.
 * It is PURELY INTERPRETIVE and does not modify invariant behavior.
 * 
 * Usage:
 * ```typescript
 * import { resolveBlockedReason, getExplainer } from '@/lib/invariant';
 * 
 * // Get full explained payload
 * const payload = resolveBlockedReason(invariantReport);
 * 
 * // Get explainer for a specific code
 * const explainer = getExplainer('INV_RESIDENCY_NOT_MET');
 * ```
 * 
 * @version 1.0.0
 */

// Core types
export type {
  InvariantCode,
  InvariantExplainer,
  ExplainerSeverity,
  ExplainerCategory,
  AudienceLevel,
} from './invariantExplainers';

// Explainer registry and helpers
export {
  INVARIANT_EXPLAINERS,
  getExplainer,
  getExplainersBySeverity,
  getExplainersByCategory,
  getExplainersForAudience,
  isKnownInvariantCode,
} from './invariantExplainers';

// Resolver types
export type {
  InvariantViolation,
  InvariantReport,
  ExplainedViolation,
  UnknownViolation,
  BlockedReasonPayload,
} from './resolveBlockedReason';

// Resolver functions
export {
  resolveBlockedReason,
  getMarketplaceBlockedMessage,
  getMarketplaceWarningMessage,
  hasAdminOnlyErrors,
  getViolationCategories,
} from './resolveBlockedReason';
