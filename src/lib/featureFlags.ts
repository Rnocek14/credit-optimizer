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
  skillTreeForceTagsFallback: boolean;
}

/**
 * Get feature flag values based on environment and query params
 */
export function getFeatureFlags(): FeatureFlags {
  const searchParams = new URLSearchParams(window.location.search);
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Helper function to get flag value with fallback parameter names
  const getFlagValue = (primaryParam: string, fallbackParam?: string, defaultValue: string = 'false'): string => {
    const primary = searchParams.get(primaryParam);
    if (primary !== null) return primary;
    
    if (fallbackParam) {
      const fallback = searchParams.get(fallbackParam);
      if (fallback !== null) return fallback;
    }
    
    return defaultValue;
  };
  
  // Debug URL parameters for troubleshooting
  if (typeof window !== 'undefined') {
    const urlParams = Object.fromEntries(searchParams);
    console.log('[flags] URL params:', urlParams);
    console.log('[flags] Raw URL:', window.location.search);
  }
  
  const flags = {
    // Today Dashboard - ENABLED for demo
    unifiedTodayDashboard: true,
    
    // Cross-hub triggers - ENABLED for demo
    crossHubTriggers: true,
    
    // CRI boost display - enabled everywhere
    criBoostDisplay: true,
    
    // Advanced telemetry - enabled in all environments
    advancedTelemetry: true,
    
    // Gamification features - enabled in dev, controllable in prod
    gamificationCelebrations: getFlagValue('gamification_celebrations', 'gamification-celebrations', 'true') !== 'false',
    gamificationGallery: getFlagValue('gamification_gallery', 'gamification-gallery', 'true') !== 'false',
    gamificationTimeline: getFlagValue('gamification_timeline', 'gamification-timeline', 'true') !== 'false',
    gamificationSound: getFlagValue('gamification_sound', 'gamification-sound') === 'true',
    
    // Growth layer - disabled by default, controllable via query param
    growthLayerEnabled: getFlagValue('growth_layer', 'growth-layer') === 'true',
    
    // Alternative courses - FLEXIBLE parameter names (alt_courses, alt-courses)
    altCoursesEnabled: getFlagValue('alt_courses', 'alt-courses') === 'true',
    
    // Skill Tree fallback - FLEXIBLE parameter names (skill_fallback, skill-fallback)
    skillTreeForceTagsFallback: getFlagValue('skill_fallback', 'skill-fallback', 'true') !== 'false',
  };
  
  // Debug logging with comprehensive flag state
  console.log('[flags] Current flag state:', {
    altCoursesEnabled: flags.altCoursesEnabled,
    skillTreeForceTagsFallback: flags.skillTreeForceTagsFallback,
    raw: window.location.search
  });
  console.log('[featureFlags]', flags);
  
  return flags;
}

/**
 * React hook for feature flags
 */
export function useFeatureFlags(): FeatureFlags {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const flags = getFeatureFlags();
  
  // dev log - One-time log per session
  if (typeof window !== 'undefined') {
    const key = '__ALT_FLAGS_LOGGED__';
    if (!(window as any)[key]) {
      console.log('[flags]', { 
        altCoursesEnabled: flags.altCoursesEnabled, 
        skillTreeForceTagsFallback: flags.skillTreeForceTagsFallback 
      });
      (window as any)[key] = true;
    }
  }
  
  return flags;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature];
}