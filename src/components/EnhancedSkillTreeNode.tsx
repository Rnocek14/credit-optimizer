
import React, { memo, useRef, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Progress } from './ui/progress';

interface EnhancedSkillTreeNodeProps {
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
  hasCourses?: boolean;
  size?: 'small' | 'medium' | 'large';
  isInPath?: boolean;
  onHover?: (isHovering: boolean) => void;
  careerPathName?: string;
  onPositionUpdate?: (skillId: string, position: {centerX: number, centerY: number}) => void;
}

export const EnhancedSkillTreeNode: React.FC<EnhancedSkillTreeNodeProps> = memo(({
  skill,
  userProgress,
  position,
  onClick,
  categoryColor,
  isRecommended = false,
  isGoalSkill = false,
  isCheckpoint = false,
  hasCourses = false,
  size = 'medium',
  isInPath = false,
  onHover,
  careerPathName,
  onPositionUpdate
}) => {
  const status = userProgress?.status || 'locked';
  const progressPercentage = userProgress ? (userProgress.xp_earned / skill.xp_value) * 100 : 0;
  const nodeRef = useRef<HTMLDivElement>(null);

  // Report real DOM position to parent
  useEffect(() => {
    if (nodeRef.current && onPositionUpdate) {
      const rect = nodeRef.current.getBoundingClientRect();
      onPositionUpdate(skill.id, {
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
    }
  }, [position, skill.id, onPositionUpdate]);

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

  // Enhanced animation classes with proper CSS animations
  const getAnimationClasses = () => {
    let classes = 'transition-all duration-300 ease-in-out';
    
    if (isGoalSkill) {
      classes += ' skill-goal-glow animate-pulse';
    }
    if (isCheckpoint) {
      classes += ' checkpoint-pulse';
    }
    if (isInPath) {
      classes += ' skill-path-pulse';
    }
    if (isRecommended) {
      classes += ' recommended-glow';
    }
    
    return classes;
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'text-green-600';
    if (level <= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusRing = () => {
    switch (status) {
      case 'completed':
        return 'ring-2 ring-green-500 ring-opacity-75';
      case 'in_progress':
        return 'ring-2 ring-orange-500 ring-opacity-75';
      case 'available':
        return 'ring-1 ring-blue-400 ring-opacity-50';
      default:
        return '';
    }
  };

  return (
    <>
      <style>{`
        .skill-goal-glow {
          animation: goal-glow 2s ease-in-out infinite;
        }
        
        .checkpoint-pulse {
          animation: checkpoint-highlight 1.5s ease-in-out infinite;
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.6);
        }
        
        .skill-path-pulse {
          animation: skill-path-pulse 1.5s ease-in-out infinite;
        }
        
        .recommended-glow {
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }
        
        @keyframes goal-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.4);
          }
        }
        
        @keyframes checkpoint-highlight {
          0%, 100% {
            box-shadow: 0 0 15px rgba(236, 72, 153, 0.6);
          }
          50% {
            box-shadow: 0 0 25px rgba(236, 72, 153, 0.9);
          }
        }
        
        @keyframes skill-path-pulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 16px rgba(59, 130, 246, 0.6);
          }
        }
      `}</style>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={nodeRef}
              className={`
                absolute cursor-pointer rounded-lg border-2 flex flex-col items-center justify-center
                font-medium text-center p-2 hover:scale-105 hover:shadow-lg
                ${sizeClasses[size]}
                ${statusColors[status]}
                ${getAnimationClasses()}
                ${getStatusRing()}
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
            >
              {/* Skill Name */}
              <div className="font-semibold leading-tight text-center mb-1">
                {skill.name}
              </div>
              
              {/* Category (if space allows) */}
              {size !== 'small' && (
                <div className="text-xs opacity-75 mb-1">{skill.category}</div>
              )}
              
              {/* Progress Bar for in-progress skills */}
              {status === 'in_progress' && size !== 'small' && (
                <div className="w-full px-1 mb-1">
                  <Progress value={progressPercentage} className="h-1" />
                </div>
              )}
              
              {/* XP Value */}
              {size !== 'small' && (
                <div className="text-xs font-medium opacity-80">
                  {userProgress?.xp_earned || 0}/{skill.xp_value} XP
                </div>
              )}
              
              {/* Status indicators */}
              <div className="absolute -top-1 -right-1 flex gap-1">
                {isGoalSkill && (
                  <span className="w-3 h-3 bg-blue-500 rounded-full border border-white flex items-center justify-center text-[8px]" title="🎯">
                    🎯
                  </span>
                )}
                {isCheckpoint && (
                  <span className="w-3 h-3 bg-pink-500 rounded-full border border-white flex items-center justify-center text-[8px]" title="⭐">
                    ⭐
                  </span>
                )}
                {hasCourses && (
                  <span className="w-3 h-3 bg-green-500 rounded-full border border-white flex items-center justify-center text-[8px]" title="📚">
                    📚
                  </span>
                )}
                {isRecommended && (
                  <span className="w-3 h-3 bg-yellow-500 rounded-full border border-white flex items-center justify-center text-[8px]" title="⭐">
                    ⭐
                  </span>
                )}
              </div>
              
              {/* Difficulty indicator */}
              <div className="absolute -bottom-1 -left-1">
                <div className={`text-xs font-bold ${getDifficultyColor(skill.difficulty_level)}`}>
                  {'●'.repeat(skill.difficulty_level)}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          
          <TooltipContent className="max-w-sm p-4 bg-white border shadow-lg">
            <div className="space-y-2">
              <div className="font-semibold text-lg">{skill.name}</div>
              <div className="text-sm text-gray-600">{skill.category}</div>
              
              {skill.description && (
                <div className="text-sm">{skill.description}</div>
              )}
              
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <span className="capitalize font-medium">{status.replace('_', ' ')}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Difficulty:</span>
                  <span className={`font-medium ${getDifficultyColor(skill.difficulty_level)}`}>
                    Level {skill.difficulty_level}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>XP Value:</span>
                  <span className="font-medium">{skill.xp_value}</span>
                </div>
                
                {userProgress && (
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span className="font-medium">
                      {userProgress.xp_earned}/{skill.xp_value} XP ({Math.round(progressPercentage)}%)
                    </span>
                  </div>
                )}
                
                {careerPathName && (isGoalSkill || isCheckpoint) && (
                  <div className="text-xs text-blue-600 mt-2">
                    Part of {careerPathName} path
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
});

EnhancedSkillTreeNode.displayName = 'EnhancedSkillTreeNode';
