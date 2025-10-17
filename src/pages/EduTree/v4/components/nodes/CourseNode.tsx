/**
 * CourseNode - Rich metadata display for course bubbles
 * Displays status, credits, difficulty, skills, and provider selection state
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNodeData } from '../../types/v4';
import { Badge } from '@/components/ui/badge';
import { Award, Clock } from 'lucide-react';

interface CourseNodeProps {
  data: PlanNodeData;
  selected?: boolean;
}

export function CourseNode({ data, selected }: CourseNodeProps) {
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed':
        return 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300';
      case 'in-progress':
        return 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
      case 'planned':
        return 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getDifficultyBadge = () => {
    if (!data.difficulty) return null;
    
    const variants = {
      beginner: { color: 'bg-green-500/20 text-green-700 dark:text-green-300', label: 'Beginner' },
      intermediate: { color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300', label: 'Intermediate' },
      advanced: { color: 'bg-red-500/20 text-red-700 dark:text-red-300', label: 'Advanced' },
    };
    
    const variant = variants[data.difficulty];
    return (
      <Badge className={`text-[10px] px-1.5 py-0 ${variant.color}`}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <div 
      data-type={data.type || 'course'}
      onClick={() => {
        console.log('[CourseNode] Clicked:', data.label);
        data.onClick?.();
      }}
      className={`
        rounded-lg border-2
        ${getStatusColor()}
        transition-all duration-200
        min-w-[200px]
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        cursor-pointer hover-scale
        ${data.selectedProviderId ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${data.critical ? 'shadow-lg shadow-red-500/20' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Header: Title + Status Badges */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm leading-tight flex-1">
            {data.label}
          </div>
          {data.selectedProviderId && (
            <Award className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" aria-label="Custom provider selected" />
          )}
        </div>
        
        {/* Credits + Difficulty Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {data.credits && (
            <span className="text-xs font-medium opacity-90">{data.credits} cr</span>
          )}
          {getDifficultyBadge()}
          {data.transferable && (
            <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-700 dark:text-purple-300">
              Transfer
            </Badge>
          )}
          {data.critical && (
            <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-700 dark:text-red-300">
              Critical
            </Badge>
          )}
        </div>
      </div>

      {/* Metadata Footer: Skills + Time */}
      {(data.skillTags || data.estimatedHours) && (
        <div className="px-3 py-2 border-t border-current/10 space-y-1.5">
          {/* Skill Tags */}
          {data.skillTags && data.skillTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.skillTags.slice(0, 3).map((skill, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-[9px] px-1 py-0 leading-tight"
                >
                  {skill}
                </Badge>
              ))}
              {data.skillTags.length > 3 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  +{data.skillTags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Estimated Hours */}
          {data.estimatedHours && (
            <div className="flex items-center gap-1 text-[10px] opacity-75">
              <Clock className="h-3 w-3" />
              <span>{data.estimatedHours}h</span>
            </div>
          )}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
