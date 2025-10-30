import { useState, useMemo, useCallback, useEffect } from 'react';
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
  // Feature flag: Database vs Fixtures
  const USE_DATABASE = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('db') === '1' || localStorage.getItem('v5.useDatabase') === 'true';
  }, []);

  // Database mode
  const { data: dbData, isLoading, error } = useV5DatabaseData({
    programId: 'bs_cs',
    enabled: USE_DATABASE,
  });

  // Week 2: Fetch requirement blocks for year progress computation
  const { data: requirementBlocks = [] } = useRequirementBlocks('bs_cs', USE_DATABASE);

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
    openPanel('module', module.id, { module, year });
  }, [openPanel]);

  // Toggle database mode
  const handleToggleMode = useCallback(() => {
    const next = !USE_DATABASE;
    localStorage.setItem('v5.useDatabase', String(next));
    window.location.reload();
  }, [USE_DATABASE]);

  // Mock course mapping to years
  const coursesByYear: Record<number, string[]> = {
    1: ['MATH-ALGEBRA-101', 'CS-INTRO-101'],
    2: ['MATH-CALCULUS-201', 'BIO-ANATOMY-201'],
    3: ['CS-DATA-STRUCTURES-301', 'BIO-ANATOMY-202'],
    4: ['BIO-MICROBIOLOGY-301']
  };

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

  // Get modules for a specific year (fixtures mode)
  const getModulesForYearFixtures = useMemo(() => {
    return (year: number): ModuleData[] => {
      const yearCourseIds = coursesByYear[year] || [];
      const modules: ModuleData[] = [];

      requirements.requirements.forEach((req: Requirement) => {
        // Find courses in this module that are in this year
        const moduleCourses = req.courseIds
          .filter(id => yearCourseIds.includes(id))
          .map(id => getCourseDetails(id))
          .filter((c): c is Course => c !== null);

        if (moduleCourses.length > 0) {
          const creditsEarned = moduleCourses.reduce((sum, c) => sum + c.credits, 0);
          modules.push({
            id: req.id,
            label: req.label,
            icon: req.icon,
            description: req.description,
            courses: moduleCourses,
            creditsEarned,
            creditsRequired: req.minCredits,
            isCollapsed: !!collapsedModules[req.id]
          });
        }
      });

      return modules;
    };
  }, [collapsedModules]);

  // Get modules for a specific year (database or fixtures)
  const selections = usePlanStore(s => s.selections);
  
  const getModulesForYear = useCallback((year: number): ModuleData[] => {
    if (USE_DATABASE && dbData?.modulesByYear) {
      const base = dbData.modulesByYear[year] || [];
      
      // Re-compute selectedSummary on each read for live updates when basket changes
      return base.map((mod) => {
        // Debug: Log basket items for this module
        const basketItemsForModule = basket.filter(b => b.moduleId === mod.id);
        if (basketItemsForModule.length > 0) {
          console.log('[V5Page] 🎯 Found basket items for module:', {
            moduleId: mod.id,
            moduleLabel: mod.label,
            itemCount: basketItemsForModule.length,
            courseIds: basketItemsForModule.map(i => i.courseId)
          });
        }
        
        // Re-calculate progress from current basket
        const selectedSummary = computeModuleSummary(
          mod.id,
          mod.creditsRequired ?? 0,
          basket.map(item => ({
            moduleId: item.moduleId,
            credits: item.credits,
            cost_usd: item.cost_usd,
            duration_weeks: item.duration_weeks,
            cri_score: item.cri_score,
            status: item.status,
            autoFillReason: item.autoFillReason
          }))
        );
        
        // Calculate creditsEarned from basket (fixes progress bug with templates)
        const creditsEarned = basketItemsForModule.reduce((sum, item) => sum + item.credits, 0);
        
        return { 
          ...mod, 
          selectedSummary,
          creditsEarned 
        };
      });
    }
    return getModulesForYearFixtures(year);
  }, [USE_DATABASE, dbData, basketKey, selections, getModulesForYearFixtures]);

  // Get all modules for auto-fill dialog
  const allModules = useMemo(() => {
    return [1, 2, 3, 4].flatMap(year => getModulesForYear(year));
  }, [getModulesForYear]);

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
    
    // Collect warnings from all years
    const allWarnings: string[] = [];
    allYears.forEach(year => {
      const yearData = getYearData(year);
      if (yearData.loadHealth === 'overloaded') {
        allWarnings.push(`Year ${year} is overloaded (${yearData.creditsSummary.planned} credits)`);
      } else if (yearData.loadHealth === 'underloaded') {
        allWarnings.push(`Year ${year} is underloaded (${yearData.creditsSummary.planned} credits)`);
      }
    });
    
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
  }, [getYearCredits]);

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
                onClick={() => openPanel('year', String(year), { year, modules: yearModules })}
                creditsSummary={yearData.creditsSummary}
                selectedSummary={yearSelectedSummary}
                loadHealth={yearData.loadHealth}
                modulesSummary={yearData.modulesSummary}
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
        
        // Module-specific props (existing marketplace logic)
        moduleId={panelState.scope === 'module' ? panelState.nodeId : undefined}
        moduleLabel={panelState.scope === 'module' ? panelState.nodeData?.module?.label : undefined}
        creditsEarned={panelState.scope === 'module' ? panelState.nodeData?.module?.creditsEarned : 0}
        creditsRequired={panelState.scope === 'module' ? panelState.nodeData?.module?.creditsRequired : 0}
        options={panelState.scope === 'module' ? panelState.nodeData?.module?.marketplaceOptions : []}
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
