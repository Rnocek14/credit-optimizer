import { useState, useMemo, useCallback } from 'react';
import { YearCard } from './components/YearCard';
import { ModuleCard } from './components/ModuleCard';
import { DegreeNode } from './components/DegreeNode';
import canonicalCourses from '@/fixtures/prereqs/canonical-courses.json';
import requirements from '@/fixtures/requirements/cs-degree-requirements.json';
import { ModuleData, Course, Requirement, LoadHealth, DegreeSummary } from './types/v5';
import { useV5DatabaseData } from './hooks/useV5DatabaseData';
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

  // Initialize from localStorage (SSR-safe)
  const [degreeCollapsed, setDegreeCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('v5.degreeCollapsed') === 'true';
  });
  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  
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
  const getModulesForYear = useCallback((year: number): ModuleData[] => {
    if (USE_DATABASE && dbData?.modulesByYear) {
      const modules = dbData.modulesByYear[year] || [];
      console.log(`[V5] Year ${year}`, modules.map(m => ({
        id: m.id, 
        label: m.label,
        optionsCount: m.optionsCount,
        optionsLen: m.marketplaceOptions?.length
      })));
      return modules;
    }
    return getModulesForYearFixtures(year);
  }, [USE_DATABASE, dbData, getModulesForYearFixtures]);

  // Calculate total credits for a year
  const getYearCredits = (year: number): number => {
    const yearCourseIds = coursesByYear[year] || [];
    return yearCourseIds.reduce((sum, id) => {
      const course = getCourseDetails(id);
      return sum + (course?.credits || 0);
    }, 0);
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
    const modules = getModulesForYear(year);
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
    const totalPlanned = allYears.reduce((sum, y) => sum + getYearCredits(y), 0);
    const totalEarned = getTotalEarnedCredits();
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
  }, [collapsedModules]);

  // Toggle degree with localStorage persistence (memoized for React.memo optimization)
  const toggleDegree = useCallback(() => {
    const next = !degreeCollapsed;
    setDegreeCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('v5.degreeCollapsed', String(next));
    }
  }, [degreeCollapsed]);

  return (
    <div className="w-full min-h-screen bg-background p-8">
      {/* Dev mode toggle - always visible for testing */}
      <button
        onClick={handleToggleMode}
        className="fixed bottom-4 right-4 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors z-50"
        title="Toggle between database and fixture data"
      >
        {USE_DATABASE ? '🗄️ Database' : '🧪 Fixtures'}
      </button>

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
        <h1 className="text-2xl font-bold">EduTree V5 - Year Spine + Modules</h1>
        <p className="text-sm text-muted-foreground">
          Click degree node or years to collapse/expand
          {USE_DATABASE && <span className="ml-2 text-primary">• Database Mode</span>}
        </p>
      </div>
      
      {/* Degree Node */}
      {/* Degree Node */}
      {ENABLE_DEGREE_NODE && (
        <div className="mb-6">
          <DegreeNode
            {...degreeSummary}
            isCollapsed={degreeCollapsed}
            onToggle={toggleDegree}
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
                {getModulesForYear(year).map(module => (
                  <ModuleCard
                    key={module.id}
                    {...module}
                    onToggle={() => toggleModule(module.id)}
                    onCourseClick={handleCourseClick}
                  />
                ))}
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
