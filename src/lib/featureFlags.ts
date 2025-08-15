/**
 * Feature flags for safe rollout of new features
 */

interface FeatureFlags {
  unifiedTodayDashboard: boolean;
  crossHubTriggers: boolean;
  criBoostDisplay: boolean;
  advancedTelemetry: boolean;
}

/**
 * Get feature flag values based on environment and query params
 */
export function getFeatureFlags(): FeatureFlags {
  const searchParams = new URLSearchParams(window.location.search);
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // Today Dashboard - ENABLED for demo
    unifiedTodayDashboard: true,
    
    // Cross-hub triggers - ENABLED for demo
    crossHubTriggers: true,
    
    // CRI boost display - enabled everywhere
    criBoostDisplay: true,
    
    // Advanced telemetry - enabled in all environments
    advancedTelemetry: true,
  };
}

/**
 * React hook for feature flags
 */
export function useFeatureFlags(): FeatureFlags {
  return getFeatureFlags();
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature];
}