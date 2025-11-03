import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { YearCard } from './components/YearCard';
import { ModuleCard } from './components/ModuleCard';
import { DegreeNode } from './components/DegreeNode';
import { ScopePanelRouter } from './components/ScopePanelRouter';
import { GraphView } from './components/GraphView';
import { QuickMarketplaceSeed } from '@/components/QuickMarketplaceSeed';
import { MigrationTrigger } from '@/components/MigrationTrigger';
import { AnchorSchoolSelector } from './components/AnchorSchoolSelector';
import { PolicyCard } from './components/PolicyCard';
import { TransferWarningBanner } from './components/TransferWarningBanner';
import { SmartReplaceModal } from './components/SmartReplaceModal';
import SeedStatus from '@/components/SeedStatus';
import { DragProvider } from './components/drag/DragProvider';
import canonicalCourses from '@/fixtures/prereqs/canonical-courses.json';
import requirements from '@/fixtures/requirements/cs-degree-requirements.json';
import { PROGRAM_MODULES, getModulesByYear } from '@/fixtures/v5/programModules';
import { COURSE_OPTIONS, getOptionsForBlock } from '@/fixtures/v5/courseOptions';
import { REQUIREMENT_BLOCKS } from '@/fixtures/v5/requirementBlocks';
import { ModuleData, Course, Requirement, LoadHealth, DegreeSummary } from './types/v5';
import { useV5DatabaseData } from './hooks/useV5DatabaseData';
import { usePlanStore } from './state/usePlanStore';
import { usePlanBasket } from './state/usePlanBasket';
import { YEAR_CREDIT_CAP } from './constants/v5';
import { useScopedPanel } from './hooks/useScopedPanel';
import { logEvent } from '@/lib/analytics';
import { buildCourseIndex, getCourseFromIndex } from './utils/courseLookup';
import { validateSemesterDrop } from './engine/semesterValidation';
import { toast } from 'sonner';
import { computeModuleSummary, computeYearSummary } from './types/nodeProgress';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { useRequirementBlocks } from './hooks/useRequirementBlocks';
import { getAnchorPolicyFromConstraints } from './utils/anchorPolicyAdapter';
import './styles/v5.css';

// Feature flag for quick rollback during demos
const ENABLE_DEGREE_NODE = true;

export default function EduTreeV5Page() {
  // Feature flag: Database vs Fixtures with localStorage persistence + URL override
  const USE_DATABASE = useMemo(() => {
    if (typeof window === 'undefined') return true;        // SSR-safe default → DB
    const params = new URLSearchParams(window.location.search);
    const urlOverride = params.get('db');                  // ?db=1 or ?db=0 wins
    if (urlOverride !== null) return urlOverride === '1';
    const ls = localStorage.getItem('v5.useDatabase');     // next priority
    if (ls === '0') return false;
    if (ls === '1') return true;
    return true;                                           // default → DB mode
  }, []);

  // Log data mode for debugging
  useEffect(() => {
    console.log('[EduTreeV5] Data mode:', USE_DATABASE ? 'DATABASE' : 'FIXTURES');
  }, [USE_DATABASE]);

  // Database mode
  const { data: dbData, isLoading, error } = useV5DatabaseData({
    programId: 'bs_cs',
    enabled: USE_DATABASE,
  });

  // Week 2: Fetch requirement blocks for year progress computation
  const { data: dbBlocks = [] } = useRequirementBlocks('bs_cs', USE_DATABASE);
  
  // Use fixture blocks when not in database mode
  const requirementBlocks = useMemo(() => {
    return USE_DATABASE ? dbBlocks : REQUIREMENT_BLOCKS as any[];
  }, [USE_DATABASE, dbBlocks]);

  // Initialize from localStorage (SSR-safe)
  const [degreeCollapsed, setDegreeCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('v5.degreeCollapsed') === 'true';
  });
  
  // Track board load on mount
  useEffect(() => {
    trackTelemetryEvent({
      task: 'board_loaded',
      route: '/edu-tree-v5',
      complexity: {
        schema_version: 1,
        use_database: USE_DATABASE,
        degree_collapsed: degreeCollapsed,
      }
    });
  }, []); // Only run once on mount
  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  
  // Scoped panel system
  const { panelState, openPanel, closePanel, setTab } = useScopedPanel();
  
  // Track if panel was opened programmatically to prevent hydration race condition
  const panelOpenedProgrammatically = useRef(false);
  
  // Graph view dialog state
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  
  // Week 2: Extract anchor policy from constraints for year summaries
  const anchorPolicy = useMemo(() => 
    getAnchorPolicyFromConstraints(constraints), 
    [constraints]
  );
  
  const [panelSortBy, setPanelSortBy] = useState<'cheapest' | 'shortest' | 'credits' | 'best-match'>(() => {
    if (typeof window === 'undefined') return 'best-match';
    const saved = localStorage.getItem('v5-market-sort');
    return (saved as any) || 'best-match';
  });
  
  // Smart replace modal state
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceViolations, setReplaceViolations] = useState<any[]>([]);
  
  // Semester state management
  const addCourseToSemester = usePlanStore(s => s.addCourseToSemester);
  
  // Build course index from all marketplace options
  const courseIndex = useMemo(() => {
    if (USE_DATABASE && dbData?.modulesByYear) {
      const allOptions = Object.values(dbData.modulesByYear).flatMap(modules => 
        modules.flatMap(mod => mod.marketplaceOptions || [])
      );
      return buildCourseIndex(allOptions);
    }
    return new Map();
  }, [USE_DATABASE, dbData]);
  
  // Basket key for efficient memoization (only re-compute when basket content changes)
  const basketKey = useMemo(
    () => basket.map(b => b.courseId).sort().join('|'),
    [basket]
  );
  
  // Persist sort preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('v5-market-sort', panelSortBy);
    }
  }, [panelSortBy]);
  
  const toggleYear = (year: number) => {
    console.log('[V5 Page] Toggling year:', year);
    setCollapsedYears(prev => ({ 
      ...prev, 
      [year]: !prev[year] 
    }));
  };

  const toggleModule = (moduleId: string) => {
    console.log('[V5 Page] Toggling module:', moduleId);
    setCollapsedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleCourseClick = (courseId: string) => {
    console.log('[V5 Page] Course clicked:', courseId);
  };

  const handleOpenPanel = useCallback((module: ModuleData, year: number) => {
    console.log('[V5 Page] Opening module panel:', {
      moduleId: module.id,
      moduleLabel: module.label,
      hasMarketplaceOptions: !!module.marketplaceOptions,
      optionsCount: module.marketplaceOptions?.length || 0,
      year
    });
    // Set flag to prevent hydration from overwriting this data
    panelOpenedProgrammatically.current = true;
    openPanel('module', module.id, { module, year });
  }, [openPanel]);

  // Toggle database mode
  const handleToggleMode = useCallback(() => {
    const next = !USE_DATABASE;
    localStorage.setItem('v5.useDatabase', String(next));
    window.location.reload();
  }, [USE_DATABASE]);

  // Get course details from canonical courses
  const getCourseDetails = (courseId: string): Course | null => {
    const course = canonicalCourses.canonicalCourses[courseId as keyof typeof canonicalCourses.canonicalCourses];
    if (!course) return null;
    return {
      courseId: course.id,
      title: course.title,
      credits: course.credits,
      subject: course.subject
    };
  };

  // Get modules for a specific year (fixtures mode) - NEW: Use complete fixtures
  const getModulesForYearFixtures = useMemo(() => {
    return (year: number): ModuleData[] => {
      const yearModules = getModulesByYear(year);
      
      return yearModules.map((programModule) => {
        // Get ALL course options for this module's block (not just suggested ones)
        const marketplaceOptions = getOptionsForBlock(programModule.blockId);
        
        // Get selected courses from basket for this module
        const basketItems = basket.filter(b => b.moduleId === programModule.id);
        const creditsEarned = basketItems.reduce((sum, b) => sum + b.credits, 0);
        
        return {
          id: programModule.id,
          label: programModule.label,
          icon: programModule.icon ?? '📖',
          description: programModule.description,
          courses: [], // Courses come from basket
          marketplaceOptions, // ALL available options for this block
          creditsEarned,
          creditsRequired: programModule.creditsRequired,
          isCollapsed: !!collapsedModules[programModule.id],
          requirement_block_id: programModule.blockId, // Link to requirement block
          year: programModule.year,
        } as ModuleData;
      });
    };
  }, [collapsedModules, basket]);

  // Get modules for a specific year (database or fixtures)
  const selections = usePlanStore(s => s.selections);
  
  const getModulesForYear = useCallback((year: number): ModuleData[] => {
    if (USE_DATABASE && dbData?.modulesByYear) {
      const base = dbData.modulesByYear[year] || [];
      
      // PART 2: ALWAYS use fresh basket state for real-time sync
      const currentBasket = usePlanBasket.getState().items;
      
      return base.map((mod) => {
        // Get basket items for this module RIGHT NOW
        const basketItemsForModule = currentBasket.filter(b => b.moduleId === mod.id);
        
        // Calculate live earned credits from current basket
        const liveCreditsEarned = basketItemsForModule.reduce(
          (sum, item) => sum + item.credits, 
          0
        );
        
        // Re-calculate summary from current basket
        const selectedSummary = computeModuleSummary(
          mod.id,
          mod.creditsRequired ?? 0,
          currentBasket.map(item => ({
            moduleId: item.moduleId,
            credits: item.credits,
            cost_usd: item.cost_usd,
            duration_weeks: item.duration_weeks,
            cri_score: item.cri_score,
            status: item.status,
            autoFillReason: item.autoFillReason
          }))
        );
        
        // Get selected course IDs from basket for tracking
        const selectedCourseIds = new Set(basketItemsForModule.map(b => b.courseId));
        
        return { 
          ...mod, 
          selectedSummary,
          creditsEarned: liveCreditsEarned, // LIVE from basket
          selectedCourseIds: Array.from(selectedCourseIds)
        };
      });
    }
    return getModulesForYearFixtures(year);
  }, [USE_DATABASE, dbData, basketKey, getModulesForYearFixtures]);

  // Get all modules for auto-fill dialog
  const allModules = useMemo(() => {
    return [1, 2, 3, 4].flatMap(year => getModulesForYear(year));
  }, [getModulesForYear]);

  // Hydrate panel data when opening from URL (handles both module and year scopes)
  useEffect(() => {
    // Hydrate module data - check for missing module-specific data
    // GUARD: Only hydrate when data is ready and panel wasn't just opened programmatically
    if (
      panelState.scope === 'module' && 
      panelState.nodeId && 
      !panelState.nodeData?.module &&
      allModules.length > 0 &&
      !panelOpenedProgrammatically.current
    ) {
      console.log('[V5 Page] 🔧 Hydrating missing module data from URL:', panelState.nodeId);
      
      // PART 3: Force fresh data - get live basket state before finding module
      const currentBasket = usePlanBasket.getState().items;
      const freshModules = allModules.map(m => {
        const liveEarned = currentBasket
          .filter(b => b.moduleId === m.id)
          .reduce((sum, item) => sum + item.credits, 0);
        return { ...m, creditsEarned: liveEarned };
      });
      
      const targetModule = freshModules.find(m => m.id === panelState.nodeId);
      
      if (targetModule) {
        const moduleYear = [1, 2, 3, 4].find(y => 
          getModulesForYear(y).some(m => m.id === panelState.nodeId)
        ) || 1;
        
        console.log('[V5 Page] ✅ Found module with fresh data:', {
          id: targetModule.id,
          label: targetModule.label,
          year: moduleYear,
          creditsEarned: targetModule.creditsEarned,
          optionsCount: targetModule.marketplaceOptions?.length || 0
        });
        
        openPanel('module', targetModule.id, { module: targetModule, year: moduleYear }, panelState.tab);
      } else {
        console.warn('[V5 Page] ⚠️ Could not find module with ID:', panelState.nodeId);
      }
    }
    
    // Hydrate year data - check for missing year-specific data
    if (panelState.scope === 'year' && panelState.nodeId && (!panelState.nodeData || !panelState.nodeData.modules)) {
      console.log('[V5 Page] 🔧 Hydrating missing year data from URL:', panelState.nodeId);
      
      const year = Number(panelState.nodeId);
      const yearModules = getModulesForYear(year);
      
      console.log('[V5 Page] ✅ Found year data:', {
        year,
        modulesCount: yearModules.length,
        moduleIds: yearModules.map(m => m.id)
      });
      
      openPanel('year', String(year), { year, modules: yearModules }, panelState.tab);
    }
  }, [panelState.scope, panelState.nodeId, panelState.nodeData, allModules, getModulesForYear, openPanel]);
  
  // Reset programmatic flag when panel closes
  useEffect(() => {
    if (!panelState.scope) {
      panelOpenedProgrammatically.current = false;
    }
  }, [panelState.scope]);

  // Calculate total credits for a year (planned = required, earned = selected)
  const getYearCredits = useCallback((year: number): { planned: number; earned: number } => {
    const modules = getModulesForYear(year);
    const earned = modules.reduce((sum, m) => sum + (m.creditsEarned || 0), 0);
    const planned = modules.reduce((sum, m) => sum + (m.creditsRequired || 0), 0);
    return { planned, earned };
  }, [getModulesForYear]);

  // Calculate actual earned credits for a year from selections
  const getYearEarnedCredits = useCallback((year: number): number => {
    const modules = getModulesForYear(year);
    return modules.reduce((sum, m) => sum + (m.creditsEarned || 0), 0);
  }, [getModulesForYear]);

  // Calculate load health based on planned vs required credits
  const calculateLoadHealth = (planned: number, required: number): LoadHealth => {
    const ratio = planned / required;
    if (ratio < 0.75) return 'underloaded';
    if (ratio > 1.25) return 'overloaded';
    return 'balanced';
  };

  // Get year data with all metrics
  const getYearData = (year: number) => {
    const modules = getModulesForYear(year);
    const yearCredits = getYearCredits(year);

    return {
      creditsSummary: {
        planned: yearCredits.earned,   // Live from store selections
        required: yearCredits.planned, // From module definitions
      },
      loadHealth: calculateLoadHealth(yearCredits.earned, yearCredits.planned),
      modulesSummary: {
        total: modules.length,
        completed: modules.filter(m => m.creditsEarned >= m.creditsRequired).length,
        inProgress: modules.filter(m => m.creditsEarned > 0 && m.creditsEarned < m.creditsRequired).length,
      },
    };
  };

  // Helper: Safely count partial progress up to module's required credits
  const clampEarned = (earned?: number, required?: number): number => {
    return Math.max(0, Math.min(earned ?? 0, required ?? 0));
  };

  // Calculate actual earned credits from all modules
  // NOTE: Uses clamped creditsEarned (min: 0, max: creditsRequired) to safely
  // handle partial progress. Works with both atomic completion (0 or full credits)
  // and incremental tracking (1, 2, 3... credits as courses complete).
  const getTotalEarnedCredits = (): number => {
    const allYears = [1, 2, 3, 4];
    return allYears.reduce((sum, year) => {
      const modules = getModulesForYear(year);
      const yearEarned = modules.reduce(
        (s, m) => s + clampEarned(m.creditsEarned, m.creditsRequired),
        0
      );
      return sum + yearEarned;
    }, 0);
  };

  // Get degree summary data (memoized for performance)
  const degreeSummary = useMemo((): DegreeSummary => {
    const allYears = [1, 2, 3, 4];
    
    // Aggregate from all years
    let totalPlanned = 0;
    let totalEarned = 0;
    
    allYears.forEach(year => {
      const yearCredits = getYearCredits(year);
      totalPlanned += yearCredits.planned;
      totalEarned += yearCredits.earned;
    });
    
    const totalRequired = 120;
    const costPerCredit = 375;
    
    // Calculate degree-level residency metrics
    const residencyCumulative = basket
      .filter(i => i.providerType === 'university')
      .reduce((sum, i) => sum + i.credits, 0);
    
    const aceCumulative = basket
      .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
      .reduce((sum, i) => sum + i.credits, 0);
    
    const upperDivisionCumulative = basket
      .filter(i => (i.level || 0) >= 300)
      .reduce((sum, i) => sum + i.credits, 0);
    
    // Collect warnings: year-specific + degree-level policy warnings
    const allWarnings: string[] = [];
    
    // Year load warnings
    allYears.forEach(year => {
      const yearData = getYearData(year);
      if (yearData.loadHealth === 'overloaded') {
        allWarnings.push(`Year ${year} is overloaded (${yearData.creditsSummary.planned} credits)`);
      } else if (yearData.loadHealth === 'underloaded') {
        allWarnings.push(`Year ${year} is underloaded (${yearData.creditsSummary.planned} credits)`);
      }
    });
    
    // Degree-level policy warnings (residency, transfer caps, upper division)
    if (anchorPolicy) {
      const residencyShortfall = anchorPolicy.min_residency_credits - residencyCumulative;
      if (residencyShortfall > 0) {
        allWarnings.push(`Need ${residencyShortfall} more institutional credits to meet residency requirement`);
      }
      
      const aceOverage = aceCumulative - anchorPolicy.max_alt_credits;
      if (aceOverage > 0) {
        allWarnings.push(`Exceeded transfer credit cap by ${aceOverage} credits`);
      }
      
      const upperDivShortfall = anchorPolicy.upper_division_min - upperDivisionCumulative;
      if (upperDivShortfall > 0) {
        allWarnings.push(`Need ${upperDivShortfall} more upper-division credits`);
      }
    }
    
    // Dynamic time estimation based on pace
    const avgCreditsPerYear = totalPlanned / allYears.length;
    const remainingCredits = Math.max(0, totalRequired - totalEarned);
    
    // Guard: if already complete or no pace data, don't calculate meaningless duration
    const estimatedYears = remainingCredits === 0 
      ? 0  // Completed
      : avgCreditsPerYear > 0 
        ? Math.ceil(remainingCredits / avgCreditsPerYear)
        : 4; // Default fallback
    
    // Cost estimate based on remaining credits to complete degree
    
    return {
      degreeTitle: "Bachelor of Science in Computer Science",
      degreeLevel: "bachelor",
      totalCreditsRequired: totalRequired,
      totalCreditsPlanned: totalPlanned,
      totalCreditsEarned: totalEarned,
      estimatedMonths: estimatedYears * 12,
      estimatedCost: remainingCredits * costPerCredit,
      warnings: allWarnings
    };
  }, [getYearCredits, basket, anchorPolicy]);

  // Toggle degree with localStorage persistence (memoized for React.memo optimization)
  const toggleDegree = useCallback(() => {
    const next = !degreeCollapsed;
    setDegreeCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('v5.degreeCollapsed', String(next));
    }
  }, [degreeCollapsed]);

  // Reset all selections
  const clearAll = usePlanStore(s => s.clearAll);

  // Drag handlers with validation (Phase 2)
  const handleDragStart = useCallback((event: any) => {
    const courseId = event.active?.data?.current?.course?.id;
    if (courseId) {
      logEvent('course_drag_start', { courseId });
      console.log('[Drag] Start:', courseId);
      document.body.classList.add('dragging');
    }
  }, []);

  const handleDragOver = useCallback((event: any) => {
    // Can be used for ghost highlighting later
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    // Remove dragging class
    document.body.classList.remove('dragging');
    
    if (!over) {
      console.log('[Drag] Dropped nowhere');
      return;
    }

    // Look up course from drag data or index
    let course = active?.data?.current?.course;
    if (!course && active?.id) {
      const courseId = String(active.id).replace('course-', '');
      course = getCourseFromIndex(courseIndex, courseId);
    }
    
    if (!course) {
      toast.error('Course not found');
      return;
    }

    const semesterId = String(over.id);
    
    // Validate drop
    const plan = usePlanStore.getState();
    const validation = validateSemesterDrop({
      course,
      semesterId,
      plan,
      constraints: { termCap: 15, yearCap: 30, aceCap: 90 }
    });

    if (!validation.valid) {
      // Show error with shake animation
      const element = document.querySelector(`[data-semester-id="${semesterId}"]`);
      if (element) {
        element.classList.add('shake-animation');
        setTimeout(() => element.classList.remove('shake-animation'), 400);
      }
      
      // Show error toast with fix action if available
      const error = validation.errors[0];
      const fix = validation.fixes[0];
      
      toast.error(error.message, {
        action: fix ? {
          label: fix.label,
          onClick: () => {
            addCourseToSemester(fix.semesterId, course.id, course.credits ?? 0);
            toast.success(`Moved to ${fix.label}`);
            logEvent('semester_fix_applied', { 
              originalSemesterId: semesterId,
              fixedSemesterId: fix.semesterId,
              courseId: course.id 
            });
          }
        } : undefined,
        duration: 5000
      });
      
      logEvent('course_dropped', { 
        courseId: course.id, 
        semesterId,
        valid: false,
        errorCode: error.code
      });
      return;
    }

    // Valid drop - place course
    addCourseToSemester(semesterId, course.id, course.credits ?? 0);
    
    toast.success('Course added', {
      description: `${course.courseId} (${course.credits}cr)`,
      duration: 3000
    });
    
    console.log('[Drag] Placed', { 
      courseId: course.id, 
      semesterId,
      credits: course.credits 
    });
    
    logEvent('course_dropped', { 
      courseId: course.id, 
      semesterId,
      valid: true
    });
  }, [courseIndex, addCourseToSemester]);

  return (
    <DragProvider
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full min-h-screen bg-background p-8">
      {/* Dev mode toggle - always visible for testing */}
      <button
        onClick={handleToggleMode}
        className="fixed bottom-4 right-4 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors z-50"
        title="Toggle between database and fixture data"
      >
        {USE_DATABASE ? '🗄️ Database' : '🧪 Fixtures'}
      </button>

      {/* Reset plan button */}
      <button
        onClick={() => {
          if (confirm('Clear all course selections?')) {
            clearAll();
          }
        }}
        className="fixed bottom-4 right-32 px-3 py-1.5 bg-destructive/10 text-destructive rounded-md text-xs font-medium shadow-lg hover:bg-destructive/20 transition-colors z-50"
        title="Clear all selections"
      >
        🗑️ Reset Plan
      </button>

      {/* View as Graph button - only visible when basket has items */}
      {basket.length > 0 && (
        <button
          onClick={() => setGraphDialogOpen(true)}
          className="fixed bottom-4 right-60 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors z-50 flex items-center gap-1.5"
          title="Visualize plan as graph"
        >
          📊 View as Graph
        </button>
      )}

      {/* Loading state */}
      {USE_DATABASE && isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading from database...</p>
        </div>
      )}

      {/* Error state */}
      {USE_DATABASE && error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-8">
          <p className="text-destructive font-medium">Failed to load data from database</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">EduTree V5 - Year Spine + Modules</h1>
            <p className="text-sm text-muted-foreground">
              Click degree node or years to collapse/expand
              {USE_DATABASE && <span className="ml-2 text-primary">• Database Mode</span>}
            </p>
          </div>
          
          {/* Admin Controls + Anchor Selector */}
          <div className="flex items-center gap-2">
            {USE_DATABASE && (
              <>
                <MigrationTrigger />
              </>
            )}
            <AnchorSchoolSelector />
            
            {/* Dev toggle for database mode */}
            <button
              onClick={() => {
                const next = !USE_DATABASE;
                localStorage.setItem('v5.useDatabase', next ? '1' : '0');
                const params = new URLSearchParams(window.location.search);
                params.delete('db'); // keep URL clean; URL can still override when needed
                window.location.search = params.toString();
              }}
              className="text-xs px-2 py-1 rounded border border-border bg-background opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Toggle database/fixtures mode"
              title="Toggle between database and fixtures mode"
            >
              {USE_DATABASE ? '🗄️ DB' : '📦 Fixtures'}
            </button>
            
            {USE_DATABASE && <SeedStatus />}
          </div>
        </div>
      </div>
      
      {/* Transfer Warning Banner */}
      {constraints.target_school && (
        <div className="mb-6">
          <TransferWarningBanner
            onShowAlternatives={(violations) => {
              setReplaceViolations(violations);
              setReplaceModalOpen(true);
            }}
          />
        </div>
      )}
      
      {/* Transfer Policy Tracking */}
      {constraints.target_school && (
        <div className="mb-6 max-w-md">
          <PolicyCard />
        </div>
      )}

      {/* Quick Seed for Empty Database */}
      {USE_DATABASE && dbData && !isLoading && (() => {
        // Check if any module has marketplace options
        const hasMarketplaceOptions = Object.values(dbData.modulesByYear).some(modules =>
          modules.some(m => m.marketplaceOptions && m.marketplaceOptions.length > 0)
        );
        return !hasMarketplaceOptions;
      })() && (
        <div className="mb-6">
          <QuickMarketplaceSeed />
        </div>
      )}
      
      {/* Degree Node */}
      {/* Degree Node - now clickable */}
      {ENABLE_DEGREE_NODE && (
        <div className="mb-6">
          <DegreeNode
            {...degreeSummary}
            isCollapsed={degreeCollapsed}
            onToggle={toggleDegree}
            onClick={() => openPanel('degree')}
            yearCount={4}
          />
        </div>
      )}
      
      {/* Grid Layout: 4 columns for 4 years - hidden when degree collapsed */}
      <div 
        className={`year-spine-grid grid grid-cols-4 gap-6 items-start transition-opacity duration-300 ${
          degreeCollapsed ? 'hidden' : 'grid'
        }`}
      >
        {[1, 2, 3, 4].map(year => {
          const yearData = getYearData(year);
          const yearModules = getModulesForYear(year);
          
          // Compute year-level progress from basket
          const yearSelectedSummary = computeYearSummary(
            year,
            yearModules.map(m => ({ 
              id: m.id, 
              creditsRequired: m.creditsRequired ?? 0,
              requirement_block_id: m.requirement_block_id,
              upper_division: m.upper_division,
            })),
            basket.map(item => ({
              moduleId: item.moduleId,
              credits: item.credits,
              cost_usd: item.cost_usd,
              duration_weeks: item.duration_weeks,
              cri_score: item.cri_score,
              providerType: item.providerType,
              level: item.level,
            })),
            requirementBlocks,
            anchorPolicy
          );
          
          return (
            <div key={year} className="year-column">
              {/* Year Card - now clickable */}
              <YearCard
                year={year}
                isCollapsed={collapsedYears[year] || false}
                onToggle={() => toggleYear(year)}
                onClick={(ui) => openPanel('year', String(year), { 
                  year, 
                  modules: yearModules,
                  ui // Pass UI hints (focusTab, focusTerm) through
                })}
                creditsSummary={yearData.creditsSummary}
                selectedSummary={yearSelectedSummary}
                loadHealth={yearData.loadHealth}
                modulesSummary={yearData.modulesSummary}
                basketItems={basket}
              />
            
            {/* Module Cards - Stack vertically below */}
            {!collapsedYears[year] && (
              <div className="modules-stack mt-4 space-y-3">
                {getModulesForYear(year).map(module => {
                  const yearEarned = getYearEarnedCredits(year);
                  const yearCap = YEAR_CREDIT_CAP;
                  
                  return (
                    <ModuleCard
                      key={module.id}
                      {...module}
                      onToggle={() => toggleModule(module.id)}
                      onCourseClick={handleCourseClick}
                      onOpenPanel={() => handleOpenPanel(module, year)}
                      yearEarned={yearEarned}
                      yearCap={yearCap}
                    />
                  );
                })}
              </div>
            )}
            </div>
          );
        })}
      </div>

      {/* Graph View Dialog */}
      <GraphView 
        open={graphDialogOpen} 
        onOpenChange={setGraphDialogOpen} 
      />
      
      {/* Smart Replace Modal */}
      <SmartReplaceModal
        open={replaceModalOpen}
        onClose={() => setReplaceModalOpen(false)}
        violations={replaceViolations}
        targetSchool={constraints.target_school || ''}
      />
      
      {/* Scoped Panel System */}
      <ScopePanelRouter
        scope={panelState.scope}
        nodeId={panelState.nodeId}
        nodeData={panelState.nodeData}
        activeTab={panelState.tab}
        onClose={closePanel}
        onNavigate={openPanel}
        onTabChange={setTab}
        
        // Degree-specific props
        degreeSummary={degreeSummary}
        
        // Year-specific props  
        year={panelState.scope === 'year' ? Number(panelState.nodeId) : undefined}
        yearModules={panelState.scope === 'year' ? panelState.nodeData?.modules : undefined}
        onOpenModulePanel={(module: ModuleData) => {
          const year = panelState.nodeData?.year;
          if (year) {
            openPanel('module', module.id, { module, year });
          }
        }}
        
        // Module-specific props - PART 4: Simplified with fallbacks (component is now self-sufficient)
        moduleId={panelState.scope === 'module' ? panelState.nodeId : undefined}
        moduleLabel={panelState.scope === 'module' ? (panelState.nodeData?.module?.label ?? '') : undefined}
        creditsEarned={panelState.scope === 'module' ? (panelState.nodeData?.module?.creditsEarned ?? 0) : 0}
        creditsRequired={panelState.scope === 'module' ? (panelState.nodeData?.module?.creditsRequired ?? 0) : 0}
        options={panelState.scope === 'module' ? (panelState.nodeData?.module?.marketplaceOptions ?? []) : []}
        sortBy={panelSortBy}
        setSortBy={setPanelSortBy}
        yearEarned={panelState.scope === 'module' ? getYearEarnedCredits(panelState.nodeData?.year || 1) : 0}
        yearCap={YEAR_CREDIT_CAP}
        allModules={allModules}
      />
      </div>
    </DragProvider>
  );
}
