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
  
  // Debug URL parameters for troubleshooting
  if (typeof window !== 'undefined') {
    const urlParams = Object.fromEntries(searchParams);
    console.log('[flags] URL params:', urlParams);
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
    gamificationCelebrations: searchParams.get('gamification_celebrations') !== 'false',
    gamificationGallery: searchParams.get('gamification_gallery') !== 'false',
    gamificationTimeline: searchParams.get('gamification_timeline') !== 'false',
    gamificationSound: searchParams.get('gamification_sound') === 'true',
    
    // Growth layer - disabled by default, controllable via query param
    growthLayerEnabled: searchParams.get('growth_layer') === 'true',
    
    // Alternative courses - controllable via query param (alt_courses=true|false)
    altCoursesEnabled: searchParams.get('alt_courses') === 'true',
    
    // Skill Tree fallback - controllable via query param (skill_fallback=true|false)
    skillTreeForceTagsFallback: searchParams.get('skill_fallback') !== 'false',
  };
  
  // Debug logging (one-time log)
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