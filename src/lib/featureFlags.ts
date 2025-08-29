/**
 * Feature flags for safe rollout of new features
 */

interface FeatureFlags {
  unifiedTodayDashboard: boolean;
  crossHubTriggers: boolean;
  criBoostDisplay: boolean;
  advancedTelemetry: boolean;
  gamificationCelebrations: boolean;
  gamificationGallery: boolean;
  gamificationTimeline: boolean;
  gamificationSound: boolean;
  growthLayerEnabled: boolean;
  altCoursesEnabled: boolean;
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
    
    // Gamification features - enabled in dev, controllable in prod
    gamificationCelebrations: searchParams.get('gamification_celebrations') !== 'false',
    gamificationGallery: searchParams.get('gamification_gallery') !== 'false',
    gamificationTimeline: searchParams.get('gamification_timeline') !== 'false',
    gamificationSound: searchParams.get('gamification_sound') === 'true',
    
    // Growth layer - disabled by default, controllable via query param
    growthLayerEnabled: searchParams.get('growth_layer') === 'true',
    
    // Alternative courses - disabled by default, controllable via query param
    altCoursesEnabled: searchParams.get('alt_courses') === 'true',
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