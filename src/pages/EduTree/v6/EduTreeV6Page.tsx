/**
 * EduTree V6 — Experience Layer
 * 
 * Thin presentation wrapper over V5's engine.
 * Reuses ALL hooks, state, and logic from V5.
 * Changes only: entry state, year visibility, language, no debug UI.
 * 
 * V5 = Power mode (developers + power users)
 * V6 = Default user mode (guided, clean, calm)
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

// ── V5 engine reuse (zero modifications) ────────────────────
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import { usePlanStore } from '@/pages/EduTree/v5/state/usePlanStore';
import { useScopedPanel } from '@/pages/EduTree/v5/hooks/useScopedPanel';
import { usePlanSync } from '@/pages/EduTree/v5/hooks/usePlanSync';
import { usePricingMaps } from '@/pages/EduTree/v5/hooks/usePricingMaps';
import { useV5DatabaseData } from '@/pages/EduTree/v5/hooks/useV5DatabaseData';
import { useRequirementBlocks } from '@/pages/EduTree/v5/hooks/useRequirementBlocks';
import { useOptimizationSuggestion } from '@/pages/EduTree/v5/hooks/useOptimizationSuggestion';
import { useActivePlan } from '@/hooks/useActivePlan';
import { useMarketplaceTemplate } from '@/hooks/useMarketplaceTemplates';
import { useDegreeTemplates } from '@/hooks/useDegreeTemplates';
import { useAltCreditEquivalenciesForInstitution } from '@/hooks/useAltCreditEquivalencies';
import { useInstitutionLimits } from '@/hooks/useInstitutionLimits';
import { useInstitutionPolicyPack } from '@/lib/degree/useInstitutionPolicyPack';
import { useGenEdCategories } from '@/hooks/useGenEdCategories';
import { adaptDegreeTemplate } from '@/pages/EduTree/v5/adapters/degreeTemplateAdapter';
import { createTemplateModuleProvider } from '@/pages/EduTree/v5/adapters/templateModuleAdapter';
import { createProgramModulesProvider } from '@/pages/EduTree/v5/adapters/programModulesAdapter';
import { createDatabaseModulesProvider } from '@/pages/EduTree/v5/adapters/databaseModulesAdapter';
import { PROGRAM_MODULES, getModulesByYear } from '@/fixtures/v5/programModules';
import { COURSE_OPTIONS, getOptionsForBlock } from '@/fixtures/v5/courseOptions';
import { REQUIREMENT_BLOCKS } from '@/fixtures/v5/requirementBlocks';
import { YEAR_CREDIT_CAP } from '@/pages/EduTree/v5/constants/v5';
import { validateInstitutionPolicies } from '@/pages/EduTree/v5/engine/constraints';
import { validateSemesterDrop } from '@/pages/EduTree/v5/engine/semesterValidation';
import { getAnchorPolicyFromConstraints } from '@/pages/EduTree/v5/utils/anchorPolicyAdapter';
import { buildCourseIndex, getCourseFromIndex } from '@/pages/EduTree/v5/utils/courseLookup';
import { computeModuleSummary, computeYearSummary } from '@/pages/EduTree/v5/types/nodeProgress';
import { flattenModules, extractAllOptions, calculateCoverage } from '@/pages/EduTree/v5/utils/dataFlatteners';
import { useYearNodesVM } from '@/state/selectors/degreeNodes';
import { useCascadeDegree } from '@/lib/degree/cascade';
import { logEvent } from '@/lib/analytics';
import { healBasketForPolicy, formatHealSummary } from '@/lib/degree/autoHeal';
import { toast } from 'sonner';
import canonicalCourses from '@/fixtures/prereqs/canonical-courses.json';

// ── V5 components (reused as-is) ────────────────────────────
import { YearCard } from '@/pages/EduTree/v5/components/YearCard';
import { ModuleCard } from '@/pages/EduTree/v5/components/ModuleCard';
import { V6ModuleCard } from './components/V6ModuleCard';
import { ScopePanelRouter } from '@/pages/EduTree/v5/components/ScopePanelRouter';
import { GraphView } from '@/pages/EduTree/v5/components/GraphView';
import { UnassignedBucket } from '@/pages/EduTree/v5/components/UnassignedBucket';
import { SmartReplaceModal } from '@/pages/EduTree/v5/components/SmartReplaceModal';
import { CreditOptimizerSuggestionBanner } from '@/pages/EduTree/v5/components/CreditOptimizerSuggestionBanner';
import { CreditOptimizerModal } from '@/pages/EduTree/v5/components/CreditOptimizerModal';
import { TransferWarningBanner } from '@/pages/EduTree/v5/components/TransferWarningBanner';
import { DragProvider } from '@/pages/EduTree/v5/components/drag/DragProvider';
import type { ModuleData, Course, DegreeSummary, LoadHealth } from '@/pages/EduTree/v5/types/v5';
import type { DynamicModuleProvider } from '@/pages/EduTree/v5/types/moduleProvider';

// ── V6-only components ──────────────────────────────────────
import { GuidedEntryHero } from './components/GuidedEntryHero';
import { V6Header } from './components/V6Header';
import { V6BannerStack } from './components/V6BannerStack';
import { V6YearSection } from './components/V6YearSection';
import { V6DegreeNode } from './components/V6DegreeNode';
import { V6ModulePanel } from './components/V6ModulePanel';

import '@/pages/EduTree/v5/styles/v5.css';

export default function EduTreeV6Page() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');

  // ── Active plan + server sync ──
  const { data: activePlanData } = useActivePlan();
  const [localPlanId, setLocalPlanId] = useState<string | null>(null);
  const resolvedPlanId = localPlanId ?? activePlanData?.id ?? null;
  usePlanSync(resolvedPlanId);

  const handlePlanChange = useCallback((planId: string) => {
    setLocalPlanId(planId);
    usePlanBasket.getState().clearAll();
  }, []);

  // ── Template loading (same as V5) ──
  const isDbTemplate = templateId?.toLowerCase().startsWith('tesu-') || false;
  const { data: dbTemplates, isLoading: dbTemplateLoading } = useDegreeTemplates({
    institutionCode: 'TESU',
    programCode: 'BSBA',
    enabled: isDbTemplate,
  });
  const { data: equivalencies } = useAltCreditEquivalenciesForInstitution('TESU');
  const institutionCodeFromTemplate = dbTemplates?.[0]?.institution_code ?? 'TESU';
  const { data: pricingMaps } = usePricingMaps(institutionCodeFromTemplate);
  const { data: fixtureTemplate, isLoading: fixtureLoading } = useMarketplaceTemplate(
    isDbTemplate ? '' : (templateId || '')
  );

  const selectedTemplate = useMemo(() => {
    if (isDbTemplate && dbTemplates?.length) {
      const dbTemplate = dbTemplates.find(t => t.id === templateId);
      if (dbTemplate) {
        return adaptDegreeTemplate(dbTemplate, equivalencies, pricingMaps?.providerPricing, pricingMaps?.institutionalPricing);
      }
    }
    return fixtureTemplate || null;
  }, [isDbTemplate, dbTemplates, fixtureTemplate, templateId, equivalencies, pricingMaps]);

  const templateLoading = isDbTemplate ? dbTemplateLoading : fixtureLoading;

  // ── Data mode (fixtures by default) ──
  const USE_DATABASE = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('db') === '1';
  }, []);

  const { data: dbData, isLoading } = useV5DatabaseData({ programId: 'bs_cs', enabled: USE_DATABASE });
  const { data: dbBlocks = [] } = useRequirementBlocks('bs_cs', USE_DATABASE);
  const requirementBlocks = useMemo(() => USE_DATABASE ? dbBlocks : REQUIREMENT_BLOCKS as any[], [USE_DATABASE, dbBlocks]);

  // ── Module provider (same as V5) ──
  const moduleProvider = useMemo<DynamicModuleProvider | null>(() => {
    if (selectedTemplate && templateId) {
      if (selectedTemplate.yearTemplates?.length > 0) {
        return createTemplateModuleProvider(selectedTemplate);
      }
    }
    if (USE_DATABASE && dbData?.modulesByYear) {
      return createDatabaseModulesProvider(dbData.modulesByYear);
    }
    return createProgramModulesProvider(PROGRAM_MODULES);
  }, [selectedTemplate, templateId, USE_DATABASE, dbData]);

  // ── State ──
  const [degreeCollapsed, setDegreeCollapsed] = useState(false);
  // V6 KEY DIFFERENCE: Years 2-4 collapsed by default
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ 1: true });
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceViolations, setReplaceViolations] = useState<any[]>([]);
  const [panelSortBy, setPanelSortBy] = useState<'cheapest' | 'shortest' | 'credits' | 'best-match'>('best-match');

  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  const setConstraints = usePlanBasket(s => s.setConstraints);
  const applyTemplateToPlan = usePlanBasket(s => s.applyTemplateToPlan);
  const clearBasket = usePlanBasket(s => s.clearAll);
  const { panelState, openPanel, closePanel, setTab } = useScopedPanel();
  const panelOpenedProgrammatically = useRef(false);
  const addCourseToSemester = usePlanStore(s => s.addCourseToSemester);

  // ── Institution & policy ──
  const institutionCode = useMemo(() => {
    if (constraints.target_school) return constraints.target_school;
    if (selectedTemplate?.anchorSchool) return selectedTemplate.anchorSchool;
    return 'TESU';
  }, [constraints.target_school, selectedTemplate?.anchorSchool]);

  const { data: institutionLimits = [] } = useInstitutionLimits(institutionCode as any);
  const { data: genEdCategories = [] } = useGenEdCategories(institutionCode as any);
  const { data: policyData } = useInstitutionPolicyPack(constraints.target_school);

  const policyViolations = useMemo(() => {
    if (!basket.length || !institutionLimits.length) return [];
    return validateInstitutionPolicies(basket, institutionCode, institutionLimits, genEdCategories, equivalencies);
  }, [basket, institutionCode, institutionLimits, genEdCategories, equivalencies]);

  const anchorPolicy = useMemo(() => getAnchorPolicyFromConstraints(constraints), [constraints]);

  // ── Apply template on load ──
  useEffect(() => {
    if (selectedTemplate && templateId) {
      clearBasket();
      applyTemplateToPlan(selectedTemplate);

      // Auto-heal: fix providerCode gaps so residency/transfer counts are correct
      const currentItems = usePlanBasket.getState().items;
      if (currentItems.length > 0 && selectedTemplate.anchorSchool) {
        
        const healResult = healBasketForPolicy(currentItems, selectedTemplate.anchorSchool);
        if (healResult.healed) {
          const msg = formatHealSummary(healResult);
          if (msg) {
            console.log('[V6 AutoHeal]', msg);
            toast.info('Template adjusted', { description: msg });
          }
        }
      }

      if (selectedTemplate.anchorSchool && !constraints.target_school) {
        setConstraints({ target_school: selectedTemplate.anchorSchool });
      }
      // Auto-expand years with content
      const yearsWithContent = selectedTemplate.yearTemplates?.map((yt: any) => yt.year) ?? [];
      if (yearsWithContent.length > 0) {
        setExpandedYears(prev => {
          const updated = { ...prev };
          yearsWithContent.forEach((y: number) => { updated[y] = true; });
          return updated;
        });
      }
    }
  }, [selectedTemplate, templateId]);

  // Auto-set anchor from marketplace navigation
  useEffect(() => {
    const optimizedPlan = (location.state as any)?.optimizedPlan;
    if (optimizedPlan?.institutionCode && !constraints.target_school) {
      setConstraints({ target_school: optimizedPlan.institutionCode });
    }
  }, [location.state, constraints.target_school, setConstraints]);

  // ── Module data (same logic as V5) ──
  const getModulesForYearFixtures = useMemo(() => {
    return (year: number): ModuleData[] => {
      return getModulesByYear(year).map(pm => {
        const opts = getOptionsForBlock(pm.blockId);
        const items = basket.filter(b => b.moduleId === pm.id);
        return {
          id: pm.id, label: pm.label, icon: pm.icon ?? '📖', description: pm.description,
          courses: [], marketplaceOptions: opts, optionsCount: opts?.length ?? 0,
          creditsEarned: items.reduce((s, b) => s + b.credits, 0),
          creditsRequired: pm.creditsRequired, isCollapsed: !!collapsedModules[pm.id],
          requirement_block_id: pm.blockId, year: pm.year,
        } as ModuleData;
      });
    };
  }, [collapsedModules, basket]);

  const basketKey = useMemo(() => basket.map(b => b.courseId).sort().join('|'), [basket]);

  const getModulesForYear = useCallback((year: number): ModuleData[] => {
    if (moduleProvider) {
      const modules = moduleProvider.getModulesForYear(year);
      const currentBasket = usePlanBasket.getState().items;
      return modules.map(mod => {
        const items = currentBasket.filter(item =>
          item.moduleId === mod.id ||
          (mod.requirementArea && item.requirementArea === mod.requirementArea) ||
          (mod.requirementArea && item.moduleId === mod.requirementArea)
        );
        const liveEarned = items.reduce((s, i) => s + i.credits, 0);
        const summary = computeModuleSummary(mod.id, mod.creditsRequired, currentBasket.map(i => ({
          moduleId: i.moduleId, credits: i.credits, cost_usd: i.cost_usd,
          duration_weeks: i.duration_weeks, cri_score: i.cri_score, status: i.status, autoFillReason: i.autoFillReason,
        })));
        return { ...mod, creditsEarned: liveEarned, optionsCount: mod.marketplaceOptions?.length ?? 0, selectedSummary: summary, isCollapsed: !!collapsedModules[mod.id], courses: [] } as ModuleData;
      });
    }
    if (USE_DATABASE && dbData?.modulesByYear) {
      const base = dbData.modulesByYear[year] || [];
      const currentBasket = usePlanBasket.getState().items;
      return base.map(mod => {
        const items = currentBasket.filter(b => b.moduleId === mod.id);
        const liveEarned = items.reduce((s, i) => s + i.credits, 0);
        const summary = computeModuleSummary(mod.id, mod.creditsRequired ?? 0, currentBasket.map(i => ({
          moduleId: i.moduleId, credits: i.credits, cost_usd: i.cost_usd,
          duration_weeks: i.duration_weeks, cri_score: i.cri_score, status: i.status, autoFillReason: i.autoFillReason,
        })));
        return { ...mod, optionsCount: mod.optionsCount ?? mod.marketplaceOptions?.length ?? 0, selectedSummary: summary, creditsEarned: liveEarned };
      });
    }
    return getModulesForYearFixtures(year);
  }, [moduleProvider, USE_DATABASE, dbData, basketKey, getModulesForYearFixtures, collapsedModules]);

  const allModules = useMemo(() => [1, 2, 3, 4].flatMap(y => getModulesForYear(y)), [getModulesForYear]);
  const yearNodesVM = useYearNodesVM(allModules);
  const { recomputeYears } = useCascadeDegree(allModules);
  const allOptions = useMemo(() => allModules.flatMap(m => m.marketplaceOptions || []), [allModules]);

  const anchorSchoolLabel = useMemo(() => {
    if (!constraints.target_school) return 'your degree program';
    return constraints.target_school.toUpperCase();
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
    modules: allModules, allOptions, anchorLabel: anchorSchoolLabel,
    minCostSaved: 1000, minMonthsSaved: 3,
    enabled: allModules.length > 0 && basket.length > 0,
  });

  useEffect(() => { recomputeYears(); }, [basketKey, constraints, recomputeYears]);

  // ── Panel hydration (same as V5) ──
  useEffect(() => {
    if (panelState.scope === 'module' && panelState.nodeId && !panelState.nodeData?.module && allModules.length > 0 && !panelOpenedProgrammatically.current) {
      const mod = allModules.find(m => m.id === panelState.nodeId);
      if (mod) {
        const yr = [1,2,3,4].find(y => getModulesForYear(y).some(m => m.id === panelState.nodeId)) || 1;
        openPanel('module', mod.id, { module: mod, year: yr }, panelState.tab);
      }
    }
    if (panelState.scope === 'year' && panelState.nodeId && (!panelState.nodeData || !panelState.nodeData.modules)) {
      const year = Number(panelState.nodeId);
      openPanel('year', String(year), { year, modules: getModulesForYear(year) }, panelState.tab);
    }
  }, [panelState.scope, panelState.nodeId, panelState.nodeData, allModules, getModulesForYear, openPanel, panelState.tab]);

  // ── Computed degree summary ──
  const getYearCredits = useCallback((year: number) => {
    const mods = getModulesForYear(year);
    return {
      earned: mods.reduce((s, m) => s + (m.creditsEarned || 0), 0),
      planned: mods.reduce((s, m) => s + (m.creditsRequired || 0), 0),
    };
  }, [getModulesForYear]);

  const degreeSummary = useMemo((): DegreeSummary => {
    let totalPlanned = 0, totalEarned = 0;
    [1,2,3,4].forEach(y => { const c = getYearCredits(y); totalPlanned += c.planned; totalEarned += c.earned; });
    const totalRequired = selectedTemplate?.totals.credits ?? 120;
    const costPerCredit = selectedTemplate?.totals.costUsd ? selectedTemplate.totals.costUsd / selectedTemplate.totals.credits : 375;
    const remaining = Math.max(0, totalRequired - totalEarned);
    const avgPerYear = totalPlanned / 4;
    const estYears = remaining === 0 ? 0 : avgPerYear > 0 ? Math.ceil(remaining / avgPerYear) : 4;

    // Collect warnings
    const warnings: string[] = [];
    if (anchorPolicy) {
      const res = basket.filter(i => i.providerType === 'university').reduce((s, i) => s + i.credits, 0);
      const aceC = basket.filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center').reduce((s, i) => s + i.credits, 0);
      if (anchorPolicy.min_residency_credits - res > 0) warnings.push(`Need ${anchorPolicy.min_residency_credits - res} more institutional credits`);
      if (aceC - anchorPolicy.max_alt_credits > 0) warnings.push(`Exceeded transfer credit cap by ${aceC - anchorPolicy.max_alt_credits} credits`);
    }

    return {
      degreeTitle: selectedTemplate?.label ?? "Bachelor of Science in Computer Science",
      degreeLevel: "bachelor",
      totalCreditsRequired: totalRequired,
      totalCreditsPlanned: totalPlanned,
      totalCreditsEarned: totalEarned,
      estimatedMonths: estYears * 12,
      estimatedCost: remaining * costPerCredit,
      warnings,
    };
  }, [getYearCredits, basket, anchorPolicy, selectedTemplate]);

  // ── Helpers ──
  const getYearData = (year: number) => {
    const mods = getModulesForYear(year);
    const c = getYearCredits(year);
    const ratio = c.planned > 0 ? c.earned / c.planned : 0;
    return {
      creditsSummary: { planned: c.earned, required: c.planned },
      loadHealth: (ratio < 0.75 ? 'underloaded' : ratio > 1.25 ? 'overloaded' : 'balanced') as LoadHealth,
      modulesSummary: {
        total: mods.length,
        completed: mods.filter(m => m.creditsEarned >= m.creditsRequired).length,
        inProgress: mods.filter(m => m.creditsEarned > 0 && m.creditsEarned < m.creditsRequired).length,
      },
    };
  };

  const getYearEarnedCredits = useCallback((year: number) => {
    return getModulesForYear(year).reduce((s, m) => s + (m.creditsEarned || 0), 0);
  }, [getModulesForYear]);

  const toggleDegree = useCallback(() => setDegreeCollapsed(p => !p), []);
  const toggleModule = (id: string) => setCollapsedModules(p => ({ ...p, [id]: !p[id] }));
  const toggleYear = (year: number) => setExpandedYears(p => ({ ...p, [year]: !p[year] }));

  const handleOpenPanel = useCallback((module: ModuleData, year: number) => {
    panelOpenedProgrammatically.current = true;
    queueMicrotask(() => { panelOpenedProgrammatically.current = false; });
    openPanel('module', module.id, { module, year });
  }, [openPanel]);

  const courseIndex = useMemo(() => {
    if (USE_DATABASE && dbData?.modulesByYear) {
      const opts = Object.values(dbData.modulesByYear).flatMap(ms => ms.flatMap(m => m.marketplaceOptions || []));
      return buildCourseIndex(opts);
    }
    return new Map();
  }, [USE_DATABASE, dbData]);

  // ── Drag handlers (same as V5) ──
  const handleDragStart = useCallback((event: any) => {
    if (event.active?.data?.current?.course?.id) document.body.classList.add('dragging');
  }, []);
  const handleDragOver = useCallback(() => {}, []);
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    document.body.classList.remove('dragging');
    if (!over) return;
    let course = active?.data?.current?.course;
    if (!course && active?.id) course = getCourseFromIndex(courseIndex, String(active.id).replace('course-', ''));
    if (!course) { toast.error('Course not found'); return; }
    const semesterId = String(over.id);
    const plan = usePlanStore.getState();
    const bItems = usePlanBasket.getState().items;
    const cons = usePlanBasket.getState().constraints;
    const validation = validateSemesterDrop({
      course, semesterId, plan,
      constraints: { termCap: 15, yearCap: 30, aceCap: 90, targetSchool: cons.target_school || 'TESU', basket: bItems, moduleId: course.moduleId || 'semester-drop' }
    });
    if (!validation.valid) {
      toast.error(validation.errors[0]?.message || 'Cannot place here');
      return;
    }
    addCourseToSemester(semesterId, course.id, course.credits ?? 0);
    toast.success('Course added', { description: `${course.courseId} (${course.credits}cr)` });
  }, [courseIndex, addCourseToSemester]);

  // ── V6 entry detection ──
  const [userDismissedHero, setUserDismissedHero] = useState(false);
  // Show hero whenever basket is empty AND no template is loaded/loading AND user hasn't dismissed.
  const showGuidedEntry = basket.length === 0 && !templateId && !templateLoading && !userDismissedHero;

  // ── Render ──
  return (
    <DragProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="w-full min-h-[calc(100vh-4rem)] bg-background p-6">
        {/* V6 Header — clean, no debug */}
        <V6Header
          degreeTitle={degreeSummary.degreeTitle}
          activePlanId={resolvedPlanId}
          onPlanChange={handlePlanChange}
          currentTemplateId={templateId}
          onDegreeChange={(newId) => {
            const hasItems = basket.length > 0;
            if (hasItems) {
              const confirmed = window.confirm('Switching degrees will replace your current plan layout with the new degree template. Continue?');
              if (!confirmed) return;
            }
            navigate(`/edu-tree-v6?templateId=${newId}`);
            setExpandedYears({ 1: true, 2: false, 3: false, 4: false });
            toast.success('Degree switched', {
              description: hasItems
                ? 'Your plan was replaced with the new degree template.'
                : 'Your selected courses are still in your plan.',
            });
          }}
        />

        {/* Loading */}
        {(USE_DATABASE && isLoading) && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        )}

        {/* V6 KEY: Guided Entry Hero for empty plans */}
        {showGuidedEntry ? (
          <GuidedEntryHero
            degreeTitle={degreeSummary.degreeTitle}
            totalCredits={degreeSummary.totalCreditsRequired}
            estimatedCost={selectedTemplate?.totals?.costUsd ?? undefined}
            onStartYear1={() => {
              setUserDismissedHero(true);
              setExpandedYears({ 1: true, 2: false, 3: false, 4: false });
              setTimeout(() => {
                document.querySelector('[data-year="1"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            onBrowseTemplates={() => navigate('/marketplace')}
            onShowFullMap={() => {
              setUserDismissedHero(true);
              setExpandedYears({ 1: true, 2: true, 3: true, 4: true });
            }}
          />
        ) : (
          <>
            {/* Banner Stack — max 1 visible, rest collapsed */}
            <V6BannerStack
              primary={
                showOptimizerBanner && optimizationSuggestion?.summary ? (
                  <CreditOptimizerSuggestionBanner
                    summary={optimizationSuggestion.summary}
                    onShow={openOptimizerModal}
                    onDismiss={dismissOptimizerBanner}
                  />
                ) : undefined
              }
              secondary={[
                constraints.target_school ? (
                  <TransferWarningBanner
                    key="transfer"
                    onShowAlternatives={(violations) => {
                      setReplaceViolations(violations);
                      setReplaceModalOpen(true);
                    }}
                  />
                ) : null,
              ].filter(Boolean) as React.ReactNode[]}
            />

            {/* Degree Node — with V6 language overrides */}
            <div className="mb-6">
              <V6DegreeNode
                {...degreeSummary}
                isCollapsed={degreeCollapsed}
                onToggle={toggleDegree}
                onClick={() => openPanel('degree')}
                yearCount={4}
              />
            </div>

            <UnassignedBucket />

            {/* Year Grid — V6: Progressive reveal */}
            {!degreeCollapsed && (
              <div className="space-y-6">
                {[1, 2, 3, 4].map(year => {
                  const yearData = getYearData(year);
                  const yearModules = getModulesForYear(year);
                  const isExpanded = !!expandedYears[year];
                  // Visual lock: year > 1 and Year 1 has 0 courses (unless user has courses in this year)
                  const year1Earned = getYearEarnedCredits(1);
                  const thisYearEarned = getYearEarnedCredits(year);
                  const isVisuallyLocked = year > 1 && year1Earned === 0 && thisYearEarned === 0 && !templateId;

                  const yearSelectedSummary = computeYearSummary(
                    year,
                    yearModules.map(m => ({ id: m.id, creditsRequired: m.creditsRequired ?? 0, requirement_block_id: m.requirement_block_id, upper_division: m.upper_division })),
                    basket.map(i => ({ moduleId: i.moduleId, credits: i.credits, cost_usd: i.cost_usd, duration_weeks: i.duration_weeks, cri_score: i.cri_score, providerType: i.providerType, level: i.level })),
                    requirementBlocks,
                    anchorPolicy
                  );

                  return (
                    <V6YearSection
                      key={year}
                      year={year}
                      isExpanded={isExpanded}
                      onToggle={() => toggleYear(year)}
                      creditsSummary={yearData.creditsSummary}
                      modulesCount={yearModules.length}
                      isVisuallyLocked={isVisuallyLocked}
                    >
                      {/* Expanded content — same as V5 */}
                      <div className="year-column">
                        <YearCard
                          year={year}
                          isCollapsed={false}
                          onToggle={() => toggleYear(year)}
                          onClick={(ui) => openPanel('year', String(year), { year, modules: yearModules, ui })}
                          creditsSummary={yearData.creditsSummary}
                          selectedSummary={yearSelectedSummary}
                          loadHealth={yearData.loadHealth}
                          modulesSummary={yearData.modulesSummary}
                        />
                        <div className="modules-stack mt-4 space-y-3">
                          {yearModules.map((module) => (
                            <V6ModuleCard
                              key={module.id}
                              module={module}
                              onOpenPanel={() => handleOpenPanel(module, year)}
                            />
                          ))}
                        </div>
                      </div>
                    </V6YearSection>
                  );
                })}
              </div>
            )}

            {/* Graph View */}
            {basket.length > 0 && (
              <button
                onClick={() => setGraphDialogOpen(true)}
                className="fixed bottom-4 right-4 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors z-[130] flex items-center gap-1.5"
              >
                📊 View as Graph
              </button>
            )}
            <GraphView open={graphDialogOpen} onOpenChange={setGraphDialogOpen} />
            <SmartReplaceModal open={replaceModalOpen} onClose={() => setReplaceModalOpen(false)} violations={replaceViolations} targetSchool={constraints.target_school || ''} />

            {/* V6: Module panel with trust signals */}
            {panelState.scope === 'module' && panelState.nodeData?.module && (
              <V6ModulePanel
                open={true}
                onClose={closePanel}
                module={panelState.nodeData.module}
                moduleLabel={panelState.nodeData.module.label ?? ''}
                anchorSchool={constraints.target_school || undefined}
                yearEarned={getYearEarnedCredits(panelState.nodeData?.year || 1)}
                yearCap={YEAR_CREDIT_CAP}
              />
            )}

            {/* Degree + Year panels — delegate to V5's ScopePanelRouter */}
            {(panelState.scope === 'degree' || panelState.scope === 'year') && (
              <ScopePanelRouter
                scope={panelState.scope}
                nodeId={panelState.nodeId}
                nodeData={panelState.nodeData}
                activeTab={panelState.tab}
                onClose={closePanel}
                onNavigate={openPanel}
                onTabChange={setTab}
                degreeSummary={degreeSummary}
                year={panelState.scope === 'year' ? Number(panelState.nodeId) : undefined}
                yearModules={panelState.scope === 'year' ? panelState.nodeData?.modules : undefined}
                onOpenModulePanel={(module: ModuleData) => {
                  const yr = panelState.nodeData?.year;
                  if (yr) openPanel('module', module.id, { module, year: yr });
                }}
                allOptions={allOptions}
                allModules={allModules}
              />
            )}

            {/* Credit Optimizer Modal */}
            {showOptimizerModal && optimizationSuggestion?.summary && (
              <CreditOptimizerModal
                open={showOptimizerModal}
                summary={optimizationSuggestion.summary}
                swaps={optimizationSuggestion.swaps}
                onClose={closeOptimizerModal}
                onApply={async () => { await applyOptimization(); await recomputeYears(); }}
              />
            )}
          </>
        )}
      </div>
    </DragProvider>
  );
}
