import React from 'react';
import { SkillTreeRenderer } from './SkillTree/SkillTreeRenderer';

interface SkillTreeCanvasProps {
  skills: Array<{
    id: string;
    name: string;
    category: string;
    xp_value: number;
    difficulty_level: number;
    description?: string;
    slug: string;
  }>;
  capstoneSkillIds?: string[];
  userProgress: Array<{
    skill_id: string;
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    xp_earned: number;
    cri_score?: number;
  }>;
  skillEdges: Array<{
    prerequisite_skill_id: string;
    skill_id: string;
  }>;
  filteredSkills: any[];
  recommendedSkills: string[];
  goalSkills?: string[];
  checkpointSkills?: string[];
  availableCategories: string[];
  onSkillClick: (skill: any) => void;
  skillsWithCourses?: string[];
  careerPathName?: string;
  showPivotPaths?: boolean;
  roadmapStepSkills?: any[];
  careerSteps?: Array<{
    id: string;
    title: string;
    level: number;
    prerequisites?: string[];
    is_checkpoint?: boolean;
    is_capstone?: boolean;
    is_terminal?: boolean;
    estimated_duration?: string;
    completed?: boolean;
  }>;
  onCameraStateChange?: (state: {
    skillPositions: Map<string, { x: number; y: number }>;
    zoomLevel: number;
    panOffset: { x: number; y: number };
  }) => void;
}

export const SkillTreeCanvas: React.FC<SkillTreeCanvasProps> = ({
  onSkillClick,
  onCameraStateChange,
  ...props
}) => {
  return (
    <SkillTreeRenderer
      onSkillClick={onSkillClick}
      onCameraStateChange={onCameraStateChange}
      showMinimap={true}
    />
  );
};