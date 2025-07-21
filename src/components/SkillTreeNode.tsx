
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
}

const categoryColors = {
  'Technical': 'bg-blue-100 border-blue-300 text-blue-800',
  'Soft Skills': 'bg-green-100 border-green-300 text-green-800',
  'Career': 'bg-purple-100 border-purple-300 text-purple-800',
  'Tools': 'bg-orange-100 border-orange-300 text-orange-800',
  'default': 'bg-gray-100 border-gray-300 text-gray-800'
};

const statusColors = {
  'locked': 'opacity-50 cursor-not-allowed',
  'available': 'hover:shadow-md cursor-pointer',
  'in_progress': 'ring-2 ring-blue-400 cursor-pointer',
  'completed': 'ring-2 ring-green-400 cursor-pointer'
};

export const SkillTreeNode: React.FC<SkillTreeNodeProps> = ({
  skill,
  userProgress,
  position,
  onClick,
  isRecommended = false,
  size = 'medium'
}) => {
  const categoryColor = categoryColors[skill.category as keyof typeof categoryColors] || categoryColors.default;
  const statusColor = statusColors[userProgress?.status || 'available'];
  const progressPercent = userProgress ? (userProgress.xp_earned / skill.xp_value) * 100 : 0;
  
  const sizeClasses = {
    small: 'w-20 h-16 text-xs',
    medium: 'w-24 h-20 text-sm',
    large: 'w-32 h-24 text-base'
  };

  return (
    <div
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2 
        ${sizeClasses[size]} 
        ${categoryColor} 
        ${statusColor}
        border-2 rounded-lg p-2 transition-all duration-200
        flex flex-col items-center justify-center
        ${isRecommended ? 'animate-pulse ring-2 ring-yellow-400' : ''}
      `}
      style={{ left: position.x, top: position.y }}
      onClick={userProgress?.status !== 'locked' ? onClick : undefined}
    >
      <div className="font-semibold text-center leading-tight mb-1 line-clamp-2">
        {skill.name}
      </div>
      
      {userProgress && (
        <div className="w-full">
          <Progress 
            value={progressPercent} 
            className="h-1 mb-1"
          />
          <div className="text-xs text-center">
            {userProgress.xp_earned}/{skill.xp_value} XP
          </div>
        </div>
      )}
      
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
    </div>
  );
};
