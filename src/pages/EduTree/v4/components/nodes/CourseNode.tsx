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
  const getSemesterEmoji = () => {
    if (data.semester === 'fall') return '🍂';
    if (data.semester === 'spring') return '🌸';
    return null;
  };
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

  const getCategoryColor = () => {
    switch(data.category) {
      case 'coreCS': return 'border-blue-500';
      case 'math': return 'border-green-500';
      case 'genEd': return 'border-gray-400';
      case 'elective': return 'border-yellow-500';
      case 'capstone': return 'border-purple-600';
      case 'transfer': return 'border-orange-500 border-dashed';
      default: return '';
    }
  };

  const getCategoryBadge = () => {
    if (!data.category) return null;
    
    const badges = {
      coreCS: { icon: '💻', label: 'Core' },
      math: { icon: '📐', label: 'Math' },
      genEd: { icon: '📚', label: 'Gen Ed' },
      elective: { icon: '🎯', label: 'Elective' },
      capstone: { icon: '🎓', label: 'Capstone' },
      transfer: { icon: '🔁', label: 'Transfer' },
    };
    
    const badge = badges[data.category];
    if (!badge) return null;
    
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        {badge.icon} {badge.label}
      </Badge>
    );
  };

  const getPolicyBadges = () => {
    if (!data.policyStatus) return null;

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {data.policyStatus.articulated && (
          <Badge 
            className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-700 dark:text-green-300"
            title="Guaranteed transfer via Florida articulation"
          >
            ✅ Articulated
          </Badge>
        )}
        {!data.policyStatus.transferable && (
          <Badge 
            className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-700 dark:text-red-300"
            title="Does not count toward transfer limit"
          >
            ⚠️ Non-Transfer
          </Badge>
        )}
        {data.selectedProviderId && (
          <Badge 
            className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-700 dark:text-blue-300"
            title="Selected from course marketplace"
          >
            🛒 Marketplace
          </Badge>
        )}
      </div>
    );
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
        relative
        rounded-lg border-2
        ${getStatusColor()}
        ${getCategoryColor()}
        transition-all duration-200
        min-w-[200px]
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        cursor-pointer hover-scale
        ${data.selectedProviderId ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${data.critical ? 'shadow-lg shadow-red-500/20' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Year badge - top left (for multi-year modules) */}
      {data.year && (
        <Badge 
          variant="outline" 
          className="absolute -top-2 -left-2 text-xs px-2 py-0.5 bg-background border-border shadow-sm z-10"
        >
          Y{data.year}
        </Badge>
      )}
      
      {/* Semester badge - top right */}
      {data.semester && (
        <Badge 
          variant="outline" 
          className="absolute -top-2 -right-2 text-xs px-2 py-0.5 bg-background border-border shadow-sm z-10"
        >
          {getSemesterEmoji()} {data.semester === 'fall' ? 'Fall' : 'Spring'}
        </Badge>
      )}
      
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
        
        {/* Credits + Category + Difficulty Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {data.credits && (
            <span className="text-xs font-medium opacity-90">{data.credits} cr</span>
          )}
          {getCategoryBadge()}
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
        
        {/* Policy Status Badges */}
        {getPolicyBadges()}
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
