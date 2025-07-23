import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SkillTreeCanvas } from './SkillTreeCanvas';
import { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { PivotFlowManager } from './pivot/PivotFlowManager';
import { usePivotRoadmaps } from '@/hooks/usePivotRoadmaps';

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

interface RoadmapStepSkill {
  skill_id: string;
  roadmap_step_id: string;
  roadmap_steps: {
    title: string;
    order_index: number;
    is_checkpoint: boolean;
    is_capstone: boolean;
  };
}

interface InteractiveSkillTreeProps {
  skills: Skill[];
  userProgress: UserProgress[];
  skillEdges: SkillEdge[];
  filteredSkills: Skill[];
  recommendedSkills: string[];
  goalSkills?: string[];
  checkpointSkills?: string[];
  capstoneSkillIds?: string[];
  availableCategories: string[];
  onSkillClick?: (skill: Skill) => void;
  showMinimap?: boolean;
  layoutMode?: string;
  careerPathName?: string;
  showPivotPaths?: boolean;
  roadmapStepSkills?: RoadmapStepSkill[];
  careerSteps?: Array<{
    id: string;
    title: string;
    level: number;
    is_checkpoint?: boolean;
    is_capstone?: boolean;
    is_terminal?: boolean;
    estimated_duration?: string;
    completed?: boolean;
  }>;
  focusMode?: boolean;
  skillsWithCourses?: string[];
}

export const InteractiveSkillTree = React.memo(({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  goalSkills = [],
  checkpointSkills = [],
  capstoneSkillIds = [],
  availableCategories,
  onSkillClick,
  showMinimap = true,
  layoutMode = 'hierarchy',
  careerPathName,
  showPivotPaths = false,
  roadmapStepSkills = [],
  careerSteps = [],
  focusMode = false,
  skillsWithCourses = []
}: InteractiveSkillTreeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadStartTime] = useState(performance.now());
  
  // Pivot roadmap management
  const {
    activePivotPaths,
    showPivotOverlay,
    addPivotPath,
    removePivotPath,
    clearAllPivotPaths,
    togglePivotOverlay,
    generateMockPivotFromSkill
  } = usePivotRoadmaps(showPivotPaths);

  console.log('🔍 InteractiveSkillTree DEBUG:', {
    showPivotPaths,
    showPivotOverlay,
    activePivotPathsCount: activePivotPaths.length,
    activePivotPaths
  });

  // Camera state for skill tree
  const [cameraState, setCameraState] = useState({
    skillPositions: new Map<string, { x: number; y: number }>(),
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 }
  });

  // Handler to update camera state
  const handleCameraStateChange = useCallback((state: {
    skillPositions: Map<string, { x: number; y: number }>;
    zoomLevel: number;
    panOffset: { x: number; y: number };
  }) => {
    setCameraState({
      skillPositions: state.skillPositions,
      zoomLevel: state.zoomLevel,
      panOffset: state.panOffset
    });
  }, []);
   
  // Enhanced skill click handler that can generate pivot paths
  const handleSkillClick = useCallback((skill: Skill) => {
    // Call original handler
    if (onSkillClick) {
      onSkillClick(skill);
    }
    
    // Generate mock pivot path for demonstration
    if (showPivotPaths || showPivotOverlay) {
      console.log(`🎯 Generating pivot path for skill: ${skill.name}`);
      const mockPivot = generateMockPivotFromSkill(skill.name);
      addPivotPath(mockPivot);
    }
  }, [onSkillClick, showPivotPaths, showPivotOverlay, generateMockPivotFromSkill, addPivotPath]);

  // Simplified loading logic to prevent rapid state changes
  useEffect(() => {
    if (skills && skills.length > 0 && filteredSkills && filteredSkills.length > 0) {
      const loadTime = performance.now() - loadStartTime;
      console.log(`[SkillTree] Load completed in ${loadTime.toFixed(2)}ms`);
      setIsLoading(false);
    }
  }, [skills?.length, filteredSkills?.length, loadStartTime]);

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
        <p className="text-yellow-800">No filtered skills data available</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <SkillTreeErrorBoundary>
        <SkillTreeCanvas
          skills={skills}
          filteredSkills={filteredSkills}
          skillEdges={skillEdges}
          userProgress={userProgress}
          recommendedSkills={recommendedSkills}
          skillsWithCourses={skillsWithCourses}
          onSkillClick={handleSkillClick}
          availableCategories={availableCategories}
          goalSkills={goalSkills}
          capstoneSkillIds={capstoneSkillIds}
          checkpointSkills={checkpointSkills}
          showPivotPaths={showPivotPaths}
          roadmapStepSkills={roadmapStepSkills}
          careerSteps={careerSteps}
          onCameraStateChange={handleCameraStateChange}
        />
      </SkillTreeErrorBoundary>

      {/* React Flow-based Pivot Roadmap Manager */}
      {showPivotPaths && (
        <div className="bg-red-100 border-2 border-red-500 p-4 rounded">
          <p className="text-red-800 font-bold">DEBUG: PivotFlowManager should render here</p>
          <p>showPivotPaths: {String(showPivotPaths)}</p>
          <p>showPivotOverlay: {String(showPivotOverlay)}</p>
          <p>activePivotPaths: {activePivotPaths.length}</p>
          <PivotFlowManager
            activePivotPaths={activePivotPaths}
            visible={showPivotOverlay}
            onToggleVisibility={togglePivotOverlay}
            className="mt-6"
          />
        </div>
      )}
    </div>
  );
});

InteractiveSkillTree.displayName = 'InteractiveSkillTree';