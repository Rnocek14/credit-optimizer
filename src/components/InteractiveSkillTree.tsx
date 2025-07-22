
import React, { useState, useEffect } from 'react';
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

  // Improved loading logic with better validation
  useEffect(() => {
    const hasSkills = skills && skills.length > 0;
    const hasFilteredSkills = filteredSkills && filteredSkills.length > 0;
    const hasUserProgress = userProgress && Array.isArray(userProgress);
    const hasEdges = skillEdges && Array.isArray(skillEdges);
    const hasCategories = availableCategories && Array.isArray(availableCategories);

    if (hasSkills && hasFilteredSkills && hasUserProgress && hasEdges && hasCategories) {
      const loadTime = performance.now() - loadStartTime;
      console.log(`[SkillTree] Load completed in ${loadTime.toFixed(2)}ms`);
      console.log('[SkillTree] Data validation:', {
        skillsCount: skills.length,
        filteredSkillsCount: filteredSkills.length,
        userProgressCount: userProgress.length,
        edgesCount: skillEdges.length,
        categoriesCount: availableCategories.length
      });
      setIsLoading(false);
    }
  }, [skills.length, filteredSkills.length, userProgress.length, skillEdges.length, availableCategories.length, loadStartTime]);

  console.log('InteractiveSkillTree render:', {
    skillsCount: skills?.length || 0,
    filteredSkillsCount: filteredSkills?.length || 0,
    edgesCount: skillEdges?.length || 0,
    categoriesCount: availableCategories?.length || 0,
    userProgressCount: userProgress?.length || 0,
    isLoading
  });

  // Validate required props with better error messages
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

  if (!userProgress || !Array.isArray(userProgress)) {
    console.error('InteractiveSkillTree: userProgress prop is required and must be an array');
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No user progress data available</p>
      </div>
    );
  }

  // Show loading skeleton only when actually loading or data is incomplete
  if (isLoading || skills.length === 0 || filteredSkills.length === 0) {
    return <LoadingSkeleton nodeCount={Math.min(skills.length || 12, 12)} />;
  }

  return (
    <SkillTreeErrorBoundary>
      <SkillTreeCanvas
        skills={skills}
        userProgress={userProgress}
        skillEdges={skillEdges}
        filteredSkills={filteredSkills}
        recommendedSkills={recommendedSkills}
        goalSkills={goalSkills}
        checkpointSkills={checkpointSkills}
        availableCategories={availableCategories}
        onSkillClick={onSkillClick}
        careerPathName={careerPathName}
        showPivotPaths={showPivotPaths}
        selectedCareerPath={selectedCareerPath}
        careerPaths={careerPaths}
        getSkillClassification={getSkillClassification}
        onCareerPathSelect={onCareerPathSelect}
      />
    </SkillTreeErrorBoundary>
  );
});

InteractiveSkillTree.displayName = 'InteractiveSkillTree';
