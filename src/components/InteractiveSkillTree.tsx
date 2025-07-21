
import React from 'react';
import { SkillTreeCanvas } from './SkillTreeCanvas';
import { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary';

export const InteractiveSkillTree = ({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  availableCategories,
  onSkillClick,
  showMinimap = true,
  layoutMode = 'hierarchy'
}) => {
  console.log('InteractiveSkillTree render:', {
    skillsCount: skills?.length || 0,
    filteredSkillsCount: filteredSkills?.length || 0,
    edgesCount: skillEdges?.length || 0,
    categoriesCount: availableCategories?.length || 0
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

  return (
    <SkillTreeErrorBoundary>
      <SkillTreeCanvas
        skills={skills}
        userProgress={userProgress || []}
        skillEdges={skillEdges || []}
        filteredSkills={filteredSkills}
        recommendedSkills={recommendedSkills || []}
        availableCategories={availableCategories || []}
        onSkillClick={onSkillClick}
      />
    </SkillTreeErrorBoundary>
  );
};
