
import React, { useState, useEffect } from 'react';
import { SkillTreeCanvas } from './SkillTreeCanvas';
import { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { PivotRoadmapManager } from './PivotRoadmapManager';
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
  careerSteps = []
}: InteractiveSkillTreeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadStartTime] = useState(performance.now());
  const [pivotRoadmapSteps, setPivotRoadmapSteps] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    skills_needed?: string[];
    skills_already_have?: string[];
    estimated_time?: string;
    estimated_cost?: string;
    learning_resources?: any[];
    pivotSource: string;
  }>>([]);
  
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

  
  // Camera state for pivot overlay
  const [cameraState, setCameraState] = useState({
    skillPositions: new Map<string, { x: number; y: number }>(),
    pivotStepPositions: new Map<string, { x: number; y: number }>(),
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 }
  });

  // Handler to update camera state with proper typing
  const handleCameraStateChange = (state: {
    skillPositions: Map<string, { x: number; y: number }>;
    pivotStepPositions?: Map<string, { x: number; y: number }>;
    zoomLevel: number;
    panOffset: { x: number; y: number };
  }) => {
    setCameraState({
      skillPositions: state.skillPositions,
      pivotStepPositions: state.pivotStepPositions || new Map(),
      zoomLevel: state.zoomLevel,
      panOffset: state.panOffset
    });
  };
  
  // Enhanced skill click handler that can generate pivot paths
  const handleSkillClick = (skill: any) => {
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
  };

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
        <p className="text-yellow-800">No filtered skills available</p>
      </div>
    );
  }

  // Show loading skeleton only if actually loading
  if (isLoading && skills.length === 0) {
    return <LoadingSkeleton nodeCount={Math.min(skills.length || 12, 12)} />;
  }

  return (
    <SkillTreeErrorBoundary>
      <div className="relative">
        <SkillTreeCanvas
          skills={skills}
          userProgress={userProgress || []}
          skillEdges={skillEdges || []}
          filteredSkills={filteredSkills}
          recommendedSkills={recommendedSkills || []}
          goalSkills={goalSkills}
          checkpointSkills={checkpointSkills}
          capstoneSkillIds={capstoneSkillIds}
          availableCategories={availableCategories || []}
          onSkillClick={handleSkillClick}
          careerPathName={careerPathName}
          showPivotPaths={showPivotPaths}
          roadmapStepSkills={roadmapStepSkills}
          careerSteps={careerSteps}
          onCameraStateChange={handleCameraStateChange}
          activePivotPaths={activePivotPaths}
          pivotRoadmapSteps={pivotRoadmapSteps}
        />
        
        {/* Pivot Roadmap Manager */}
        <PivotRoadmapManager
          activePivotPaths={activePivotPaths}
          onRoadmapStepsGenerated={setPivotRoadmapSteps}
          visible={showPivotOverlay}
          onToggleVisibility={togglePivotOverlay}
        />
      </div>
    </SkillTreeErrorBoundary>
  );
});

InteractiveSkillTree.displayName = 'InteractiveSkillTree';
