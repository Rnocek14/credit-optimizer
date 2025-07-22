
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SkillTreeCanvas } from './SkillTreeCanvas';
import { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';

interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
  difficulty_level: number;
  xp_value: number;
  slug: string;
}

interface UserProgress {
  skill_id: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  xp_earned: number;
  cri_score?: number;
}

interface SkillEdge {
  skill_id: string;
  prerequisite_skill_id: string;
}

interface InteractiveSkillTreeProps {
  skills: Skill[];
  userProgress: UserProgress[];
  skillEdges: SkillEdge[];
  filteredSkills: Skill[];
  recommendedSkills: string[];
  goalSkills?: string[];
  checkpointSkills?: string[];
  availableCategories: string[];
  onSkillClick?: (skill: Skill) => void;
  showMinimap?: boolean;
  layoutMode?: string;
  careerPathName?: string;
  showPivotPaths?: boolean;
  selectedCareerPath?: any;
  careerPaths?: any[];
  getSkillClassification?: (skillId: string) => {
    isRequiredSkill?: boolean;
    isOptionalSkill?: boolean;
    isPivotSkill?: boolean;
  };
  onCareerPathSelect?: (pathId: string) => void;
}

export const InteractiveSkillTree = React.memo(({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  goalSkills = [],
  checkpointSkills = [],
  availableCategories,
  onSkillClick,
  showMinimap = true,
  layoutMode = 'hierarchy',
  careerPathName,
  showPivotPaths = false,
  selectedCareerPath,
  careerPaths = [],
  getSkillClassification,
  onCareerPathSelect
}: InteractiveSkillTreeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadStartTime] = useState(performance.now());
  
  // FIXED: Add ref guards to prevent infinite updates
  const hasSetLoadingFalse = useRef(false);
  const renderCount = useRef(0);
  
  // Track render cycles for debugging
  renderCount.current += 1;
  
  // FIXED: Stabilize validation with better memoization - avoid array length dependencies
  const hasValidData = useMemo(() => {
    const hasSkills = skills && skills.length > 0;
    const hasFilteredSkills = filteredSkills && filteredSkills.length > 0;
    const hasUserProgress = userProgress && Array.isArray(userProgress);
    const hasEdges = skillEdges && Array.isArray(skillEdges);
    const hasCategories = availableCategories && Array.isArray(availableCategories);

    const isComplete = hasSkills && hasFilteredSkills && hasUserProgress && hasEdges;
    
    console.log(`[InteractiveSkillTree] Render #${renderCount.current} - Data validation:`, {
      hasSkills,
      hasFilteredSkills,
      hasUserProgress,
      hasEdges,
      hasCategories,
      isComplete,
      skillsCount: skills?.length || 0,
      filteredCount: filteredSkills?.length || 0
    });

    return {
      hasSkills,
      hasFilteredSkills,
      hasUserProgress,
      hasEdges,
      hasCategories,
      isComplete
    };
  }, [
    skills?.length > 0, // Use boolean instead of length
    filteredSkills?.length > 0, // Use boolean instead of length
    !!userProgress, // Use boolean
    !!skillEdges, // Use boolean
    !!availableCategories // Use boolean
  ]);

  // FIXED: Improved loading logic with ref guard to prevent infinite updates
  useEffect(() => {
    console.log(`[InteractiveSkillTree] useEffect triggered - isComplete: ${hasValidData.isComplete}, hasSetLoadingFalse: ${hasSetLoadingFalse.current}`);
    
    if (hasValidData.isComplete && !hasSetLoadingFalse.current) {
      hasSetLoadingFalse.current = true;
      const loadTime = performance.now() - loadStartTime;
      console.log(`[SkillTree] Load completed in ${loadTime.toFixed(2)}ms`);
      
      // FIXED: Add guard to prevent unnecessary state update
      setIsLoading(currentLoading => {
        if (currentLoading === false) {
          console.log('[InteractiveSkillTree] Prevented unnecessary setIsLoading(false) call');
          return currentLoading;
        }
        console.log('[InteractiveSkillTree] Setting isLoading to false');
        return false;
      });
    }
  }, [hasValidData.isComplete, loadStartTime]); // FIXED: Only depend on stable values

  console.log(`[InteractiveSkillTree] Render #${renderCount.current}:`, {
    skillsCount: skills?.length || 0,
    filteredSkillsCount: filteredSkills?.length || 0,
    edgesCount: skillEdges?.length || 0,
    categoriesCount: availableCategories?.length || 0,
    userProgressCount: userProgress?.length || 0,
    isLoading,
    hasValidData,
    hasSetLoadingFalse: hasSetLoadingFalse.current
  });

  // Validate required props with better error messages
  if (!hasValidData.hasSkills) {
    console.error('InteractiveSkillTree: skills prop is required and must be an array');
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No skills data available</p>
      </div>
    );
  }

  if (!hasValidData.hasFilteredSkills) {
    console.error('InteractiveSkillTree: filteredSkills prop is required and must be an array');
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No filtered skills available</p>
      </div>
    );
  }

  if (!hasValidData.hasUserProgress) {
    console.error('InteractiveSkillTree: userProgress prop is required and must be an array');
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No user progress data available</p>
      </div>
    );
  }

  // Show loading skeleton only when actually loading or data is incomplete
  if (isLoading || !hasValidData.isComplete) {
    console.log('[InteractiveSkillTree] Showing loading skeleton');
    return <LoadingSkeleton nodeCount={Math.min(skills.length || 12, 12)} />;
  }

  // Stable props for SkillTreeCanvas
  const stableSkillTreeProps = useMemo(() => ({
    skills,
    userProgress,
    skillEdges,
    filteredSkills,
    recommendedSkills,
    goalSkills,
    checkpointSkills,
    availableCategories,
    onSkillClick,
    careerPathName,
    showPivotPaths,
    selectedCareerPath,
    careerPaths,
    getSkillClassification,
    onCareerPathSelect
  }), [
    skills,
    userProgress,
    skillEdges,
    filteredSkills,
    recommendedSkills,
    goalSkills,
    checkpointSkills,
    availableCategories,
    onSkillClick,
    careerPathName,
    showPivotPaths,
    selectedCareerPath,
    careerPaths,
    getSkillClassification,
    onCareerPathSelect
  ]);

  console.log('[InteractiveSkillTree] Rendering SkillTreeCanvas');
  
  return (
    <SkillTreeErrorBoundary>
      <SkillTreeCanvas {...stableSkillTreeProps} />
    </SkillTreeErrorBoundary>
  );
});

InteractiveSkillTree.displayName = 'InteractiveSkillTree';
