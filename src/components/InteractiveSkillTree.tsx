
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
  showPivotPaths = false
}: InteractiveSkillTreeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadStartTime] = useState(performance.now());

  // Simplified loading logic with better performance tracking
  useEffect(() => {
    if (skills && skills.length > 0 && filteredSkills && filteredSkills.length > 0) {
      const loadTime = performance.now() - loadStartTime;
      console.log(`[SkillTree] Enhanced load completed in ${loadTime.toFixed(2)}ms`);
      console.log(`[SkillTree] Rendered ${filteredSkills.length} skills with full animations`);
      setIsLoading(false);
    }
  }, [skills?.length, filteredSkills?.length, loadStartTime]);

  console.log('InteractiveSkillTree Enhanced render:', {
    skillsCount: skills?.length || 0,
    filteredSkillsCount: filteredSkills?.length || 0,
    edgesCount: skillEdges?.length || 0,
    categoriesCount: availableCategories?.length || 0,
    goalSkillsCount: goalSkills?.length || 0,
    checkpointSkillsCount: checkpointSkills?.length || 0,
    isLoading,
    hasAnimations: true
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

  // Show enhanced loading skeleton
  if (isLoading && skills.length === 0) {
    return <LoadingSkeleton nodeCount={Math.min(skills.length || 12, 12)} />;
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
        checkpointSkills={checkpointSkills}
        availableCategories={availableCategories || []}
        onSkillClick={onSkillClick}
        careerPathName={careerPathName}
        showPivotPaths={showPivotPaths}
      />
    </SkillTreeErrorBoundary>
  );
});

InteractiveSkillTree.displayName = 'InteractiveSkillTree';
