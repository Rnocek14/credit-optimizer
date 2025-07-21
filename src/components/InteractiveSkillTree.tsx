
import React, { useState, useEffect } from 'react';
import { SkillTreeCanvas } from './SkillTreeCanvas';
import { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';

export const InteractiveSkillTree = ({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  goalSkills = [],
  availableCategories,
  onSkillClick,
  showMinimap = true,
  layoutMode = 'hierarchy'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadStartTime] = useState(performance.now());

  // Track loading time and show skeleton if >500ms
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      if (skills && skills.length > 0 && filteredSkills && filteredSkills.length > 0) {
        const loadTime = performance.now() - loadStartTime;
        console.log(`[SkillTree] Initial load completed in ${loadTime.toFixed(2)}ms`);
        setIsLoading(false);
      }
    }, 500);

    // If data loads quickly, hide loading immediately
    if (skills && skills.length > 0 && filteredSkills && filteredSkills.length > 0) {
      const loadTime = performance.now() - loadStartTime;
      if (loadTime < 500) {
        console.log(`[SkillTree] Fast load completed in ${loadTime.toFixed(2)}ms`);
        setIsLoading(false);
      }
    }

    return () => clearTimeout(loadingTimer);
  }, [skills, filteredSkills, loadStartTime]);
  console.log('InteractiveSkillTree render:', {
    skillsCount: skills?.length || 0,
    filteredSkillsCount: filteredSkills?.length || 0,
    edgesCount: skillEdges?.length || 0,
    categoriesCount: availableCategories?.length || 0,
    isLoading
  });

  // Validate required props
  if (!skills || !Array.isArray(skills)) {
    console.error('InteractiveSkillTree: skills prop is required and must be an array');
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No skills data available</p>
      </div>
    );
  }

  if (!filteredSkills || !Array.isArray(filteredSkills)) {
    console.error('InteractiveSkillTree: filteredSkills prop is required and must be an array');
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No filtered skills available</p>
      </div>
    );
  }

  // Show loading skeleton if taking too long
  if (isLoading) {
    return <LoadingSkeleton nodeCount={skills.length} />;
  }

  return (
    <SkillTreeErrorBoundary>
      <SkillTreeCanvas
        skills={skills}
        userProgress={userProgress || []}
        skillEdges={skillEdges || []}
        filteredSkills={filteredSkills}
        recommendedSkills={recommendedSkills || []}
        goalSkills={goalSkills}
        availableCategories={availableCategories || []}
        onSkillClick={onSkillClick}
      />
    </SkillTreeErrorBoundary>
  );
};
