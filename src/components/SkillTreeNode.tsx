
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

  const progressPercentage = userProgress && skill.xp_value > 0 
    ? Math.min((userProgress.xp_earned / skill.xp_value) * 100, 100)
    : 0;

  return (
    <div
      className={`absolute bg-white border-2 shadow-lg rounded-lg p-3 text-xs transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105 ${statusRing}`}
      style={{
        left: position.x,
        top: position.y,
        borderColor: borderColor,
        borderRadius: 12,
        width: 120,
        height: 80,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Skill Name */}
      <div className="font-bold text-center mb-1 truncate text-gray-800" title={skill.name}>
        {skill.name}
      </div>
      
      {/* Level and Category */}
      <div className="text-center text-[10px] text-gray-600 mb-1">
        Level {skill.difficulty_level} • {skill.category}
      </div>
      
      {/* Course Badge */}
      {hasCourses && (
        <div className="text-center text-green-600 text-[10px] mb-1">
          📚 Resources
        </div>
      )}
      
      {/* Progress Bar and XP */}
      {userProgress && (
        <div className="text-center text-[10px]">
          <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-gray-700">
            {userProgress.xp_earned}/{skill.xp_value} XP
          </span>
        </div>
      )}
      
      {/* Recommendation Star */}
      {isRecommended && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-[8px]">⭐</span>
        </div>
      )}
      
      {/* Hover Tooltip */}
      {hovered && skill.description && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 max-w-xs">
          <div className="bg-gray-900 text-white text-xs rounded p-2 shadow-lg">
            {skill.description}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};
