import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { ChevronUp, ArrowLeft, Bug } from 'lucide-react';
import type { OptimizerMode } from '@/types/optimizer';
import { OptimizerModeSelector, PolicyStatusBanner } from '@/components/edu-tree';
import { validateInstitutionPolicies, type Violation } from './engine/constraints';
import { useInstitutionLimits } from '@/hooks/useInstitutionLimits';
import { useGenEdCategories } from '@/hooks/useGenEdCategories';
import { Button } from '@/components/ui/button';
import { YearCard } from './components/YearCard';
import { ModuleCard } from './components/ModuleCard';
import { DegreeNode } from './components/DegreeNode';
import { ScopePanelRouter } from './components/ScopePanelRouter';
import { GraphView } from './components/GraphView';
import { QuickMarketplaceSeed } from '@/components/QuickMarketplaceSeed';
import { MigrationTrigger } from '@/components/MigrationTrigger';
import { SeedTrigger } from '@/components/SeedTrigger';
import { AnchorSchoolSelector } from './components/AnchorSchoolSelector';
import { AdminFAB } from './components/AdminFAB';
import { PolicyCard } from './components/PolicyCard';
import { TransferWarningBanner } from './components/TransferWarningBanner';
import { TESUDisclaimerBanner } from './components/TESUDisclaimerBanner';
import { SmartReplaceModal } from './components/SmartReplaceModal';
import { CreditOptimizerSuggestionBanner } from './components/CreditOptimizerSuggestionBanner';
import { CreditOptimizerModal } from './components/CreditOptimizerModal';
import { CreditOptimizerDevTools } from './components/CreditOptimizerDevTools';
import { ProvenanceWarning } from './components/ProvenanceWarning';
import { TemplateValidationBanner } from './components/TemplateValidationBanner';
import { useMarketplaceTemplate } from '@/hooks/useMarketplaceTemplates';
import { useDegreeTemplates } from '@/hooks/useDegreeTemplates';
import { useAltCreditEquivalenciesForInstitution } from '@/hooks/useAltCreditEquivalencies';
import { adaptDegreeTemplate } from './adapters/degreeTemplateAdapter';
import SeedStatus from '@/components/SeedStatus';
import { DragProvider } from './components/drag/DragProvider';
import canonicalCourses from '@/fixtures/prereqs/canonical-courses.json';
import requirements from '@/fixtures/requirements/cs-degree-requirements.json';
import { PROGRAM_MODULES, getModulesByYear } from '@/fixtures/v5/programModules';
import { COURSE_OPTIONS, getOptionsForBlock } from '@/fixtures/v5/courseOptions';
import { REQUIREMENT_BLOCKS } from '@/fixtures/v5/requirementBlocks';
import { ModuleData, Course, Requirement, LoadHealth, DegreeSummary } from './types/v5';
import { useV5DatabaseData } from './hooks/useV5DatabaseData';
import { createTemplateModuleProvider } from './adapters/templateModuleAdapter';
import { createProgramModulesProvider } from './adapters/programModulesAdapter';
import { createDatabaseModulesProvider } from './adapters/databaseModulesAdapter';
import type { DynamicModuleProvider } from './types/moduleProvider';
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
import { useYearNodesVM } from '@/state/selectors/degreeNodes';
import { useCascadeDegree } from '@/lib/degree/cascade';
import { useOptimizationSuggestion } from './hooks/useOptimizationSuggestion';
import './styles/v5.css';

// Feature flag for quick rollback during demos
const ENABLE_DEGREE_NODE = true;
const ENABLE_CREDIT_OPTIMIZER = true; // Feature flag for credit optimizer

export default function EduTreeV5Page() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const [provenanceWarningDismissed, setProvenanceWarningDismissed] = useState(false);
  const [tesuDisclaimerDismissed, setTesuDisclaimerDismissed] = useState(false);
  const [templateValidationDismissed, setTemplateValidationDismissed] = useState(false);
  const [optimizerMode, setOptimizerMode] = useState<OptimizerMode>('standard_like');
  
  // Detect if this is a DATABASE template (starts with institution code like 'tesu-')
  // vs FIXTURE template (has institution in middle like 'bsba-tesu-cheapest-2025')
  const isDbTemplate = templateId?.toLowerCase().startsWith('tesu-') || false;
  // For UI purposes (showing TESU disclaimer), check if template is TESU-related
  const isTESUTemplate = templateId?.toLowerCase().includes('tesu') || false;
  
  // Load TESU templates from database (when templateId starts with 'tesu-')
  const { data: dbTemplates, isLoading: dbTemplateLoading, error: dbTemplateError } = useDegreeTemplates({
    institutionCode: 'TESU',
    programCode: 'BSBA',
    enabled: isDbTemplate,
  });
  
  // Load equivalencies for TESU (needed for adapter)
  const { data: equivalencies } = useAltCreditEquivalenciesForInstitution('TESU');
  
  // Load marketplace template for fixture templates (non-database)
  const { data: fixtureTemplate, isLoading: fixtureLoading, error: fixtureError } = useMarketplaceTemplate(
    isDbTemplate ? '' : (templateId || '')
  );
  
  // Select and adapt the appropriate template with fallback logic
  const selectedTemplate = useMemo(() => {
    // Priority 1: Database template (if isDbTemplate and data exists)
    if (isDbTemplate && dbTemplates && dbTemplates.length > 0) {
      const dbTemplate = dbTemplates.find(t => t.id === templateId);
      if (dbTemplate) {
        console.log('[EduTreeV5] 🗄️ Using DATABASE template:', {
          id: dbTemplate.id,
          trackType: dbTemplate.track_type,
          totalCredits: dbTemplate.total_credits,
        });
        return adaptDegreeTemplate(dbTemplate, equivalencies);
      }
    }
    
    // Priority 2: Fixture template (marketplace templates)
    if (fixtureTemplate) {
      console.log('[EduTreeV5] 📋 Using FIXTURE template:', {
        id: fixtureTemplate.id,
      });
      return fixtureTemplate;
    }
    
    return null;
  }, [isDbTemplate, dbTemplates, fixtureTemplate, templateId, equivalencies]);
  
  const templateLoading = isDbTemplate ? dbTemplateLoading : fixtureLoading;
  const templateError = isDbTemplate ? dbTemplateError : fixtureError;
  
  // Debug template loading state
  useEffect(() => {
    console.log('[EduTreeV5] 📋 Template query state:', {
      templateId,
      isDbTemplate,
      isLoading: templateLoading,
      hasData: !!selectedTemplate,
      error: templateError?.message,
      templateData: selectedTemplate ? {
        id: selectedTemplate.id,
        yearCount: selectedTemplate.yearTemplates?.length,
        source: isDbTemplate ? 'database' : 'fixture',
      } : null
    });
  }, [templateId, isDbTemplate, templateLoading, selectedTemplate, templateError]);
  
  // Career context from handoff
  const [careerContext, setCareerContext] = useState<{
    careerId?: string;
    programId?: string;
    anchorSchool?: string;
    mode?: string;
    planSource?: string;
  } | null>(null);
  
  // Feature flag: Database vs Fixtures (default to fixtures now)
  const USE_DATABASE = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    // Only use database if explicitly set to '1' in URL (ignore localStorage)
    return params.get('db') === '1';
  }, []);

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

  // Phase 4: Dynamic Module Provider - Context-aware module source selection
  const moduleProvider = useMemo<DynamicModuleProvider | null>(() => {
    // Priority 1: Template mode (when templateId in URL and template loaded)
    if (selectedTemplate && templateId) {
      const hasModuleData = selectedTemplate.yearTemplates?.length > 0;
      
      if (hasModuleData) {
        console.log('[EduTreeV5] 🎯 Using TEMPLATE as module source:', {
          templateId: selectedTemplate.id,
          yearCount: selectedTemplate.yearTemplates.length
        });
        return createTemplateModuleProvider(selectedTemplate);
      } else {
        console.warn('[EduTreeV5] ⚠️ Template has no module data, falling back to PROGRAM_MODULES:', {
          templateId: selectedTemplate.id
        });
        // Fall through to Priority 3 (PROGRAM_MODULES)
      }
    }
    
    // Priority 2: Database mode (when db=1 in URL)
    if (USE_DATABASE && dbData?.modulesByYear) {
      console.log('[EduTreeV5] 🗄️ Using DATABASE as module source:', {
        years: Object.keys(dbData.modulesByYear),
        totalModules: Object.values(dbData.modulesByYear).flat().length
      });
      return createDatabaseModulesProvider(dbData.modulesByYear);
    }
    
    // Priority 3: Default to CS Program Modules (fixtures)
    console.log('[EduTreeV5] 📚 Using PROGRAM_MODULES as module source');
    return createProgramModulesProvider(PROGRAM_MODULES);
  }, [selectedTemplate, templateId, USE_DATABASE, dbData]);

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
  
  // Handle career handoff from degree template modal
  const setConstraints = usePlanBasket(s => s.setConstraints);
  const applyTemplateToPlan = usePlanBasket(s => s.applyTemplateToPlan);
  const clearBasket = usePlanBasket(s => s.clearAll);
  const constraints = usePlanBasket(s => s.constraints);
  const showDeadEndReasons = usePlanBasket(s => s.showDeadEndReasons);
  const setShowDeadEndReasons = usePlanBasket(s => s.setShowDeadEndReasons);
  
  // Auto-set anchor from marketplace navigation
  useEffect(() => {
    const optimizedPlan = (location.state as any)?.optimizedPlan;
    if (optimizedPlan?.institutionCode && !constraints.target_school) {
      console.log('[EduTreeV5] 🎓 Auto-setting anchor from marketplace:', optimizedPlan.institutionCode);
      setConstraints({ target_school: optimizedPlan.institutionCode });
    }
  }, [location.state, constraints.target_school, setConstraints]);
  
  // Apply marketplace template to plan basket (hydrate all years)
  useEffect(() => {
    if (selectedTemplate && templateId) {
      console.log('[EduTreeV5] 🧩 Applying marketplace template:', {
        id: selectedTemplate.id,
        title: selectedTemplate.marketplace.title,
        years: selectedTemplate.yearTemplates?.length || 0,
        hasData: !!selectedTemplate.yearTemplates && selectedTemplate.yearTemplates.length > 0
      });
      
      // CLEAR existing basket first to prevent conflicts
      clearBasket();
      console.log('[EduTreeV5] ✓ Basket cleared, applying template');
      
      applyTemplateToPlan(selectedTemplate);
      
      // Also set the anchor school constraint from template
      if (selectedTemplate.anchorSchool && !constraints.target_school) {
        console.log('[EduTreeV5] 🎓 Setting anchor from template:', selectedTemplate.anchorSchool);
        setConstraints({ target_school: selectedTemplate.anchorSchool });
      }
      
      // Phase 4: Auto-expand years that have content from template
      const yearsWithContent = selectedTemplate.yearTemplates?.map(yt => yt.year) ?? [];
      if (yearsWithContent.length > 0) {
        setCollapsedYears(prev => {
          const updated = { ...prev };
          // Expand years with courses
          yearsWithContent.forEach(y => { updated[y] = false; });
          // Collapse empty years
          [1, 2, 3, 4].filter(y => !yearsWithContent.includes(y)).forEach(y => {
            updated[y] = true;
          });
          return updated;
        });
        console.log('[EduTreeV5] ✅ Auto-expanded template years:', yearsWithContent);
      }
    } else {
      console.warn('[EduTreeV5] ⚠️ Template not loaded:', {
        hasSelectedTemplate: !!selectedTemplate,
        templateId,
        reason: !selectedTemplate ? 'selectedTemplate is falsy' : 'templateId is falsy'
      });
    }
  }, [selectedTemplate, templateId]); // Zustand functions are stable, removed from deps
  
  // Keyboard shortcut: Ctrl/Cmd+Shift+D toggles dead-end debug mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const newValue = !showDeadEndReasons;
        setShowDeadEndReasons(newValue);
        toast.message(`Dead-end reasons ${newValue ? 'enabled' : 'disabled'}`, {
          description: 'Use Ctrl+Shift+D to toggle'
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDeadEndReasons, setShowDeadEndReasons]);
  
  useEffect(() => {
    const programId = searchParams.get('programId');
    const anchorSchool = searchParams.get('anchorSchool');
    const mode = searchParams.get('mode');
    const careerId = searchParams.get('careerId');
    const planSource = searchParams.get('planSource');

    if (programId && anchorSchool) {
      console.log('[EduTreeV5] 🎯 Career handoff detected:', {
        programId,
        anchorSchool,
        mode,
        careerId,
        planSource,
      });

      // Set context for banner
      setCareerContext({
        careerId,
        programId,
        anchorSchool,
        mode,
        planSource,
      });

      setConstraints({
        target_school: anchorSchool,
      });

      // Hydrate plan from template if available
      try {
        const raw = localStorage.getItem('eduTree:seedTemplate');
        if (raw) {
          const { template } = JSON.parse(raw);
          if (template?.programId === programId && template?.anchorSchool === anchorSchool) {
            console.log('[EduTreeV5] 🧩 Applying seed template to plan');
            applyTemplateToPlan(template);
            // Clear after use
            localStorage.removeItem('eduTree:seedTemplate');
          } else {
            console.log('[EduTreeV5] Seed template mismatch, skipping hydration');
          }
        }
      } catch (e) {
        console.warn('[EduTreeV5] Failed to read seed template:', e);
      }

      // Track the handoff
      trackTelemetryEvent({
        task: 'career_handoff',
        route: '/edu-tree-v5',
        complexity: {
          schema_version: 1,
          program_id: programId,
          anchor_school: anchorSchool,
          mode,
          career_id: careerId,
          plan_source: planSource,
        }
      });
    }
  }, [searchParams, setConstraints]);
  
  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  
  // Scoped panel system
  const { panelState, openPanel, closePanel, setTab } = useScopedPanel();
  
  // Track if panel was opened programmatically to prevent hydration race condition
  const panelOpenedProgrammatically = useRef(false);
  
  // Graph view dialog state
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const basket = usePlanBasket(s => s.items);
  
  // Determine institution code for policy validation
  const institutionCode = useMemo(() => {
    if (constraints.target_school) return constraints.target_school;
    if (selectedTemplate?.anchorSchool) return selectedTemplate.anchorSchool;
    return 'TESU'; // Default fallback
  }, [constraints.target_school, selectedTemplate?.anchorSchool]);
  
  // Load institution limits and gen-ed categories for policy validation
  const { data: institutionLimits = [] } = useInstitutionLimits(institutionCode as any);
  const { data: genEdCategories = [] } = useGenEdCategories(institutionCode as any);
  
  // Compute policy violations when basket or institution changes
  const policyViolations = useMemo<Violation[]>(() => {
    if (!basket.length || !institutionLimits.length) return [];
    return validateInstitutionPolicies(
      basket,
      institutionCode,
      institutionLimits,
      genEdCategories,
      equivalencies
    );
  }, [basket, institutionCode, institutionLimits, genEdCategories, equivalencies]);
  
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
    const willCollapse = !collapsedYears[year];
    setCollapsedYears(prev => ({ 
      ...prev, 
      [year]: !prev[year] 
    }));
    
    // Track year toggle telemetry
    logEvent('year_toggled', { 
      year, 
      collapsed: willCollapse,
      modules_count: getModulesForYear(year).length 
    });
  };

  const toggleModule = (moduleId: string) => {
    console.log('[V5 Page] Toggling module:', moduleId);
    const willCollapse = !collapsedModules[moduleId];
    setCollapsedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
    
    // Track module toggle telemetry
    logEvent('module_toggled', { 
      module_id: moduleId, 
      collapsed: willCollapse 
    });
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
    
    // P1 Health Check: Assert module data exists before opening
    console.assert(
      module.marketplaceOptions !== undefined,
      '[V5 Page] Panel opened without marketplace options (should be populated first)'
    );
    
    // Set flag to prevent hydration from overwriting this data
    panelOpenedProgrammatically.current = true;
    
    // Race-proof: Reset flag after microtask to allow URL hydration on future loads
    queueMicrotask(() => { 
      panelOpenedProgrammatically.current = false;
      console.log('[V5 Page] Programmatic flag reset (microtask)');
    });
    
    openPanel('module', module.id, { module, year });
  }, [openPanel]);

  // Toggle database mode
  const handleToggleMode = useCallback(() => {
    const url = new URL(window.location.href);
    if (USE_DATABASE) {
      // Turn off database mode - remove db parameter
      url.searchParams.delete('db');
    } else {
      // Turn on database mode - add db=1
      url.searchParams.set('db', '1');
    }
    window.location.href = url.toString();
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
          optionsCount: marketplaceOptions?.length ?? 0, // Derive count from options
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
  
  // Phase 4: Dynamic module provider integration
  const getModulesForYear = useCallback((year: number): ModuleData[] => {
    // Use module provider if available
    if (moduleProvider) {
      const modules = moduleProvider.getModulesForYear(year);
      
      // Enhance with basket data for live updates
      const currentBasket = usePlanBasket.getState().items;
      
      return modules.map(mod => {
        // Filter basket items using DUAL matching (moduleId OR requirementArea)
        const basketItemsForModule = currentBasket.filter(item => 
          item.moduleId === mod.id || 
          (mod.requirementArea && item.requirementArea === mod.requirementArea) ||
          (mod.requirementArea && item.moduleId === mod.requirementArea)
        );
        
        const liveCreditsEarned = basketItemsForModule.reduce((sum, item) => sum + item.credits, 0);
        
        // Re-calculate summary from current basket
        const selectedSummary = computeModuleSummary(
          mod.id,
          mod.creditsRequired,
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
        
        return {
          ...mod,
          creditsEarned: liveCreditsEarned,
          optionsCount: mod.marketplaceOptions?.length ?? 0,
          selectedSummary,
          isCollapsed: !!collapsedModules[mod.id],
          courses: [], // Courses come from basket
        } as ModuleData;
      });
    }
    
    // Fallback: Database mode (legacy path)
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
          optionsCount: mod.optionsCount ?? mod.marketplaceOptions?.length ?? 0, // Defensive derivation
          selectedSummary,
          creditsEarned: liveCreditsEarned, // LIVE from basket
          selectedCourseIds: Array.from(selectedCourseIds)
        };
      });
    }
    return getModulesForYearFixtures(year);
  }, [moduleProvider, USE_DATABASE, dbData, basketKey, getModulesForYearFixtures, collapsedModules]);

  // Get all modules for auto-fill dialog
  const allModules = useMemo(() => {
    return [1, 2, 3, 4].flatMap(year => getModulesForYear(year));
  }, [getModulesForYear]);
  
  // Compute year node view models for aggregated year data
  const yearNodesVM = useYearNodesVM(allModules);
  
  // Cascade engine for recomputing years on plan changes
  const { recomputeYears } = useCascadeDegree(allModules);
  
  // Credit Optimizer: Analyze plan for savings opportunities
  // Extract marketplace options from the SAME modules we're rendering (works in both DB and fixture mode)
  const allOptions = useMemo(() => {
    return allModules.flatMap(m => m.marketplaceOptions || []);
  }, [allModules]);

  const anchorSchoolLabel = useMemo(() => {
    if (!constraints.target_school) return 'your degree program';
    const school = constraints.target_school.toUpperCase();
    return `${school}`;
  }, [constraints.target_school]);

  const {
    suggestion: optimizationSuggestion,
    showBanner: showOptimizerBanner,
    showModal: showOptimizerModal,
    openModal: openOptimizerModal,
    closeModal: closeOptimizerModal,
    dismissBanner: dismissOptimizerBanner,
    applyOptimization,
  } = useOptimizationSuggestion({
    modules: allModules,
    allOptions,
    anchorLabel: anchorSchoolLabel,
    minCostSaved: 1000,
    minMonthsSaved: 3,
    enabled: ENABLE_CREDIT_OPTIMIZER && allModules.length > 0 && basket.length > 0,
  });
  
  // Recompute years when basket or constraints change
  useEffect(() => {
    const updatedYears = recomputeYears();
    console.log('[V5 Page] Years recomputed:', updatedYears);
  }, [basketKey, constraints, recomputeYears]);

  // Hydrate panel data when opening from URL (handles both module and year scopes)
  useEffect(() => {
    // URL state canonicalization: normalize node IDs to avoid casing/slug mismatches
    const canonicalId = panelState.nodeId ? String(panelState.nodeId).trim() : undefined;
    
    // ✅ Self-heal: degree scope must not carry nodeId
    if (panelState.scope === 'degree' && canonicalId) {
      console.info('[V5 Page] Cleaning stale nodeId for degree scope:', canonicalId);
      openPanel('degree'); // Re-open without nodeId → cleans URL
      return;
    }
    
    // DEBUG: Always log hydration check state
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
      console.log('[V5 Page/Hydration] Check state:', {
        scope: panelState.scope,
        nodeId: canonicalId,
        hasNodeData: !!panelState.nodeData?.module,
        allModulesCount: allModules.length,
        programmaticFlag: panelOpenedProgrammatically.current,
        willHydrate: panelState.scope === 'module' && 
          canonicalId && 
          !panelState.nodeData?.module &&
          allModules.length > 0 &&
          !panelOpenedProgrammatically.current
      });
    }
    
    // Hydrate module data - check for missing module-specific data
    // GUARD: Only hydrate when data is ready and panel wasn't just opened programmatically
    if (
      panelState.scope === 'module' && 
      canonicalId && 
      !panelState.nodeData?.module &&
      allModules.length > 0 &&
      !panelOpenedProgrammatically.current
    ) {
      console.log('[V5 Page] 🔧 Hydrating missing module data from URL:', canonicalId);
      
      // Telemetry: Track hydration attempt
      trackTelemetryEvent({
        task: 'v5_panel_hydration_attempted',
        scope: 'module',
        complexity: { nodeId: canonicalId, hadData: false }
      }).catch(() => {});
      
      // PART 3: Force fresh data - get live basket state before finding module
      const currentBasket = usePlanBasket.getState().items;
      const freshModules = allModules.map(m => {
        const liveEarned = currentBasket
          .filter(b => b.moduleId === m.id)
          .reduce((sum, item) => sum + item.credits, 0);
        return { ...m, creditsEarned: liveEarned };
      });
      
      const targetModule = freshModules.find(m => m.id === canonicalId);
      
      if (targetModule) {
        const moduleYear = [1, 2, 3, 4].find(y => 
          getModulesForYear(y).some(m => m.id === canonicalId)
        ) || 1;
        
        console.log('[V5 Page] ✅ Found module with fresh data:', {
          id: targetModule.id,
          label: targetModule.label,
          year: moduleYear,
          creditsEarned: targetModule.creditsEarned,
          optionsCount: targetModule.marketplaceOptions?.length ?? 0,
          sampleOption: targetModule.marketplaceOptions?.[0]
        });
        
        // Telemetry: Track successful hydration
        trackTelemetryEvent({
          task: 'v5_panel_hydrated_from_url',
          scope: panelState.scope,
          complexity: { 
            nodeId: canonicalId, 
            optionsCount: targetModule.marketplaceOptions?.length ?? 0,
            success: true 
          }
        }).catch(() => {});
        
        openPanel('module', targetModule.id, { module: targetModule, year: moduleYear }, panelState.tab);
      } else {
        console.error('[V5 Page] ⚠️ Could not find module with ID:', {
          requestedId: canonicalId,
          availableIds: allModules.map(m => m.id)
        });
      }
    } else if (
      panelState.scope === 'module' && 
      canonicalId && 
      panelState.nodeData?.module?.marketplaceOptions
    ) {
      // Data already present, hydration not needed
      trackTelemetryEvent({
        task: 'v5_panel_hydration_skip',
        scope: 'module',
        complexity: { 
          nodeId: canonicalId, 
          hadData: true, 
          optionsCount: panelState.nodeData.module.marketplaceOptions.length 
        }
      }).catch(() => {});
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
  }, [panelState.scope, panelState.nodeId, panelState.nodeData, allModules, getModulesForYear, openPanel, panelState.tab]);
  
  // Reset programmatic flag when panel closes OR when URL state is loaded
  useEffect(() => {
    if (!panelState.scope) {
      // Panel closed - reset flag
      panelOpenedProgrammatically.current = false;
    } else if (panelState.scope && !panelState.nodeData) {
      // URL state loaded without data - reset flag to allow hydration
      panelOpenedProgrammatically.current = false;
      console.log('[V5 Page] Reset programmatic flag for URL hydration');
    }
  }, [panelState.scope, panelState.nodeData]);

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
    
    // Use template data when available, otherwise fallback to hardcoded defaults
    const totalRequired = selectedTemplate?.totals.credits ?? 120;
    const costPerCredit = selectedTemplate?.totals.costUsd 
      ? selectedTemplate.totals.costUsd / selectedTemplate.totals.credits
      : 375;
    
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
      degreeTitle: selectedTemplate?.label ?? "Bachelor of Science in Computer Science",
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
      {/* Admin FAB - Groups all admin/dev controls */}
      <AdminFAB
        useDatabase={USE_DATABASE}
        onToggleDatabase={handleToggleMode}
        onResetPlan={() => {
          if (confirm('Clear all course selections?')) {
            clearAll();
          }
        }}
      />

      {/* View as Graph button - only visible when basket has items */}
      {basket.length > 0 && (
        <button
          onClick={() => setGraphDialogOpen(true)}
          className="fixed bottom-4 right-60 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors z-[130] flex items-center gap-1.5"
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
          
          {/* Anchor Selector + Status */}
          <div className="flex items-center gap-2">
            <AnchorSchoolSelector />
            {USE_DATABASE && <SeedStatus />}
          </div>
        </div>
      </div>
      
      {/* Career Context Banner */}
      {careerContext && (
        <div className="mb-6 rounded-lg bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold flex items-center gap-2">
              🎯 Planning from Career Explorer
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {careerContext.anchorSchool?.toUpperCase()} • {careerContext.programId?.toUpperCase()} • {careerContext.mode}
              {careerContext.planSource === 'real' && ' • ✓ Real'}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCareerContext(null);
              trackTelemetryEvent({
                task: 'career_banner_dismissed',
                route: '/edu-tree-v5',
                complexity: { schema_version: 1 }
              });
            }}
          >
            Dismiss
          </Button>
        </div>
      )}
      
      {/* Template Loading/Error Feedback */}
      {templateLoading && templateId && (
        <div className="mb-4 rounded-lg bg-muted border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm text-muted-foreground">Loading template...</span>
          </div>
        </div>
      )}

      {templateError && templateId && (
        <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive px-4 py-3">
          <div className="font-semibold text-destructive">Failed to load template</div>
          <div className="text-sm text-destructive/80 mt-1">{templateError.message}</div>
        </div>
      )}
      
      {/* Marketplace Template Banner */}
      {selectedTemplate && (
        <div className="mb-4">
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-semibold">
                  Editing: {selectedTemplate.marketplace.title}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedTemplate.anchorSchool} • {selectedTemplate.catalogYear} Catalog
                </div>
              </div>
            </div>
            <Link to="/edu-tree-v5/marketplace">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
          {!provenanceWarningDismissed && (
            <div className="mt-2">
              <ProvenanceWarning 
                template={selectedTemplate} 
                onDismiss={() => setProvenanceWarningDismissed(true)} 
              />
            </div>
          )}
          
          {/* TESU Disclaimer Banner - Cost/Time Estimates */}
          {isTESUTemplate && !tesuDisclaimerDismissed && (
            <div className="mt-2">
              <TESUDisclaimerBanner onDismiss={() => setTesuDisclaimerDismissed(true)} />
            </div>
          )}
          
          {/* Template Graduation Validation Banner */}
          {!templateValidationDismissed && (
            <div className="mt-2">
              <TemplateValidationBanner 
                template={selectedTemplate} 
                onDismiss={() => setTemplateValidationDismissed(true)} 
              />
            </div>
          )}
          
          {/* Optimizer Mode Selector */}
          <div className="mt-4">
            <OptimizerModeSelector
              mode={optimizerMode}
              onChange={setOptimizerMode}
            />
          </div>
          
          {/* Policy Status Banner */}
          <div className="mt-3">
            <PolicyStatusBanner violations={policyViolations} />
          </div>
          
          {/* Dead-End Debug Toggle */}
          <div className="mt-3 flex items-center gap-2">
            <Button 
              variant={showDeadEndReasons ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setShowDeadEndReasons(!showDeadEndReasons)}
              className="text-xs"
            >
              <Bug className="h-3 w-3 mr-1" />
              {showDeadEndReasons ? 'Hide' : 'Show'} Dead-End Reasons
            </Button>
          </div>
        </div>
      )}

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
      
      {/* Credit Optimizer Debug Info */}
      {ENABLE_CREDIT_OPTIMIZER && !showOptimizerBanner && basket.length > 0 && (
        <div className="mb-4 rounded-md bg-muted/50 border border-muted px-3 py-2 text-xs text-muted-foreground">
          <strong>Debug:</strong> Optimizer {optimizationSuggestion?.hasSuggestion ? 'has suggestions' : 'found no savings'} 
          • Basket: {basket.length} courses 
          • Modules: {allModules.length}
          {optimizationSuggestion?.summary && (
            <span> • Would save ${optimizationSuggestion.summary.costSaved.toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Credit Optimizer Banner */}
      {ENABLE_CREDIT_OPTIMIZER && showOptimizerBanner && optimizationSuggestion?.summary && (
        <div className="mb-6">
          <CreditOptimizerSuggestionBanner
            summary={optimizationSuggestion.summary}
            onShow={openOptimizerModal}
            onDismiss={dismissOptimizerBanner}
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
            onClick={() => {
              console.log('[V5 Page] Degree node clicked', {
                currentScope: panelState.scope,
                currentNodeId: panelState.nodeId,
                isReOpen: panelState.scope === 'degree',
                willForceRefresh: panelState.scope === 'degree'
              });
              openPanel('degree');
            }}
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
                onClick={(ui) => {
                  console.log('[V5 Page] Year card clicked, calling openPanel:', {
                    year,
                    modulesCount: yearModules.length,
                    uiHint: ui
                  });
                  openPanel('year', String(year), { 
                    year, 
                    modules: yearModules,
                    ui // Pass UI hints (focusTab, focusTerm) through
                  });
                }}
                creditsSummary={yearData.creditsSummary}
                selectedSummary={yearSelectedSummary}
                loadHealth={yearData.loadHealth}
                modulesSummary={yearData.modulesSummary}
              />
            
            {/* Module Cards - Stack vertically below */}
            {!collapsedYears[year] && (() => {
              const yearModules = getModulesForYear(year);
              const yearEarned = getYearEarnedCredits(year);
              const yearCap = YEAR_CREDIT_CAP;
              
              return (
                <div className="modules-stack mt-4 space-y-3">
                  {yearModules.map((module, idx) => (
                    <ModuleCard
                      key={module.id}
                      {...module}
                      onToggle={() => toggleModule(module.id)}
                      onCourseClick={handleCourseClick}
                      onOpenPanel={() => handleOpenPanel(module, year)}
                      yearEarned={yearEarned}
                      yearCap={yearCap}
                      allModules={yearModules}
                      moduleIndex={idx}
                      showDeadEndReasons={showDeadEndReasons}
                    />
                  ))}
                </div>
              );
            })()}
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
        allOptions={allOptions}
        
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

      {/* PHASE 4: Drawer restore button - only show if drawer is actually hidden */}
      {panelState.scope && (() => {
        // Check if drawer is visually hidden
        const drawer = typeof document !== 'undefined' 
          ? document.querySelector('[data-testid="decision-dock-content"]') 
          : null;
        
        if (!drawer) return null;
        
        const rect = drawer.getBoundingClientRect();
        const isHidden = rect.top >= window.innerHeight - 50; // Allow small peek
        
        if (!isHidden) return null; // Don't show button if drawer is visible
        
        return (
          <button
            onClick={() => {
              const currentScope = panelState.scope;
              const currentNodeId = panelState.nodeId;
              const currentNodeData = panelState.nodeData;
              closePanel();
              setTimeout(() => {
                if (currentScope) {
                  openPanel(currentScope, currentNodeId, currentNodeData);
                }
              }, 50);
            }}
            className="fixed bottom-4 right-4 z-[100] p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform animate-bounce"
            aria-label="Restore drawer"
            title="Restore drawer"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        );
      })()}
      
      {/* Credit Optimizer Modal */}
      {ENABLE_CREDIT_OPTIMIZER && showOptimizerModal && optimizationSuggestion?.summary && (
        <CreditOptimizerModal
          open={showOptimizerModal}
          summary={optimizationSuggestion.summary}
          swaps={optimizationSuggestion.swaps}
          onClose={closeOptimizerModal}
          onApply={async () => {
            await applyOptimization();
            await recomputeYears();
          }}
        />
      )}
      
      {/* Dev Tools for Credit Optimizer Testing */}
      {ENABLE_CREDIT_OPTIMIZER && (
        <CreditOptimizerDevTools />
      )}
      </div>
    </DragProvider>
  );
}
