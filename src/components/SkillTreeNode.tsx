
import React, { useState } from 'react';

interface SkillTreeNodeProps {
  skill: {
    id: string;
    name: string;
    category: string;
    xp_value: number;
    difficulty_level: number;
    description?: string;
  };
  userProgress?: {
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    xp_earned: number;
    cri_score?: number;
  };
  position: { x: number; y: number };
  onClick: () => void;
  isRecommended?: boolean;
  size?: 'small' | 'medium';
  isHighlighted?: boolean;
  hasCourses?: boolean;
  prerequisiteSteps?: number;
  onHover?: (hovered: boolean) => void;
  categoryColor?: string;
}

export const SkillTreeNode: React.FC<SkillTreeNodeProps> = ({
  skill,
  userProgress,
  position,
  onClick,
  isRecommended = false,
  size = 'medium',
  isHighlighted = false,
  hasCourses = false,
  prerequisiteSteps,
  onHover,
  categoryColor = '#ccc'
}) => {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
    onHover?.(true);
  };
  const handleMouseLeave = () => {
    setHovered(false);
    onHover?.(false);
  };

  const borderColor = categoryColor;
  const statusRing = userProgress?.status === 'completed'
    ? 'ring-2 ring-green-400'
    : userProgress?.status === 'in_progress'
    ? 'ring-2 ring-blue-400'
    : '';

  return (
    <div
      className={`absolute bg-white border-2 shadow rounded p-2 text-xs transition-all duration-200 cursor-pointer ${statusRing}`}
      style={{
        left: position.x,
        top: position.y,
        borderColor: borderColor,
        borderRadius: 8,
        width: 100,
        height: 80,
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="font-bold truncate">{skill.name}</div>
      <div className="text-[10px] text-gray-600">L{skill.difficulty_level}</div>
      {hasCourses && <div className="text-green-500 text-[10px]">📘 Courses</div>}
      {userProgress && (
        <div className="text-[10px] mt-1">
          XP: {userProgress.xp_earned}/{skill.xp_value}
        </div>
      )}
    </div>
  );
};
