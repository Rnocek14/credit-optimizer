import { useState, useMemo } from 'react';
import { YearCard } from './components/YearCard';
import { ModuleCard } from './components/ModuleCard';
import canonicalCourses from '@/fixtures/prereqs/canonical-courses.json';
import requirements from '@/fixtures/requirements/cs-degree-requirements.json';
import { ModuleData, Course, Requirement, LoadHealth } from './types/v5';
import './styles/v5.css';

export default function EduTreeV5Page() {
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

  // Get modules for a specific year
  const getModulesForYear = useMemo(() => {
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

  return (
    <div className="w-full min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">EduTree V5 - Year Spine + Modules</h1>
        <p className="text-sm text-muted-foreground">Click years to show modules, click modules to show courses</p>
        <div className="text-xs text-muted-foreground mt-2">
          Collapsed Years: {Object.entries(collapsedYears).filter(([_, v]) => v).map(([k]) => `Year ${k}`).join(', ') || 'none'}
        </div>
      </div>
      
      {/* Grid Layout: 4 columns for 4 years */}
      <div className="year-spine-grid grid grid-cols-4 gap-6 items-start">
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
