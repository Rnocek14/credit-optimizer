import React, { useRef, useEffect, useState, useMemo, Component, ReactNode, startTransition } from 'react';
import { Drawer as DrawerPrimitive } from "vaul";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import '../styles/decisionDock.css';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScopeBreadcrumbs } from './ScopeBreadcrumbs';
import { usePlanStore } from '../state/usePlanStore';
import { usePlanBasket } from '../state/usePlanBasket';
import { calculateOptionScore } from '../utils/optionScoring';
import { useScoringPrefs } from '../state/useScoringPrefs';
import { validatePlan } from '../engine/constraints';
import { autoCompletePlan } from '../engine/autoComplete';
import { getAutoCompleteMessage } from '../engine/autoCompleteStatus';
import { ENV } from '@/config/env';
import ConstraintsPanel from './ConstraintsPanel';
import { usePlanBasketWithToasts } from '../hooks/usePlanBasketWithToasts';
import { AutoFillPlanButton } from './AutoFillDialog';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { mapWeightsForEngine } from '../utils/weightMapping';
import { ScenarioManager } from './ScenarioManager';
import { TransferBadge } from './TransferBadge';
import { ModuleTemplatesPanel } from './scope/ModuleTemplatesPanel';
import { YearTemplatesPanel } from './scope/YearTemplatesPanel';
import { useApplyYearTemplate } from '../hooks/useApplyYearTemplate';
import { useV5DatabaseData } from '../hooks/useV5DatabaseData';
import type { PanelScope } from '../hooks/useScopedPanel';
import type { DegreeSummary, ModuleData } from '../types/v5';
import type { ProviderType, ScoreBreakdown } from '../utils/optionScoring';
import type { BasketItem } from '../state/usePlanBasket';
import type { ModuleTemplate } from '../types/templates';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from 'sonner';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { getTemplateCourses } from '../utils/templateHelpers';
import { buildYearPlan, YEAR_PRESETS } from '../engine/yearPlanner';
import { getAnchorPolicyFromConstraints } from '../utils/anchorPolicyAdapter';
import { useRequirementBlocks } from '../hooks/useRequirementBlocks';

// Fix 1A: Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    try {
      void trackTelemetryEvent({
        task: 'module_templates_crash',
        scope: 'error',
        complexity: {
          message: error.message,
          stack: error.stack?.substring(0, 200)
        }
      });
    } catch (telemetryError) {
      console.warn('[Telemetry] Failed to track error:', telemetryError);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface MarketplaceOption {
  id: string;
  courseId: string;
  title: string;
  credits: number;
  provider: string;
  providerType?: ProviderType;
  providerCode?: string;
  level?: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  aceNccrs?: boolean;
  proctored?: boolean;
  providerRep?: number;
  pace_type?: 'self_paced' | 'cohort';
  start_windows?: string[];
  workload_weekly_hours?: number;
  satisfies_requirements?: string[];
  prereq_course_ids?: string[];
  unlocks_count?: number;
  equivalency_key?: string;
}

interface DecisionDockRouterProps {
  scope: PanelScope;
  nodeId?: string;
  nodeData?: any;
  activeTab?: string;
  onClose: () => void;
  onNavigate: (scope: PanelScope, nodeId?: string, nodeData?: any) => void;
  onTabChange: (tab: string) => void;
  degreeSummary?: DegreeSummary;
  year?: number;
  yearModules?: ModuleData[];
  onOpenModulePanel?: (module: ModuleData) => void;
  moduleId?: string;
  moduleLabel?: string;
  creditsEarned?: number;
  creditsRequired?: number;
  options?: any[];
  sortBy?: 'cheapest' | 'shortest' | 'credits' | 'best-match';
  setSortBy?: (v: 'cheapest' | 'shortest' | 'credits' | 'best-match') => void;
  yearEarned?: number;
  yearCap?: number;
  allModules?: any[];
}

export function DecisionDockRouter(props: DecisionDockRouterProps) {
  const { scope, onClose } = props;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const titleId = useMemo(() => `decision-dock-title-${scope ?? "closed"}`, [scope]);
  const openAtRef = useRef<number | null>(null);
  
  // Calculate viewport dimensions and snap points synchronously for SSR-safe init
  const getInitialViewportAndSnaps = () => {
    if (typeof window === 'undefined') {
      return {
        viewport: { width: 1024, height: 768 },
        snapPoints: ["148px", "355px", "648px"], // SSR fallback
        defaultSnap: "355px"
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 640;
    
    const snapPoints = isMobile
      ? ["120px", `${Math.round(height * 0.45)}px`, `${height - 80}px`]
      : ["148px", `${Math.round(height * 0.5)}px`, `${height - 120}px`];
    
    return {
      viewport: { width, height },
      snapPoints,
      defaultSnap: snapPoints[1] // Always use middle snap as default
    };
  };

  // Track viewport dimensions for reactive snap point calculation
  const [viewportDimensions, setViewportDimensions] = useState(() => {
    const initial = getInitialViewportAndSnaps();
    return initial.viewport;
  });

  // Initialize activeSnapPoint - scope-specific defaults for better UX
  const [activeSnapPoint, setActiveSnapPoint] = useState<string | number | null>(() => {
    const initial = getInitialViewportAndSnaps();
    
    // Clear stale localStorage value to prevent invalid snap points
    if (typeof window !== 'undefined') {
      localStorage.removeItem('v5_dock_snap');
    }
    
    // Degree scope starts at larger snap for better visibility (more content)
    const defaultIndex = scope === 'degree' ? 2 : 1; // Large for degree, Medium for others
    const defaultSnap = initial.snapPoints[defaultIndex];
    
    console.log('[DecisionDock] 🎯 Initializing snap for scope:', {
      scope,
      defaultSnap,
      defaultIndex
    });
    
    return defaultSnap;
  });

  // Track previous scope to detect actual scope changes (not just snap point changes)
  const previousScopeRef = useRef<PanelScope>(scope);

  const snapPoints = useMemo(() => {
    const { width, height } = viewportDimensions;
    const isMobile = width < 640;
    
    if (isMobile) {
      return [
        `${Math.round(height * 0.15)}px`,   // Small: 15% of viewport (always visible)
        `${Math.round(height * 0.45)}px`,   // Medium: 45% of screen for analysis
        `${height - 80}px`                  // Large: nearly full screen minus header
      ];
    }
    
    // Year scope gets taller default snap point for better visibility
    const mediumHeight = scope === 'year' 
      ? Math.round(height * 0.65)  // 65% for year scope
      : scope === 'module'
        ? Math.round(height * 0.6)   // 60% for module scope (taller)
        : Math.round(height * 0.5);  // 50% for degree scope
    
    // Desktop: Use percentage-based snap points to avoid Vaul transform overflow
    const minHeight = Math.round(height * 0.18); // 18% minimum (always visible)
    
    return [
      `${minHeight}px`,                   // Small: percentage-based to prevent overflow
      `${mediumHeight}px`,                // Medium: 50-65% depending on scope
      `${height - 120}px`                 // Large: nearly full screen
    ];
  }, [viewportDimensions, scope]);

  // Reset snap point ONLY when scope changes, not on manual resize
  useEffect(() => {
    // Check if scope actually changed (not just activeSnapPoint)
    const scopeChanged = previousScopeRef.current !== scope;
    
    if (!scopeChanged) {
      // Same scope - don't reset (allow user manual resizing)
      return;
    }
    
    // Update ref for next comparison
    previousScopeRef.current = scope;
    
    if (!scope) return; // Don't reset when closing
    
    // Determine scope-specific snap index
    const defaultIndex = scope === 'degree' ? 2 : 1; // Large for degree, Medium for others
    const targetSnap = snapPoints[defaultIndex];
    
    console.log('[DecisionDock] 🔄 Scope changed, resetting snap point:', {
      previousScope: previousScopeRef.current,
      newScope: scope,
      from: activeSnapPoint,
      to: targetSnap,
      index: defaultIndex,
      scopeActuallyChanged: true
    });
    
    startTransition(() => {
      setActiveSnapPoint(targetSnap);
    });
  }, [scope, snapPoints]); // ✅ Removed activeSnapPoint from dependencies to allow manual resizing

  // Phase 2: Removed redundant correction useEffect (validation now in setActiveSnapPoint callback)


  // Debug: Log snap configuration (Phase 2: Removed correction logic)
  useEffect(() => {
    const isValid = typeof activeSnapPoint === 'string' && snapPoints.includes(activeSnapPoint);
    
    console.log('[DecisionDock] Snap configuration:', {
      snapPoints,
      activeSnapPoint,
      viewportDimensions,
      isValidSnap: isValid,
      scope,
      isOpen: !!scope
    });
  }, [snapPoints, activeSnapPoint, viewportDimensions, scope]);

  // Update viewport dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      setViewportDimensions(prev => {
        // Only update if dimensions actually changed
        if (prev.width === newWidth && prev.height === newHeight) {
          return prev;
        }
        return { width: newWidth, height: newHeight };
      });
    };

    // Throttle resize events (max once per 100ms)
    let timeoutId: NodeJS.Timeout;
    const throttledResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', throttledResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', throttledResize);
    };
  }, []);

  // Phase 3: Auto-correct snap point when snapPoints array changes (viewport resize only)
  useEffect(() => {
    if (activeSnapPoint === null) return;
    
    const isValid = typeof activeSnapPoint === 'string' && snapPoints.includes(activeSnapPoint);
    
    if (!isValid) {
      console.warn('[DecisionDock] ⚠️ Snap point invalidated by viewport change:', {
        oldSnapPoint: activeSnapPoint,
        newSnapPoints: snapPoints,
        resettingTo: snapPoints[1]
      });
      
      // Reset to middle snap point with low-priority update
      const newSnap = snapPoints[1];
      
      // Use startTransition for smoother updates
      startTransition(() => {
        setActiveSnapPoint(newSnap);
      });
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('v5_dock_snap', newSnap);
      }
    }
  }, [snapPoints]); // Only depend on snapPoints, not activeSnapPoint (avoid loops)
  
  // Phase 4: Clear stale localStorage on every mount
  useEffect(() => {
    // Clear any stale localStorage snap points when scope changes
    if (scope && typeof window !== 'undefined') {
      const storedSnap = localStorage.getItem('v5_dock_snap');
      if (storedSnap && !snapPoints.includes(storedSnap)) {
        console.log('[DecisionDock] 🧹 Clearing stale localStorage snap:', storedSnap);
        localStorage.removeItem('v5_dock_snap');
      }
    }
  }, [scope, snapPoints]);
  
  // SSR-safe tab persistence
  const [activeTabInternal, setActiveTabInternal] = useState(props.activeTab || 'templates');

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && scope && props.nodeId) {
      const key = `last-tab-${scope}-${props.nodeId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setActiveTabInternal(stored);
        props.onTabChange?.(stored);
      }
    }
  }, [scope, props.nodeId]);

  const handleTabChange = (tab: string) => {
    setActiveTabInternal(tab);
    props.onTabChange?.(tab);
    
    // Persist to localStorage (client-side only)
    if (typeof window !== 'undefined' && scope && props.nodeId) {
      const key = `last-tab-${scope}-${props.nodeId}`;
      localStorage.setItem(key, tab);
    }
    
    void trackTelemetryEvent({
      task: 'tab_changed',
      scope: scope || 'unknown',
      complexity: { tab, nodeId: props.nodeId }
    });
  };

  // Apply dimming effect to plan board + ensure drawer stays visible
  useEffect(() => {
    if (scope) {
      document.body.classList.add('decision-dock-open');
      
      // ✅ Phase 2: Apply scroll behavior to ALL scopes (removed year exemption)
      setTimeout(() => {
        if (typeof window === 'undefined') return;
        
        const viewportHeight = window.innerHeight;
        const drawerHeight = typeof activeSnapPoint === 'string' 
          ? parseInt(activeSnapPoint) 
          : Math.round(viewportHeight * 0.5);
        
        // Ensure drawer stays visible for all scopes
        const currentScroll = window.scrollY;
        const maxVisibleScroll = document.documentElement.scrollHeight - viewportHeight - drawerHeight;
        
        // Only scroll if needed and maxVisibleScroll is valid
        if (currentScroll > maxVisibleScroll && maxVisibleScroll >= 0) {
          window.scrollTo({
            top: Math.max(0, maxVisibleScroll),
            behavior: 'smooth'
          });
        }
      }, 150);
    }
    return () => {
      document.body.classList.remove('decision-dock-open');
    };
  }, [scope, props.year, activeSnapPoint]);

  // Escape key handler
  useEffect(() => {
    if (!scope) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [scope, onClose]);

  // Clean up any stray cursor styles on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);


  // Telemetry: track dock open/close and duration
  useEffect(() => {
    if (scope && !openAtRef.current) {
      openAtRef.current = Date.now();
      
      // First-time guidance toast
      if (!localStorage.getItem('v5_dock_hint_shown')) {
        localStorage.setItem('v5_dock_hint_shown', '1');
        toast("💡 Tip: All course decisions happen in the Decision Dock", {
          duration: 6000,
          action: {
            label: "Got it",
            onClick: () => {}
          }
        });
      }
      
    trackTelemetryEvent({
      task: 'dock_opened',
      route: '/edu-tree-v5',
      complexity: { 
        schema_version: 1, 
        scope,
        has_degree_summary: scope === 'degree' ? !!props.degreeSummary : undefined
      }
    });
    } else if (!scope && openAtRef.current) {
      const durationMs = Date.now() - openAtRef.current;
    trackTelemetryEvent({
      task: 'dock_closed',
      route: '/edu-tree-v5',
      complexity: { 
        schema_version: 1,
        duration_ms: durationMs,
        duration_sec: Math.round(durationMs / 1000)
      }
    });
      openAtRef.current = null;
    }
  }, [scope]);

  // DEBUG: Log scope and open state with module-specific props
  console.log('[DecisionDockRouter] Render check:', {
    scope,
    isOpen: !!scope,
    nodeId: props.nodeId,
    year: props.year,
    yearModulesCount: props.yearModules?.length ?? 0,
    snapPoints,
    activeSnapPoint,
    // ✅ Phase 4: Enhanced degree-specific debug with snap validation
    degreeProps: scope === 'degree' ? {
      hasDegreeSummary: !!props.degreeSummary,
      degreeTitle: props.degreeSummary?.degreeTitle,
      totalCreditsRequired: props.degreeSummary?.totalCreditsRequired,
      totalCreditsEarned: props.degreeSummary?.totalCreditsEarned,
      // Snap point validation
      expectedSnapIndex: 2,
      expectedSnapPoint: snapPoints[2],
      isAtCorrectSnap: activeSnapPoint === snapPoints[2],
      snapMismatch: activeSnapPoint !== snapPoints[2] ? {
        current: activeSnapPoint,
        expected: snapPoints[2]
      } : null
    } : undefined,
    // Module-specific debug
    moduleProps: scope === 'module' ? {
      moduleId: props.moduleId,
      moduleLabel: props.moduleLabel,
      creditsEarned: props.creditsEarned,
      creditsRequired: props.creditsRequired,
      optionsCount: props.options?.length || 0,
      allModulesCount: props.allModules?.length || 0
    } : undefined
  });

  if (!scope) return null;

  // ✅ Validate scope-nodeId consistency with grace period for hydration
  const scopeRequiresNodeId = scope === 'year' || scope === 'module';
  const hasNodeId = !!props.nodeId;

  // Allow rendering during hydration (when year/yearModules are being loaded)
  const isHydrating = scope === 'year' && hasNodeId && (!props.year || !props.yearModules);

  if (scopeRequiresNodeId && !hasNodeId) {
    console.error('[DecisionDockRouter] ❌ VALIDATION FAILED: scope requires nodeId but none provided', {
      scope, 
      nodeId: props.nodeId,
      propsReceived: Object.keys(props).filter(k => props[k as keyof typeof props] !== undefined)
    });
    // Auto-close invalid panel
    onClose();
    return null;
  }

  if (isHydrating) {
    console.warn('[DecisionDockRouter] ⏳ Hydrating year data, rendering loading state...', {
      scope,
      nodeId: props.nodeId,
      hasYear: !!props.year,
      hasYearModules: !!props.yearModules
    });
    // Render loading state instead of empty content (handled in YearMarketplaceContent)
  }

  if (!scopeRequiresNodeId && hasNodeId) {
    console.warn('[DecisionDockRouter] ⚠️ degree scope should not have nodeId; ignoring', {
      scope, nodeId: props.nodeId
    });
    // Continue rendering but log the issue (degree scope can ignore nodeId)
  }

  return (
    <DrawerPrimitive.Root
      open={!!scope}
      onOpenChange={(open) => { 
        console.log('[DecisionDockRouter] onOpenChange:', { open, scope });
        if (!open) onClose(); 
      }}
      modal={false}
      direction="bottom"
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint || snapPoints[1]}
      setActiveSnapPoint={(point) => {
        if (!point) return;
        
        // Phase 1: CRITICAL FIX - Validate snap point before accepting it
        const pointStr = String(point);
        if (!snapPoints.includes(pointStr)) {
          console.warn('[DecisionDock] 🚫 Rejecting invalid snap point from Vaul:', {
            rejected: pointStr,
            validPoints: snapPoints,
            fallbackTo: snapPoints[1]
          });
          // Use middle snap as safe fallback
          setActiveSnapPoint(snapPoints[1]);
          return; // Don't save invalid point
        }
        
        setActiveSnapPoint(point);
        
        // Ensure drawer stays visible after resize
        setTimeout(() => {
          const viewportHeight = window.innerHeight;
          const drawerHeight = typeof point === 'string' 
            ? parseInt(point) 
            : Math.round(viewportHeight * 0.5);
          
          const currentScroll = window.scrollY;
          const maxVisibleScroll = document.documentElement.scrollHeight - viewportHeight - drawerHeight;
          
          // If drawer would be below viewport, scroll it into view
          if (currentScroll > maxVisibleScroll && maxVisibleScroll >= 0) {
            window.scrollTo({
              top: maxVisibleScroll,
              behavior: 'smooth'
            });
          }
        }, 100);
        
        // Persist to localStorage (convert to string for type safety)
        if (typeof window !== 'undefined') {
          localStorage.setItem('v5_dock_snap', String(point));
        }
        
        // Track telemetry
        trackTelemetryEvent({
          task: 'dock_resized',
          route: '/edu-tree-v5',
          complexity: {
            schema_version: 1,
            snap_point: String(point),
            snap_point_px: String(point),
            scope
          }
        });
      }}
      dismissible={false}
    >
      <DrawerPrimitive.Portal>
        {/* Single click-through overlay - overrides vaul's default */}
        <DrawerPrimitive.Overlay
          data-testid="decision-dock-overlay"
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm pointer-events-none"
        />
        
        <DrawerPrimitive.Content 
          data-testid="decision-dock-content"
          className={cn(
            "z-[110] fixed inset-x-0 bottom-0 mt-24 flex flex-col",
            "min-h-[148px] h-[var(--vaul-drawer-height,50vh)]",
            "pointer-events-auto border-t shadow-2xl",
            "rounded-t-[10px] bg-background"
          )}
          style={{ 
            backdropFilter: 'blur(2px)',
            backgroundColor: 'hsl(var(--background) / 0.95)',
            maxHeight: (activeSnapPoint && snapPoints.includes(String(activeSnapPoint)))
              ? activeSnapPoint 
              : snapPoints[1],
            height: (activeSnapPoint && snapPoints.includes(String(activeSnapPoint)))
              ? activeSnapPoint 
              : snapPoints[1],
            display: 'flex',
            flexDirection: 'column',
            visibility: 'visible',
            // Ensure drawer stays at bottom of viewport, not document
            position: 'fixed',
            bottom: 0
          }}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            previousFocusRef.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            previousFocusRef.current?.focus();
          }}
        >
          {/* Functional drag handle - Vaul primitive enables snap point dragging */}
          <DrawerPrimitive.Handle 
            data-testid="decision-dock-resize-handle"
            className="mx-auto mt-4 h-1.5 w-[120px] rounded-full bg-muted hover:bg-muted-foreground/60 active:bg-primary transition-colors cursor-ns-resize select-none touch-none"
            aria-label="Drag to resize drawer"
          />

          {/* Scroll hint - auto-dismisses after 3s */}
          {scope && (
            <div 
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium shadow-lg pointer-events-none"
              style={{ 
                animation: 'fadeInOut 3s ease-out forwards' 
              }}
            >
              💡 Scroll to see content behind drawer
            </div>
          )}

          {/* Header/title for ARIA */}
          <div className="flex items-center justify-between px-4 pb-2 border-b relative">
            <h2 id={titleId} className="text-sm font-medium text-muted-foreground">
              {scope === 'degree' && 'Degree Analyzer'}
              {scope === 'year' && `Year ${props.year} Marketplace`}
              {scope === 'module' && `${props.moduleLabel ?? 'Module'} Options`}
            </h2>
            
            {/* Snap point indicator badges */}
            <div className="absolute top-1/2 -translate-y-1/2 right-12 flex gap-1 z-10 pointer-events-none">
              {snapPoints.map((point, i) => {
                const isActive = activeSnapPoint === point;
                const labels = ['Small', 'Medium', 'Large'];
                const sizes = ['S', 'M', 'L'];
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-200",
                      isActive 
                        ? "bg-primary scale-125 shadow-md" 
                        : "bg-muted-foreground/30 scale-100"
                    )}
                    title={`${labels[i]} (${sizes[i]}) - ${point}px`}
                    aria-label={isActive ? `Current size: ${labels[i]}` : labels[i]}
                  />
                );
              })}
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
              title="Close (Esc)"
              aria-label="Close decision dock"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className={cn(
            "flex-1 min-h-0 w-full overflow-y-auto px-4 pb-4",
            "dd-decision-scroll"  // Apply to all scopes for proper flex layout
          )}>
            {/* DEBUG: Log conditional rendering */}
            {(() => {
              console.log('[DecisionDockRouter] Content render decision:', {
                scope,
                willRenderDegree: scope === 'degree',
                willRenderYear: scope === 'year',
                willRenderModule: scope === 'module',
                props: {
                  year: props.year,
                  yearModulesCount: props.yearModules?.length ?? 0,
                  nodeId: props.nodeId
                }
              });
              return null;
            })()}
            {(() => {
              try {
                if (scope === 'degree') return <DegreeAnalyzerContent {...props} activeTab={activeTabInternal} onTabChange={handleTabChange} />;
                if (scope === 'year') return <YearMarketplaceContent {...props} />;
                if (scope === 'module') return <MarketplaceContent {...props} activeTab={activeTabInternal} onTabChange={handleTabChange} />;
                return null;
              } catch (error) {
                console.error('[DecisionDockRouter] Content render error:', error);
                return (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-destructive font-medium">Error loading {scope} panel</p>
                    <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
                    <button onClick={onClose} className="underline hover:no-underline">Close and try again</button>
                  </div>
                );
              }
            })()}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

// Extract Degree Analyzer content (without Sheet wrapper)
function DegreeAnalyzerContent(props: DecisionDockRouterProps) {
  const { degreeSummary, activeTab = 'overview', onTabChange, onNavigate } = props;
  
  // ✅ Phase 5: Enhanced logging to track data flow
  console.log('[DegreeAnalyzerContent] Render check:', {
    hasDegreeSummary: !!degreeSummary,
    degreeSummary: degreeSummary ? {
      degreeTitle: degreeSummary.degreeTitle,
      totalCreditsRequired: degreeSummary.totalCreditsRequired,
      totalCreditsEarned: degreeSummary.totalCreditsEarned
    } : null,
    activeTab,
    // Track prop availability
    propsKeys: Object.keys(props),
    degreeSummaryInProps: 'degreeSummary' in props,
    isDegreeSummaryNull: degreeSummary === null,
    isDegreeSummaryUndefined: degreeSummary === undefined
  });
  
  if (!degreeSummary) {
    console.error('[DegreeAnalyzerContent] ❌ No degreeSummary provided!');
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading degree data...</p>
        </div>
      </div>
    );
  }
  
  const progressPercent = (degreeSummary.totalCreditsEarned / degreeSummary.totalCreditsRequired) * 100;

  return (
    <>
      <div className="pb-4">
        <ScopeBreadcrumbs
          scope="degree"
          degreeTitle={degreeSummary.degreeTitle}
          onNavigate={onNavigate}
        />
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="optimize">Optimize</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-accent/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{degreeSummary.degreeTitle}</h3>
                <p className="text-sm text-muted-foreground">Bachelor's Degree</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{Math.round(progressPercent)}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
            
            <Progress value={progressPercent} className="h-3 mb-2" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {degreeSummary.totalCreditsEarned} / {degreeSummary.totalCreditsRequired} credits
              </span>
              <span className="text-muted-foreground">
                {degreeSummary.totalCreditsRequired - degreeSummary.totalCreditsEarned} remaining
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
              <div className="text-2xl font-bold">${degreeSummary.estimatedCost.toLocaleString()}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Duration</div>
              <div className="text-2xl font-bold">{Math.round(degreeSummary.estimatedMonths / 12)}y</div>
              <div className="text-xs text-muted-foreground">{degreeSummary.estimatedMonths} months</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Credits Planned</div>
              <div className="text-2xl font-bold">{degreeSummary.totalCreditsPlanned}</div>
            </div>
          </div>

          {degreeSummary.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">⚠️ Warnings</h4>
              {degreeSummary.warnings.map((warning, i) => (
                <div key={i} className="text-sm p-3 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  {warning}
                </div>
              ))}
            </div>
          )}

          <div className="bg-accent/20 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-3">🎯 What's Blocking Completion?</h4>
            <div className="space-y-2 text-sm">
              {degreeSummary.totalCreditsEarned < degreeSummary.totalCreditsRequired ? (
                <p className="text-muted-foreground">
                  Complete {degreeSummary.totalCreditsRequired - degreeSummary.totalCreditsEarned} more credits to finish your degree.
                </p>
              ) : (
                <p className="text-green-600 dark:text-green-400">
                  ✓ All degree requirements met!
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              📊 Export Plan (PDF)
            </Button>
            <Button variant="outline" className="flex-1">
              📤 Share with Advisor
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            View all requirements grouped by category (Gen Ed, Core, Major, Electives).
          </p>
          <div className="bg-accent/20 rounded-lg p-8 text-center">
            <div className="text-muted-foreground text-sm">
              Requirements breakdown coming soon...
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Visualize credit transfer flow from providers to target institution.
          </p>
          <div className="bg-accent/20 rounded-lg p-8 text-center">
            <div className="text-muted-foreground text-sm">
              Transfer flow diagram coming soon...
            </div>
          </div>
        </TabsContent>

        <TabsContent value="optimize" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Auto-fill entire degree with optimized course selections.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto flex-col items-start p-4">
              <div className="text-sm font-medium mb-1">⚡ Fastest Path</div>
              <div className="text-xs text-muted-foreground">Minimize duration</div>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4">
              <div className="text-sm font-medium mb-1">💰 Cheapest Path</div>
              <div className="text-xs text-muted-foreground">Minimize cost</div>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4">
              <div className="text-sm font-medium mb-1">🎓 Transfer-Safe</div>
              <div className="text-xs text-muted-foreground">Guaranteed acceptance</div>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4">
              <div className="text-sm font-medium mb-1">⚖️ Balanced</div>
              <div className="text-xs text-muted-foreground">Best overall</div>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

// Extract Year Marketplace content
function YearMarketplaceContent(props: DecisionDockRouterProps) {
  const { year, yearModules = [], degreeSummary, onNavigate, onOpenModulePanel, onClose, nodeData } = props;
  
  // Show loading state if year data is still hydrating
  if (!year || !yearModules || yearModules.length === 0) {
    console.warn('[YearMarketplaceContent] Missing data, showing loading state:', {
      hasYear: !!year,
      yearModulesCount: yearModules?.length || 0
    });
    
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading year {year || '?'} data...</p>
        </div>
      </div>
    );
  }
  
  const basketItems = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  const addItem = usePlanBasket(s => s.addItem);
  
  // Respect UI hints from navigation (e.g., focusTab from semester auto-fill buttons)
  const focusTab = nodeData?.ui?.focusTab || 'templates';
  const focusTerm = nodeData?.ui?.focusTerm; // 'fall' | 'spring'
  const [activeTab, setActiveTab] = useState(focusTab);
  
  // Update tab if focusTab hint changes
  useEffect(() => {
    if (nodeData?.ui?.focusTab) {
      console.log('[YearMarketplaceContent] Tab set from UI hint:', { 
        focusTab: nodeData.ui.focusTab, 
        focusTerm: nodeData.ui.focusTerm,
        source: 'navigation_hint' 
      });
      setActiveTab(nodeData.ui.focusTab);
    }
  }, [nodeData?.ui?.focusTab]);

  // Fetch full database data for enrichment
  const programId = 'bs_cs';
  const { data: dbData } = useV5DatabaseData({ programId, enabled: true });
  const { data: requirementBlocks = [] } = useRequirementBlocks(programId, true);
  const { applyYearTemplate } = useApplyYearTemplate();

  // Extract all options from modules
  const allOptions = useMemo(() => {
    return Object.values(dbData?.modulesByYear || {})
      .flat()
      .flatMap((m: any) => m.marketplaceOptions || []);
  }, [dbData]);

  // Ensure modules have marketplaceOptions
  const enrichedModules = useMemo(() => {
    if (!yearModules?.length) return [];
    if (yearModules.some(m => (m.marketplaceOptions?.length ?? 0) > 0)) return yearModules;
    
    const byBlock = new Map<string, any[]>();
    (allOptions || []).forEach((o: any) => {
      if (!o.requirement_block_id) return;
      const arr = byBlock.get(o.requirement_block_id) || [];
      arr.push(o);
      byBlock.set(o.requirement_block_id, arr);
    });
    
    return yearModules.map(m => ({
      ...m,
      marketplaceOptions: m.marketplaceOptions?.length
        ? m.marketplaceOptions
        : (byBlock.get(m.requirement_block_id) || [])
    }));
  }, [yearModules, allOptions]);

  // Extract anchor policy
  const anchorPolicy = useMemo(() => 
    getAnchorPolicyFromConstraints(constraints),
    [constraints]
  );

  // DEBUG: Log data check
  console.log('[YearMarketplaceContent] Data check:', {
    year,
    modulesCount: enrichedModules.length,
    allOptionsCount: allOptions.length,
    blocksCount: requirementBlocks.length,
    hasAnchorPolicy: !!anchorPolicy,
    moduleSample: enrichedModules[0]
  });

  const yearStats = useMemo(() => {
    const totalCreditsRequired = yearModules.reduce((sum, m) => sum + m.creditsRequired, 0);
    const totalCreditsEarned = yearModules.reduce((sum, m) => sum + (m.creditsEarned || 0), 0);
    const unmetModules = yearModules.filter(m => (m.creditsEarned || 0) < m.creditsRequired);
    
    return {
      totalCreditsRequired,
      totalCreditsEarned,
      unmetModules,
      progressPercent: totalCreditsRequired > 0 
        ? Math.round((totalCreditsEarned / totalCreditsRequired) * 100)
        : 0
    };
  }, [yearModules]);

  // Legacy auto-fill handler (kept for fallback)
  const handleAutoFillYear = () => {
    if (!FEATURE_FLAGS.v5_year_scope_v1) {
      toast.info('Year Scope V1 feature is not enabled', {
        description: 'Set localStorage.v5_year_scope_v1=true to enable',
      });
      return;
    }

    console.log('[Week 1] Auto-Fill Year clicked (Apply Mode)', { year });

    // Use first preset (Balanced 15/15) for testing
    const preset = YEAR_PRESETS[0];
    const allOptions = yearModules.flatMap(m => m.marketplaceOptions || []);
    
    // Week 1.5: Extract anchor policy from constraints
    const anchorPolicy = getAnchorPolicyFromConstraints(constraints);
    if (anchorPolicy) {
      console.log('[Week 1.5] Anchor policy extracted:', anchorPolicy);
    }

    try {
      const plan = buildYearPlan(
        preset,
        year,
        yearModules,
        requirementBlocks, // ✅ Real blocks from database
        allOptions,
        basketItems,
        constraints,
        anchorPolicy
      );

      console.log('[Week 1] Year plan generated:', plan);

      // Apply to basket with semester metadata (Week 1.5)
      const fallItems = plan.fall.map(i => ({ 
        ...i, 
        semester: 'fall' as const,
        source: { 
          type: 'template' as const, 
          templateLabel: preset.label,
          templateId: preset.id,
        },
      }));
      const springItems = plan.spring.map(i => ({ 
        ...i, 
        semester: 'spring' as const,
        source: { 
          type: 'template' as const, 
          templateLabel: preset.label,
          templateId: preset.id,
        },
      }));
      
      const allItems = [...fallItems, ...springItems];
      if (allItems.length > 0) {
        allItems.forEach(item => addItem(item));
        
        toast.success(`Applied ${preset.label} to Year ${year}`, {
          description: `Added ${allItems.length} courses • ${plan.metadata.totalCredits}cr • $${plan.metadata.totalCost}`,
          duration: 5000,
        });
        
        void trackTelemetryEvent({
          task: 'year_preset_applied',
          scope: 'year',
          complexity: {
            year,
            presetId: preset.id,
            creditsAdded: plan.metadata.totalCredits,
            aceUsed: plan.metadata.aceCreditsUsed,
            residencyEarned: plan.metadata.residencyCreditsEarned,
          },
        });
      } else {
        toast.info('No courses to add', {
          description: 'Year plan is empty. Check requirement blocks or marketplace options.',
        });
      }
    } catch (error) {
      console.error('[Week 1] Year planner error:', error);
      toast.error('Year planner failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <>
      <div className="pb-4">
        <ScopeBreadcrumbs
          scope="year"
          year={year}
          degreeTitle={degreeSummary?.degreeTitle}
          onNavigate={onNavigate}
        />
      </div>

      <div className="bg-accent/30 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
          <div>
            <div className="text-xs text-muted-foreground">Credits</div>
            <div className="font-semibold text-lg">
              {yearStats.totalCreditsEarned}/{yearStats.totalCreditsRequired}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Progress</div>
            <div className="font-semibold text-lg">{yearStats.progressPercent}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-semibold text-lg">{yearStats.unmetModules.length}</div>
            <div className="text-xs text-muted-foreground">modules</div>
          </div>
        </div>
      </div>

      {/* Tabs for Templates and Unmet Modules */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="unmet">Unmet Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <YearTemplatesPanel
            year={year!}
            modules={enrichedModules}
            allOptions={allOptions}
            anchorPolicy={anchorPolicy}
            programId={programId}
            focusTerm={focusTerm}
            onApplyTemplate={(template) => {
              applyYearTemplate(template);
            }}
          />
        </TabsContent>

        <TabsContent value="unmet" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Unmet Requirements</h3>
            <Badge variant="secondary">{yearStats.unmetModules.length} modules</Badge>
          </div>

          {yearStats.unmetModules.length === 0 ? (
            <div className="bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg p-6 text-center">
              <div className="text-2xl mb-2">✓</div>
              <div className="font-medium">All requirements met for Year {year}!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {yearStats.unmetModules.map(module => (
                <div
                  key={module.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">{module.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {module.description}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {module.creditsRequired} cr
                    </Badge>
                  </div>

                  {module.marketplaceOptions && module.marketplaceOptions.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {module.marketplaceOptions.slice(0, 3).map((option, idx) => (
                        <div
                          key={option.id}
                          className="text-xs text-muted-foreground flex items-center justify-between"
                        >
                          <span className="truncate">{option.provider}: {option.title}</span>
                          <span className="ml-2 text-nowrap">
                            {option.cost_usd !== null ? `$${option.cost_usd}` : 'Free'}
                          </span>
                        </div>
                      ))}
                      {module.marketplaceOptions.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{module.marketplaceOptions.length - 3} more options
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (onOpenModulePanel) {
                        onOpenModulePanel(module);
                        onClose();
                      }
                    }}
                  >
                    View All Options ({module.optionsCount || 0})
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

// Extract Marketplace content (reuse existing logic from MarketplacePanel)
function MarketplaceContent(props: DecisionDockRouterProps) {
  const {
    moduleId = '',
    moduleLabel = '',
    creditsEarned = 0,
    creditsRequired = 0,
    options = [],
    sortBy = 'best-match',
    setSortBy,
    yearEarned = 0,
    yearCap = 30,
    allModules = [],
    activeTab,
    onTabChange
  } = props;

  // PART 1: Self-sufficient data fetching (defensive pattern like YearMarketplaceContent)
  const programId = 'bs_cs';
  const basket = usePlanBasket(s => s.items);
  const { data: dbData } = useV5DatabaseData({ 
    programId, 
    enabled: !!moduleId && (!options || options.length === 0) 
  });
  
  // Find module from database if props are incomplete
  const moduleFromDb = useMemo(() => {
    if (!dbData?.modulesByYear || !moduleId) return null;
    return Object.values(dbData.modulesByYear)
      .flat()
      .find((m: any) => m.id === moduleId);
  }, [dbData, moduleId]);
  
  // Calculate live credits from basket (real-time sync)
  const liveCreditsEarned = useMemo(() => {
    return basket
      .filter(item => item.moduleId === moduleId)
      .reduce((sum, item) => sum + item.credits, 0);
  }, [basket, moduleId]);
  
  // Use effective values with fallback chain
  const effectiveModuleLabel = moduleLabel || moduleFromDb?.label || 'Module';
  const effectiveCreditsEarned = liveCreditsEarned || creditsEarned || 0;
  const effectiveCreditsRequired = creditsRequired || moduleFromDb?.creditsRequired || 0;
  const effectiveOptions = (options?.length > 0) 
    ? options 
    : (moduleFromDb?.marketplaceOptions || []);

  const toggleCourse = usePlanStore(s => s.toggleCourse);
  const selected = usePlanStore(s => s.selections[moduleId]?.selected || []);
  const liveEarned = usePlanStore(s => s.selections[moduleId]?.selectedCredits ?? 0);
  
  const { weights, setWeights, resetWeights } = useScoringPrefs();
  const [showWeights, setShowWeights] = useState(false);
  
  const totals = usePlanBasket(s => s.getTotals());
  const constraints = usePlanBasket(s => s.constraints);
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);
  const { addItemWithToast, removeItemWithToast } = usePlanBasketWithToasts();

  const enriched = useMemo(() => {
    return effectiveOptions.map(o => {
      const breakdown = calculateOptionScore(o, effectiveOptions, weights);
      return { ...o, score: breakdown.total, scoreBreakdown: breakdown };
    });
  }, [effectiveOptions, weights]);

  const sortedOptions = useMemo(() => {
    const opts = [...enriched];
    
    if (sortBy === 'best-match') {
      return opts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    if (sortBy === 'cheapest') {
      return opts.sort((a, b) => {
        if (a.cost_usd === null) return 1;
        if (b.cost_usd === null) return -1;
        return a.cost_usd - b.cost_usd;
      });
    }
    if (sortBy === 'shortest') {
      return opts.sort((a, b) => {
        if (a.duration_weeks === null) return 1;
        if (b.duration_weeks === null) return -1;
        return a.duration_weeks - b.duration_weeks;
      });
    }
    return opts.sort((a, b) => (b.credits ?? 0) - (a.credits ?? 0));
  }, [enriched, sortBy]);
  
  const violations = useMemo(() => 
    validatePlan(basket, sortedOptions, constraints),
    [basket, sortedOptions, constraints]
  );

  const isAtMax = effectiveCreditsEarned >= effectiveCreditsRequired;
  
  // Module data for templates - with fallback to moduleFromDb
  const moduleData = useMemo(() => {
    // Try allModules first (has complete data including marketplaceOptions)
    if (allModules && allModules.length > 0) {
      const found = allModules.find(m => m.id === moduleId) as ModuleData | undefined;
      if (found) {
        console.log('[DecisionDockRouter] Using allModules data:', {
          moduleId,
          hasMarketplaceOptions: !!found.marketplaceOptions,
          optionsCount: found.marketplaceOptions?.length ?? 0
        });
        return found;
      }
    }
    
    // Fallback: construct from moduleFromDb - PRESERVE marketplaceOptions
    if (moduleFromDb) {
      const fallbackData = {
        id: moduleFromDb.id,
        label: moduleFromDb.label,
        creditsEarned: liveCreditsEarned,
        creditsRequired: moduleFromDb.creditsRequired,
        marketplaceOptions: moduleFromDb.marketplaceOptions || [], // ✅ Preserve options
        courses: [],
        requirement_block_id: moduleFromDb.requirement_block_id,
        description: moduleFromDb.description,
        icon: moduleFromDb.icon
      } as ModuleData;
      
      console.log('[DecisionDockRouter] Using moduleFromDb fallback:', {
        moduleId,
        hasMarketplaceOptions: !!fallbackData.marketplaceOptions,
        optionsCount: fallbackData.marketplaceOptions?.length ?? 0
      });
      
      return fallbackData;
    }
    
    // Last resort: Check if props.nodeData has original module
    if (props.nodeData?.module) {
      console.log('[DecisionDockRouter] Using props.nodeData.module:', {
        moduleId: props.nodeData.module.id,
        hasMarketplaceOptions: !!props.nodeData.module.marketplaceOptions,
        optionsCount: props.nodeData.module.marketplaceOptions?.length ?? 0
      });
      return props.nodeData.module;
    }
    
    console.warn('[DecisionDockRouter] No module data available for:', moduleId);
    return undefined;
  }, [allModules, moduleId, moduleFromDb, liveCreditsEarned, props.nodeData]);
  
  // Debug logging - after all variables are defined
  console.log('[MarketplaceContent] Render state:', {
    moduleId,
    label: effectiveModuleLabel,
    earnedFromBasket: liveCreditsEarned,
    earnedFromProps: creditsEarned,
    usingDbFallback: !moduleLabel || options.length === 0,
    optionsCount: effectiveOptions.length,
    sortedOptionsCount: sortedOptions.length,
    hasModuleData: !!moduleData,
    hasAllModules: allModules && allModules.length > 0,
    willRenderTabs: FEATURE_FLAGS.v5_templates_module && !!moduleData && !!moduleData.id && allModules && allModules.length > 0,
    basketCount: basket.length
  });
  
  // Handler for adding template (Phase 1: dupe prevention)
  const handleAddTemplate = (template: ModuleTemplate) => {
    const inBasket = new Set(basket.map(b => b.courseId.toUpperCase()));
    const templateCourses = getTemplateCourses(template);
    const toAdd = templateCourses.filter(course => !inBasket.has(course.courseId.toUpperCase()));
    
    if (toAdd.length === 0) {
      toast.message('All courses already in plan', {
        description: 'This template is fully covered by your current plan.'
      });
      return;
    }
    
    // Add non-duplicate courses
    toAdd.forEach(course => {
      addItem({
        moduleId: moduleId,
        courseId: course.courseId,
        title: course.title || course.courseId,
        credits: course.credits,
        cost_usd: course.cost_usd,
        duration_weeks: course.duration_weeks,
        workload_weekly_hours: course.workload_weekly_hours ?? course.credits * 2.5,
        cri_score: course.cri_score ?? 0,
        status: 'pinned',
        providerType: course.providerType
      });
    });
    
    // Single toast for bulk add with undo
    const addedSnapshot = [...toAdd];
    toast.success('Added to plan', {
      description: `${toAdd.length} course${toAdd.length !== 1 ? 's' : ''} from ${template.label}`,
      action: {
        label: 'Undo All',
        onClick: () => {
          try {
            const currentRemoveItem = usePlanBasket.getState().removeItem;
            addedSnapshot.forEach(c => currentRemoveItem(c.courseId));
            toast.message('Changes undone');
          } catch (error) {
            console.error('[Toast Undo] Failed:', error);
            toast.error('Failed to undo changes');
          }
        }
      },
      duration: 5000
    });
    
    // Telemetry (Phase 1c)
    try {
      void trackTelemetryEvent({
        task: 'template_added',
        scope: 'module',
        complexity: {
          schema_version: 1,
          template_id: template.id,
          courses_added: toAdd.length,
          duplicates_filtered: templateCourses.length - toAdd.length
        }
      });
    } catch (telemetryError) {
      console.warn('[Telemetry] Failed to track template add:', telemetryError);
    }
  };

  // Helper functions
  const formatRelativeDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const days = Math.floor((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) return 'Past';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const isWithin30Days = (isoDate: string) => {
    const days = Math.floor((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days >= 0 && days <= 30;
  };

  // Persist last tab per module (SSR-safe)
  const [activeTabState, setActiveTabState] = useState(activeTab || 'templates');

  // Load from localStorage on mount (client-side only, with error handling)
  useEffect(() => {
    if (typeof window !== 'undefined' && moduleId) {
      const storageKey = `edutree-last-tab-${moduleId}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) setActiveTabState(stored);
      } catch (e) {
        console.debug('[Persist] localStorage read failed:', e);
      }
    }
  }, [moduleId]);

  const handleTabChange = (tab: string) => {
    setActiveTabState(tab);
    
    // Persist to localStorage (client-side only, with error handling)
    if (typeof window !== 'undefined' && moduleId) {
      const storageKey = `edutree-last-tab-${moduleId}`;
      try {
        localStorage.setItem(storageKey, tab);
      } catch (e) {
        console.debug('[Persist] localStorage write failed:', e);
      }
    }
    
    void trackTelemetryEvent({
      task: 'tab_changed',
      scope: 'module',
      complexity: { from: activeTabState, to: tab, moduleId }
    });
    
    // Call parent onTabChange if provided
    if (onTabChange) onTabChange(tab);
  };

  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="pb-4">
        <ScopeBreadcrumbs
          scope="module"
          nodeLabel={effectiveModuleLabel}
          year={props.year}
          degreeTitle={props.degreeSummary?.degreeTitle}
          onNavigate={props.onNavigate}
        />
      </div>

      {/* Module Header */}
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{effectiveModuleLabel}</span>
            <span className="text-xs text-muted-foreground">
              {sortedOptions.length} option{sortedOptions.length !== 1 ? 's' : ''} • {
                sortedOptions.filter(o => o.cost_usd === 0).length
              } free
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {effectiveCreditsEarned}/{effectiveCreditsRequired} cr
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Year progress: {yearEarned}/{yearCap} cr
        </div>
      </div>

      {FEATURE_FLAGS.v5_templates_module && moduleData && moduleData.id && allModules && allModules.length > 0 ? (
        <Tabs value={activeTabState} onValueChange={handleTabChange} className="w-full mb-4">
          <TabsList className="w-full grid grid-cols-2" role="tablist">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="mt-4">
            <ErrorBoundary
              fallback={
                <div className="text-center py-8 border border-destructive/50 rounded-lg bg-destructive/5">
                  <p className="text-sm font-medium text-destructive mb-2">Templates temporarily unavailable</p>
                  <p className="text-xs text-muted-foreground mb-3">Try the Individual Courses tab instead</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const coursesTab = document.querySelector('[value="courses"]') as HTMLElement;
                      coursesTab?.click();
                    }}
                  >
                    Switch to Courses
                  </Button>
                </div>
              }
            >
              <ModuleTemplatesPanel
                module={moduleData}
                allModules={allModules}
                onAddTemplate={handleAddTemplate}
              />
            </ErrorBoundary>
          </TabsContent>
          
          <TabsContent value="courses" className="mt-4">
            <CoursesList 
              sortedOptions={sortedOptions}
              selected={selected}
              basket={basket}
              moduleId={moduleId}
              creditsRequired={effectiveCreditsRequired}
              yearEarned={yearEarned}
              yearCap={yearCap}
              isAtMax={isAtMax}
              toggleCourse={toggleCourse}
              formatRelativeDate={formatRelativeDate}
              isWithin30Days={isWithin30Days}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <CoursesList 
          sortedOptions={sortedOptions}
          selected={selected}
          basket={basket}
          moduleId={moduleId}
          creditsRequired={effectiveCreditsRequired}
          yearEarned={yearEarned}
          yearCap={yearCap}
          isAtMax={isAtMax}
          toggleCourse={toggleCourse}
          formatRelativeDate={formatRelativeDate}
          isWithin30Days={isWithin30Days}
        />
      )}
      
      <ConstraintsPanel />
      
      {basket.length > 0 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur p-4 border rounded-lg mb-4">
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
              <div className="font-semibold text-lg">
                ${(totals.totalCost ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="font-semibold text-lg">
                {totals.totalWeeks ?? 0}wks
              </div>
              <div className="text-xs text-muted-foreground">
                (max ×{constraints.max_concurrent_courses ?? 2})
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Weekly Load</div>
              <div className="font-semibold text-lg">
                {totals.totalWorkloadHours ?? 0}hrs/wk
              </div>
            </div>
          </div>
          
          {violations.length > 0 && (
            <div className="space-y-1 mb-3">
              {violations.map((v, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded-md ${
                  v.severity === 'error' ? 'bg-destructive/10 text-destructive' :
                  v.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-blue-500/10 text-blue-600'
                }`}>
                  {v.severity === 'error' ? '🚫' : v.severity === 'warning' ? '⚠️' : 'ℹ️'} {v.message}
                </div>
              ))}
            </div>
          )}
          
          {FEATURE_FLAGS.v5_autofill_enabled && (
            <AutoFillPlanButton
              modules={allModules as ModuleData[]}
              constraints={constraints}
              weights={mapWeightsForEngine(weights)}
              disabled={violations.some(v => v.severity === 'error')}
            />
          )}
          
          <ScenarioManager />
        </div>
      )}

      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <select
            value={sortBy}
            onChange={e => setSortBy?.(e.target.value as any)}
            className="text-xs px-2 py-1 rounded border border-border bg-background"
          >
            <option value="best-match">🎯 Best Match</option>
            <option value="cheapest">💰 Cheapest</option>
            <option value="shortest">⚡ Shortest</option>
            <option value="credits">📊 Most Credits</option>
          </select>
          
          <button
            className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 transition-colors ml-auto"
            onClick={() => setShowWeights(v => !v)}
          >
            ⚙️ Priorities
          </button>
        </div>

        {showWeights && (
          <div className="p-3 bg-accent/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium">Adjust what matters to you:</div>
              <button
                onClick={resetWeights}
                className="text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Reset to default
              </button>
            </div>
            <div className="space-y-2">
              {(['cost', 'time', 'quality'] as const).map(key => (
                <label key={key} className="flex items-center gap-2">
                  <span className="text-xs w-20 capitalize">
                    {key === 'cost' && '💰'} {key === 'time' && '⚡'} {key === 'quality' && '⭐'} {key}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(weights[key] * 100)}
                    onChange={(e) => setWeights({ [key]: (+e.target.value) / 100 })}
                    className="flex-1"
                  />
                  <span className="text-xs w-10 text-right font-medium">{Math.round(weights[key] * 100)}%</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {!FEATURE_FLAGS.v5_templates_module && (
        <div className="space-y-2">
          {sortedOptions.map(option => {
          const isSelected = selected.includes(option.courseId);
          const isInBasket = basket.some(b => b.courseId === option.courseId);
          const optionCredits = Number(option.credits) || 0;
          const wouldExceedYearCap = !isSelected && yearEarned + optionCredits > yearCap;
          const disabled = (isAtMax && !isSelected) || wouldExceedYearCap;

          return (
            <div
              key={option.id}
              className="border rounded-lg p-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">
                  {option.courseId}: {option.title}
                </div>
                
                {(() => {
                  const basketItem = basket.find(b => b.courseId === option.courseId);
                  return basketItem?.status === 'auto-filled' && basketItem.autoFillReason && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      ✨ {basketItem.autoFillReason}
                    </div>
                  );
                })()}
                
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>{option.credits} cr</span>
                  
                  {(option.unlocks_count ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      🔓 Unlocks {option.unlocks_count}
                    </Badge>
                  )}
                  
                  {option.start_windows?.[0] && (
                    <Badge variant={isWithin30Days(option.start_windows[0]) ? 'default' : 'outline'} className="text-xs">
                      🗓️ Starts {formatRelativeDate(option.start_windows[0])}
                    </Badge>
                  )}
                  
                  {option.workload_weekly_hours && (
                    <Badge variant={option.workload_weekly_hours > 15 ? 'destructive' : 'outline'} className="text-xs">
                      📊 {option.workload_weekly_hours}hrs/wk
                    </Badge>
                  )}
                  
                  {option.providerType && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      option.providerType === 'university' ? 'bg-blue-100 text-blue-700' :
                      option.providerType === 'mooc' ? 'bg-purple-100 text-purple-700' :
                      option.providerType === 'bootcamp' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {option.providerType === 'university' && '🎓'}
                      {option.providerType === 'mooc' && '🌐'}
                      {option.providerType === 'bootcamp' && '⚡'}
                      {option.providerType === 'testing_center' && '📝'}
                      {' '}{option.provider}
                    </span>
                  )}
                  
                  <TransferBadge
                    courseCode={option.courseId}
                    providerCode={option.providerCode || ''}
                    providerType={option.providerType}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <div className="text-right min-w-[80px]">
                  <div className="text-sm font-semibold">
                    {option.cost_usd !== null ? `$${option.cost_usd}` : 'Free'}
                  </div>
                  {option.duration_weeks && (
                    <div className="text-xs text-muted-foreground">
                      {option.duration_weeks}wks
                    </div>
                  )}
                </div>

                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => toggleCourse(moduleId, option.courseId, optionCredits, creditsRequired)}
                  className="h-5 w-5"
                />
              </div>
            </div>
          );
        })}
        </div>
      )}
    </>
  );
}

// Extracted courses list component for reuse
interface CoursesListProps {
  sortedOptions: MarketplaceOption[];
  selected: string[];
  basket: BasketItem[];
  moduleId: string;
  creditsRequired: number;
  yearEarned: number;
  yearCap: number;
  isAtMax: boolean;
  toggleCourse: (moduleId: string, courseId: string, credits: number, required: number) => void;
  formatRelativeDate: (isoDate: string) => string;
  isWithin30Days: (isoDate: string) => boolean;
}

function CoursesList({
  sortedOptions,
  selected,
  basket,
  moduleId,
  creditsRequired,
  yearEarned,
  yearCap,
  isAtMax,
  toggleCourse,
  formatRelativeDate,
  isWithin30Days
}: CoursesListProps) {
  return (
    <div className="space-y-2">
      {sortedOptions.map(option => {
        const isSelected = selected.includes(option.courseId);
        const isInBasket = basket.some(b => b.courseId === option.courseId);
        const optionCredits = Number(option.credits) || 0;
        const wouldExceedYearCap = !isSelected && yearEarned + optionCredits > yearCap;
        const disabled = (isAtMax && !isSelected) || wouldExceedYearCap;

        return (
          <div
            key={option.id}
            className="border rounded-lg p-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">
                {option.courseId}: {option.title}
              </div>
              
              {(() => {
                const basketItem = basket.find(b => b.courseId === option.courseId);
                return basketItem?.status === 'auto-filled' && basketItem.autoFillReason && (
                  <div className="text-xs text-muted-foreground mt-1 italic">
                    ✨ {basketItem.autoFillReason}
                  </div>
                );
              })()}
              
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>{option.credits} cr</span>
                
                {(option.unlocks_count ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    🔓 Unlocks {option.unlocks_count}
                  </Badge>
                )}
                
                {option.start_windows?.[0] && (
                  <Badge variant={isWithin30Days(option.start_windows[0]) ? 'default' : 'outline'} className="text-xs">
                    🗓️ Starts {formatRelativeDate(option.start_windows[0])}
                  </Badge>
                )}
                
                {option.workload_weekly_hours && (
                  <Badge variant={option.workload_weekly_hours > 15 ? 'destructive' : 'outline'} className="text-xs">
                    📊 {option.workload_weekly_hours}hrs/wk
                  </Badge>
                )}
                
                {option.providerType && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    option.providerType === 'university' ? 'bg-blue-100 text-blue-700' :
                    option.providerType === 'mooc' ? 'bg-purple-100 text-purple-700' :
                    option.providerType === 'bootcamp' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {option.providerType === 'university' && '🎓'}
                    {option.providerType === 'mooc' && '🌐'}
                    {option.providerType === 'bootcamp' && '⚡'}
                    {option.providerType === 'testing_center' && '📝'}
                    {' '}{option.provider}
                  </span>
                )}
                
                <TransferBadge
                  courseCode={option.courseId}
                  providerCode={option.providerCode || ''}
                  providerType={option.providerType}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <div className="text-right min-w-[80px]">
                <div className="text-sm font-semibold">
                  {option.cost_usd !== null ? `$${option.cost_usd}` : 'Free'}
                </div>
                {option.duration_weeks && (
                  <div className="text-xs text-muted-foreground">
                    {option.duration_weeks}wks
                  </div>
                )}
              </div>

              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggleCourse(moduleId, option.courseId, optionCredits, creditsRequired)}
                className="h-5 w-5"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
