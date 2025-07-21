
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
  categoryColor?: string;
}

const categoryColors = {
  'API': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', icon: '🔌' },
  'Backend': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', icon: '⚙️' },
  'Cloud': { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-800', icon: '☁️' },
  'Design': { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', icon: '🎨' },
  'DevOps': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', icon: '🔧' },
  'Framework': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', icon: '🏗️' },
  'Markup': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', icon: '📝' },
  'Programming': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', icon: '💻' },
  'Quality': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', icon: '✅' },
  'Styling': { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', icon: '💄' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', icon: '📚' }
};

const statusColors = {
  'locked': 'opacity-50 cursor-not-allowed',
  'available': 'hover:shadow-lg hover:scale-105 cursor-pointer transition-all duration-300',
  'in_progress': 'ring-2 ring-blue-400 cursor-pointer',
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
  onHover,
  categoryColor
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const categoryData = categoryColors[skill.category as keyof typeof categoryColors] || categoryColors.default;
  const statusColor = statusColors[userProgress?.status || 'available'];
  const progressPercent = userProgress ? (userProgress.xp_earned / skill.xp_value) * 100 : 0;
  
  // Use categoryColor prop for border if provided, otherwise fall back to category mapping
  const borderStyle = categoryColor 
    ? { borderColor: categoryColor, borderWidth: '2px', borderStyle: 'solid' }
    : {};
  
  const sizeClasses = {
    small: 'w-20 h-16 text-xs',
    medium: 'w-24 h-20 text-sm',
    large: 'w-32 h-24 text-base'
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag when clicking on skill
    if (userProgress?.status !== 'locked') {
      onClick();
    }
  };

  const tooltipContent = prerequisiteSteps 
    ? `${prerequisiteSteps} prerequisites needed`
    : userProgress?.status === 'locked' 
      ? 'Complete prerequisites first'
      : hasCourses 
        ? 'Learning resources available'
        : 'Click to view details';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              absolute
              ${sizeClasses[size]} 
              ${categoryData.bg} ${categoryData.border} ${categoryData.text}
              ${statusColor}
              border-2 rounded-lg p-2 transition-all duration-300
              flex flex-col items-center justify-center relative overflow-hidden select-none
              ${isRecommended ? 'ring-2 ring-yellow-400 shadow-yellow-200/50 shadow-lg' : ''}
              ${isHighlighted ? 'ring-4 ring-primary shadow-xl scale-110 z-10' : ''}
              ${isHovered ? 'shadow-xl scale-105 z-20' : ''}
            `}
            style={{ 
              left: position.x, 
              top: position.y,
              pointerEvents: 'auto',
              ...borderStyle
            }}
            onClick={handleClick}
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
            <div className="text-base mb-1">
              {categoryData.icon}
            </div>
            
            {/* Skill Name */}
            <div className="font-semibold text-center leading-tight mb-1 line-clamp-2">
              {skill.name}
            </div>
            
            {/* Progress Bar */}
            {userProgress && (
              <div className="w-full px-1">
                <Progress 
                  value={progressPercent} 
                  className="h-1 mb-1"
                />
                <div className="text-xs text-center font-medium">
                  {userProgress.xp_earned}/{skill.xp_value} XP
                </div>
              </div>
            )}
            
            {/* Badges */}
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-xs px-1 py-0">
                L{skill.difficulty_level}
              </Badge>
              {userProgress?.status === 'completed' && (
                <Badge variant="outline" className="text-xs px-1 py-0 bg-green-100">
                  ✓
                </Badge>
              )}
            </div>

            {/* Completion animation overlay */}
            {userProgress?.status === 'completed' && (
              <div className="absolute inset-0 bg-green-200/20 rounded-lg animate-pulse" />
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
