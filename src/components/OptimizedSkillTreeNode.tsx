
import React, { memo } from 'react';

interface OptimizedSkillTreeNodeProps {
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
  };
  position: { x: number; y: number };
  onClick: () => void;
  categoryColor: string;
  isRecommended?: boolean;
  isGoalSkill?: boolean;
  isCheckpoint?: boolean;
  isCapstone?: boolean;
  hasCourses?: boolean;
  size?: 'small' | 'medium' | 'large';
  isInPath?: boolean;
  onHover?: (isHovering: boolean) => void;
  careerPathName?: string;
}

export const OptimizedSkillTreeNode: React.FC<OptimizedSkillTreeNodeProps> = memo(({
  skill,
  userProgress,
  position,
  onClick,
  categoryColor,
  isRecommended = false,
  isGoalSkill = false,
  isCheckpoint = false,
  isCapstone = false,
  hasCourses = false,
  size = 'medium',
  isInPath = false,
  onHover,
  careerPathName
}) => {
  const status = userProgress?.status || 'locked';
  
  // Optimized animation classes - use subtle glow instead of aggressive pulse
  const getAnimationClasses = () => {
    if (isCapstone) {
      return 'capstone-glow'; // Special glow for capstone skill
    }
    if (isGoalSkill) {
      return 'goal-skill-glow'; // Custom CSS animation defined below
    }
    if (isCheckpoint) {
      return 'checkpoint-highlight';
    }
    return '';
  };

  const sizeClasses = {
    small: 'w-16 h-16 text-xs',
    medium: 'w-20 h-20 text-sm',
    large: 'w-24 h-24 text-base'
  };

  const statusColors = {
    locked: 'bg-gray-200 border-gray-300 text-gray-500',
    available: 'bg-white border-blue-300 text-blue-900 hover:bg-blue-50',
    in_progress: 'bg-orange-100 border-orange-400 text-orange-900',
    completed: 'bg-green-100 border-green-400 text-green-900'
  };

  return (
    <>
<style>{`
        .goal-skill-glow {
          animation: subtle-glow 3s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
        }
        
        .capstone-glow {
          animation: capstone-glow 3s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
          border-color: gold !important;
          border-width: 2px;
        }
        
        .checkpoint-highlight {
          box-shadow: 0 0 12px rgba(236, 72, 153, 0.4);
          border-width: 2px;
        }
        
        @keyframes subtle-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 16px rgba(59, 130, 246, 0.5);
          }
        }
        
        @keyframes capstone-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 16px rgba(255, 215, 0, 0.8);
          }
        }
      `}</style>
      
      <div
        className={`
          absolute cursor-pointer rounded-lg border-2 flex items-center justify-center
          transition-all duration-200 font-medium text-center p-2
          ${sizeClasses[size]}
          ${statusColors[status]}
          ${getAnimationClasses()}
          ${isInPath ? 'ring-2 ring-purple-400 ring-opacity-75' : ''}
          ${isRecommended ? 'ring-2 ring-yellow-400' : ''}
        `}
        style={{
          left: position.x,
          top: position.y,
          borderColor: isInPath ? '#a855f7' : categoryColor,
        }}
        onClick={onClick}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        title={`${skill.name} (${skill.category})\nStatus: ${status}\nXP: ${skill.xp_value}`}
      >
        <div className="text-center leading-tight">
          <div className="font-semibold">{skill.name}</div>
          {size !== 'small' && (
            <div className="text-xs opacity-75 mt-1">{skill.category}</div>
          )}
        </div>
        
        {/* Status indicators */}
        <div className="absolute -top-1 -right-1 flex gap-1">
          {isCapstone && (
            <span className="w-4 h-4 flex items-center justify-center bg-yellow-400 rounded-full border border-white" title="Capstone Skill">
              👑
            </span>
          )}
          {isGoalSkill && (
            <span className="w-3 h-3 bg-blue-500 rounded-full border border-white" title="Goal Skill" />
          )}
          {isCheckpoint && (
            <span className="w-3 h-3 bg-pink-500 rounded-full border border-white" title="Checkpoint" />
          )}
          {hasCourses && (
            <span className="w-3 h-3 bg-green-500 rounded-full border border-white" title="Has Courses" />
          )}
        </div>
      </div>
    </>
  );
});

OptimizedSkillTreeNode.displayName = 'OptimizedSkillTreeNode';
