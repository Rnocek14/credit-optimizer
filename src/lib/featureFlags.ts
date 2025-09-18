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
  eduTreeStaggeredEdgesV2: boolean; // V2 staggered edge system
  eduTreeMultiPathOverlay: boolean; // Multipath track comparison overlay
  eduTreeV2EdgeKinds: boolean; // V2 educational edge types and header nodes
  
  // Clean Slate V2 Flags
  eduTreeV2Grid: boolean; // Master flag for V2 system
  eduTreeLayoutMode: 'legacy' | 'manual_v1' | 'grid_v2'; // Layout system mode
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
    eduTreeLanes: toBool(getFlagValue('eduTreeLanes', 'edu-tree-lanes', 'true')), 
    eduTreeOutcomes: toBool(getFlagValue('eduTreeOutcomes', 'edu-tree-outcomes', 'true')),
    eduTreePlaceholders: toBool(getFlagValue('eduTreePlaceholders', 'edu-tree-placeholders', 'false')),
    eduTreeStaggeredEdgesV2: toBool(getFlagValue('eduTreeStaggeredEdgesV2', 'edu-tree-staggered-edges-v2', 'true')),
    eduTreeV2EdgeKinds: toBool(getFlagValue('eduTreeV2EdgeKinds', 'edu-tree-v2-edge-kinds', 'false')),
    // EduTree multipath overlay for track comparison
    eduTreeMultiPathOverlay: (() => {
      const url = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('eduTreeMultiPathOverlay') : null;
      const resolved = toBool(getFlagValue('eduTreeMultiPathOverlay','edu-tree-multipath-overlay','true'));
      if (typeof window !== 'undefined') {
        console.log('[Flags]', {
          url,
          resolved,
          final: url !== null ? toBool(url) : resolved
        });
      }
      return url !== null ? toBool(url) : resolved;
    })(),
  
  // Clean Slate V2 Flags
  // V2: master grid switch (boolean)
  eduTreeV2Grid: (() => {
    const urlVal =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("eduTreeV2Grid")
        : null;

    const resolved = toBool(getFlagValue("eduTreeV2Grid", "edu-tree-v2-grid", "false"));

    if (typeof window !== "undefined") {
      console.log("[Flags][V2Grid]", { urlVal, resolved, final: urlVal !== null ? toBool(urlVal) : resolved });
    }
    return urlVal !== null ? toBool(urlVal) : resolved;
  })(),

  // V2: layout mode (string enum)
  eduTreeLayoutMode: (() => {
    const urlVal =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("eduTreeLayoutMode")
        : null;

    const raw = urlVal ?? getFlagValue("eduTreeLayoutMode", "edu-tree-layout-mode", "legacy");
    const valid: Array<"legacy" | "manual_v1" | "grid_v2"> = ["legacy", "manual_v1", "grid_v2"];
    const mode = (valid as readonly string[]).includes(raw) ? (raw as "legacy" | "manual_v1" | "grid_v2") : "legacy";

    if (typeof window !== "undefined") {
      console.log("[Flags][V2Mode]", { urlVal, final: mode });
    }
    return mode;
  })(),
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
 * Only works with boolean feature flags
 */
export function isFeatureEnabled(feature: Exclude<keyof FeatureFlags, 'eduTreeLayoutMode'>): boolean {
  const flags = getFeatureFlags();
  const value = flags[feature];
  
  // Ensure we're returning a boolean
  if (typeof value === 'boolean') {
    return value;
  }
  
  // This should never happen with proper typing, but fallback to false
  console.warn(`[FeatureFlags] Expected boolean for ${String(feature)}, got:`, typeof value);
  return false;
}