
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen } from 'lucide-react';

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
  size?: 'small' | 'medium' | 'large';
  isHighlighted?: boolean;
  hasCourses?: boolean;
  prerequisiteSteps?: number;
  onHover?: (hovered: boolean) => void;
}

const categoryColors = {
  'Technical': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', icon: '🧠' },
  'Soft Skills': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', icon: '💡' },
  'Career': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', icon: '🎯' },
  'Tools': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', icon: '🛠️' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', icon: '📚' }
};

const statusColors = {
  'locked': 'opacity-50 cursor-not-allowed',
  'available': 'hover:shadow-lg hover:scale-105 cursor-pointer transition-all duration-300',
  'in_progress': 'ring-2 ring-blue-400 cursor-pointer animate-pulse',
  'completed': 'ring-2 ring-green-400 cursor-pointer shadow-lg'
};

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
  onHover
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const categoryData = categoryColors[skill.category as keyof typeof categoryColors] || categoryColors.default;
  const statusColor = statusColors[userProgress?.status || 'available'];
  const progressPercent = userProgress ? (userProgress.xp_earned / skill.xp_value) * 100 : 0;
  
  const sizeClasses = {
    small: 'w-16 h-14 text-xs min-h-[44px]', // Mobile responsive
    medium: 'w-24 h-20 text-sm min-h-[44px]',
    large: 'w-32 h-24 text-base min-h-[44px]'
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(false);
  };

  const tooltipContent = prerequisiteSteps 
    ? `${prerequisiteSteps} steps to unlock`
    : userProgress?.status === 'locked' 
      ? 'Complete prerequisites first'
      : hasCourses 
        ? 'Has learning resources available'
        : 'Click to view details';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              absolute transform -translate-x-1/2 -translate-y-1/2 
              ${sizeClasses[size]} 
              ${categoryData.bg} ${categoryData.border} ${categoryData.text}
              ${statusColor}
              border-2 rounded-lg p-2 transition-all duration-300
              flex flex-col items-center justify-center relative overflow-hidden
              ${isRecommended ? 'ring-2 ring-yellow-400 shadow-yellow-200/50 shadow-lg animate-pulse' : ''}
              ${isHighlighted ? 'ring-4 ring-primary shadow-xl scale-110 z-10' : ''}
              ${isHovered ? 'shadow-xl scale-105 z-20' : ''}
            `}
            style={{ 
              left: position.x, 
              top: position.y,
              textShadow: userProgress?.status === 'locked' ? 'none' : '0 0 4px rgba(0,0,0,0.3)'
            }}
            onClick={userProgress?.status !== 'locked' ? onClick : undefined}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Course indicator */}
            {hasCourses && (
              <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                <BookOpen className="h-2 w-2" />
              </div>
            )}

            {/* Skill Icon */}
            <div className="text-lg mb-1 drop-shadow-sm">
              {categoryData.icon}
            </div>
            
            <div className="font-semibold text-center leading-tight mb-1 line-clamp-2 relative z-10">
              {skill.name}
            </div>
            
            {userProgress && (
              <div className="w-full">
                <Progress 
                  value={progressPercent} 
                  className="h-2 mb-1 transition-all duration-500"
                />
                <div className="text-xs text-center font-medium">
                  {userProgress.xp_earned}/{skill.xp_value} XP
                </div>
              </div>
            )}
            
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-xs px-1 py-0">
                L{skill.difficulty_level}
              </Badge>
              {userProgress?.status === 'completed' && (
                <Badge variant="outline" className="text-xs px-1 py-0 bg-green-100 animate-bounce">
                  ✓
                </Badge>
              )}
            </div>

            {/* Unlock animation overlay */}
            {userProgress?.status === 'completed' && (
              <div className="absolute inset-0 bg-green-200/20 rounded-lg animate-ping" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
