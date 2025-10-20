import { useState, useMemo, useCallback, useEffect } from 'react';
import { YearCard } from './components/YearCard';
import { ModuleCard } from './components/ModuleCard';
import { DegreeNode } from './components/DegreeNode';
import { ModuleDetailPanel } from './components/ModuleDetailPanel';
import { useV5MarketplaceData } from '@/hooks/useV5MarketplaceData';
import { useTransferRules } from '@/hooks/useTransferRules';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useUserPlanSelections } from '@/hooks/useUserPlanSelections';
import { supabase } from '@/integrations/supabase/client';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { ModuleData, LoadHealth, DegreeSummary } from './types/v5';
import './styles/v5.css';

// Feature flag for quick rollback during demos
const ENABLE_DEGREE_NODE = true;
const PROGRAM_ID = 'bs_cs';

export default function EduTreeV5Page() {
  // State
  const [degreeCollapsed, setDegreeCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('v5.degreeCollapsed') === 'true';
  });
  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);
  
  // Data hooks
  const { data: marketplaceModules, isLoading, error } = useV5MarketplaceData(PROGRAM_ID);
  const { data: transferRules } = useTransferRules(PROGRAM_ID);
  
  // Get current user
  const [userId, setUserId] = useState<string | undefined>();
  
  // Fetch user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);
  
  const { data: userPlan } = useUserPlan(userId, PROGRAM_ID);
  const { data: planSelections } = useUserPlanSelections(userPlan?.id);
  
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

  const handleModuleClick = (module: ModuleData) => {
    setSelectedModule(module);
    trackTelemetryEvent({
      task: 'module_marketplace_opened',
      complexity: { moduleId: module.id, optionsCount: module.optionsCount || 0 }
    });
  };

  // Group modules by year
  const modulesByYear = useMemo(() => {
    if (!marketplaceModules) return { 1: [], 2: [], 3: [], 4: [] };
    
    const grouped: Record<number, ModuleData[]> = { 1: [], 2: [], 3: [], 4: [] };
    
    // Group by actual year field from database
    marketplaceModules.forEach(module => {
      const year = module.year || 1;
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push({
        ...module,
        isCollapsed: !!collapsedModules[module.id]
      });
    });
    
    return grouped;
  }, [marketplaceModules, collapsedModules]);

  // Calculate total credits for a year
  const getYearCredits = (year: number): number => {
    const modules = modulesByYear[year] || [];
    return modules.reduce((sum, m) => sum + m.creditsEarned, 0);
  };

  // Calculate load health based on planned vs required credits
  const calculateLoadHealth = (planned: number, required: number): LoadHealth => {
    const ratio = planned / required;
    if (ratio < 0.75) return 'underloaded';
    if (ratio > 1.25) return 'overloaded';
    return 'balanced';
  };

  // Get year data with all metrics
  const getYearData = (year: number) => {
    const modules = modulesByYear[year] || [];
    const plannedCredits = getYearCredits(year);
    const requiredCredits = 30; // Standard academic year

    return {
      creditsSummary: {
        planned: plannedCredits,
        required: requiredCredits,
      },
      loadHealth: calculateLoadHealth(plannedCredits, requiredCredits),
      modulesSummary: {
        total: modules.length,
        completed: modules.filter(m => m.creditsEarned >= m.creditsRequired).length,
        inProgress: modules.filter(m => m.creditsEarned > 0 && m.creditsEarned < m.creditsRequired).length,
      },
    };
  };

  // Calculate credits from plan selections
  const { totalCreditsPlanned, totalCreditsEarned, transferCredits } = useMemo(() => {
    if (!planSelections) return { totalCreditsPlanned: 0, totalCreditsEarned: 0, transferCredits: 0 };
    
    let planned = 0;
    let earned = 0;
    let transfer = 0;
    
    Array.from(planSelections.values()).forEach((selection: any) => {
      const credits = selection.course?.credits || 0;
      planned += credits;
      if (selection.status === 'complete') {
        earned += credits;
      }
      // Assume courses with ACE/NCCRS are transfer credits
      if (selection.course?.is_transfer) {
        transfer += credits;
      }
    });
    
    return { totalCreditsPlanned: planned, totalCreditsEarned: earned, transferCredits: transfer };
  }, [planSelections]);

  // Calculate transfer/residency warnings
  const { warnings, transferUsed, transferMax, residencyMin } = useMemo(() => {
    const warns: string[] = [];
    const transferRule = transferRules?.find(r => r.rule_kind === 'transfer_max');
    const residencyRule = transferRules?.find(r => r.rule_kind === 'residency_min');
    
    const maxTransfer = transferRule?.value || 90;
    const minResidency = residencyRule?.value || 30;
    
    if (transferCredits > maxTransfer) {
      warns.push(`Transfer limit exceeded: ${transferCredits}/${maxTransfer} cr`);
    }
    
    if (totalCreditsEarned < minResidency && totalCreditsEarned > 0) {
      warns.push(`Residency requirement: ${totalCreditsEarned}/${minResidency} cr minimum`);
    }
    
    // Add year warnings
    [1, 2, 3, 4].forEach(year => {
      const yearData = getYearData(year);
      if (yearData.loadHealth === 'overloaded') {
        warns.push(`Year ${year} is overloaded (${yearData.creditsSummary.planned} credits)`);
      } else if (yearData.loadHealth === 'underloaded') {
        warns.push(`Year ${year} is underloaded (${yearData.creditsSummary.planned} credits)`);
      }
    });
    
    return { 
      warnings: warns, 
      transferUsed: transferCredits, 
      transferMax: maxTransfer, 
      residencyMin: minResidency 
    };
  }, [transferRules, transferCredits, totalCreditsEarned, modulesByYear]);

  // Get degree summary data
  const degreeSummary = useMemo((): DegreeSummary => {
    const totalRequired = 120;
    const costPerCredit = 375;
    const avgCreditsPerYear = totalCreditsPlanned / 4;
    const remainingCredits = Math.max(0, totalRequired - totalCreditsEarned);
    
    const estimatedYears = remainingCredits === 0 
      ? 0
      : avgCreditsPerYear > 0 
        ? Math.ceil(remainingCredits / avgCreditsPerYear)
        : 4;
    
    return {
      degreeTitle: "Bachelor of Science in Computer Science",
      degreeLevel: "bachelor",
      totalCreditsRequired: totalRequired,
      totalCreditsPlanned,
      totalCreditsEarned,
      estimatedMonths: estimatedYears * 12,
      estimatedCost: remainingCredits * costPerCredit,
      warnings
    };
  }, [totalCreditsPlanned, totalCreditsEarned, warnings]);

  // Toggle degree with localStorage persistence
  const toggleDegree = useCallback(() => {
    const next = !degreeCollapsed;
    setDegreeCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('v5.degreeCollapsed', String(next));
    }
  }, [degreeCollapsed]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-background p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-40 bg-muted rounded"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-background p-8">
        <div className="text-destructive">Error loading degree plan: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">EduTree V5 - Year Spine + Modules</h1>
        <p className="text-sm text-muted-foreground">Click degree node or years to collapse/expand</p>
      </div>
      
      {/* Degree Node */}
      {ENABLE_DEGREE_NODE && (
        <div className="mb-6">
          <DegreeNode
            {...degreeSummary}
            isCollapsed={degreeCollapsed}
            onToggle={toggleDegree}
            yearCount={4}
            transferUsed={transferUsed}
            transferMax={transferMax}
            residencyMin={residencyMin}
          />
        </div>
      )}
      
      {/* Grid Layout: 4 columns for 4 years */}
      <div 
        className={`year-spine-grid grid grid-cols-4 gap-6 items-start transition-opacity duration-300 ${
          degreeCollapsed ? 'hidden' : 'grid'
        }`}
      >
        {[1, 2, 3, 4].map(year => {
          const yearData = getYearData(year);
          return (
            <div key={year} className="year-column">
              {/* Year Card */}
              <YearCard
                year={year}
                isCollapsed={collapsedYears[year] || false}
                onToggle={() => toggleYear(year)}
                creditsSummary={yearData.creditsSummary}
                loadHealth={yearData.loadHealth}
                modulesSummary={yearData.modulesSummary}
              />
            
            {/* Module Cards - Stack vertically below */}
            {!collapsedYears[year] && (
              <div className="modules-stack mt-4 space-y-3">
                {(modulesByYear[year] || []).map(module => (
                  <ModuleCard
                    key={module.id}
                    {...module}
                    onToggle={() => toggleModule(module.id)}
                    onCourseClick={handleCourseClick}
                    onModuleClick={() => handleModuleClick(module)}
                  />
                ))}
              </div>
            )}
            </div>
          );
        })}
      </div>
      
      {/* Side Panel */}
      {selectedModule && (
        <ModuleDetailPanel
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
          transferRules={transferRules || []}
          planId={userPlan?.id}
        />
      )}
    </div>
  );
}
