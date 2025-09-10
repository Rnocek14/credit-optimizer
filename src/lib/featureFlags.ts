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
  eduTree: boolean; // Education-first skill tree
  
  // EduTree Layout Enhancement Flags
  eduTreeLayoutV2: boolean;    // Layout lifecycle + fixed ports
  eduTreeSubblocks: boolean;   // Sub-blocks + lane scaffolds  
  eduTreeLanes: boolean;       // Lane positioning system
  eduTreeOutcomes: boolean;    // Outcomes panel + intelligent lenses
  eduTreePlaceholders: boolean; // Requirement placeholder nodes
}

/**
 * Get feature flag values based on environment and query params
 */
export function getFeatureFlags(): FeatureFlags {
  const searchParams = new URLSearchParams(window.location.search);
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Helper function to get flag value with fallback parameter names and boolean coercion
  const getFlagValue = (primaryParam: string, fallbackParam?: string, defaultValue: string = 'false'): string => {
    const primary = searchParams.get(primaryParam);
    if (primary !== null) return primary;
    
    if (fallbackParam) {
      const fallback = searchParams.get(fallbackParam);
      if (fallback !== null) return fallback;
    }
    
    return defaultValue;
  };
  
  // Boolean coercion helper
  const toBool = (value: string): boolean => {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  };
  
  
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
    
    // Alternative courses - FLEXIBLE parameter names (alt_courses, alt-courses) with boolean coercion
    altCoursesEnabled: toBool(getFlagValue('alt_courses', 'alt-courses')),
    
    // Skill Tree fallback - FLEXIBLE parameter names (skill_fallback, skill-fallback) with boolean coercion
    skillTreeForceTagsFallback: toBool(getFlagValue('skill_fallback', 'skill-fallback', 'true')),
    
    // Education-first skill tree - enabled by default
    eduTree: toBool(getFlagValue('eduTree', 'edu-tree', 'true')),
    
    // EduTree Layout Enhancement Flags - Progressive rollout
    eduTreeLayoutV2: toBool(getFlagValue('eduTreeLayoutV2', 'edu-tree-layout-v2', 'true')),
    eduTreeSubblocks: toBool(getFlagValue('eduTreeSubblocks', 'edu-tree-subblocks', 'false')),
    eduTreeLanes: toBool(getFlagValue('eduTreeLanes', 'edu-tree-lanes', 'false')), 
    eduTreeOutcomes: toBool(getFlagValue('eduTreeOutcomes', 'edu-tree-outcomes', 'false')),
    eduTreePlaceholders: toBool(getFlagValue('eduTreePlaceholders', 'edu-tree-placeholders', 'false')),
  };
  
  // Single consolidated debug log (only once per session)
  if (typeof window !== 'undefined') {
    const key = '__FLAGS_LOGGED__';
    if (!(window as any)[key]) {
      console.log('[flags]', {
        raw: window.location.search,
        altCoursesEnabled: flags.altCoursesEnabled,
        skillTreeForceTagsFallback: flags.skillTreeForceTagsFallback
      });
      (window as any)[key] = true;
    }
  }
  
  return flags;
}

/**
 * React hook for feature flags
 */
export function useFeatureFlags(): FeatureFlags {
  // Return cached flags - logging is handled in getFeatureFlags()
  return getFeatureFlags();
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature];
}