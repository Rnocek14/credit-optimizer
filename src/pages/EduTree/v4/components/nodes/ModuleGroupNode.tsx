/**
 * ModuleGroupNode - ReactFlow parent node for sub-requirements
 * Contains child course nodes and provides visual grouping hierarchy
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleGroupNodeData {
  label: string;
  moduleId: string;
  icon?: string;
  description?: string;
  level?: 'bucket' | 'sequence';
  courseCount?: number;
  creditsEarned?: number;
  creditsRequired?: number;
  onClick?: () => void;
}

interface ModuleGroupNodeProps {
  data: ModuleGroupNodeData;
}

export function ModuleGroupNode({ data }: ModuleGroupNodeProps) {
  const { 
    label, 
    icon, 
    description, 
    level = 'sequence',
    courseCount = 0,
    creditsEarned = 0,
    creditsRequired = 0,
    onClick
  } = data;
  
  const isBucket = level === 'bucket';
  const completionPercent = creditsRequired > 0
    ? (creditsEarned / creditsRequired) * 100
    : 0;
  
  // Radial progress size
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;
  
  return (
    <div 
      data-type="moduleGroup"
      className={cn(
        "group relative cursor-pointer backdrop-blur-sm border-2 rounded-2xl shadow-lg transition-all duration-300",
        "hover:shadow-2xl hover:scale-[1.03] hover:border-primary/60 p-6",
        isBucket 
          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/40" 
          : "bg-card/90 border-border hover:bg-card"
      )}
      onClick={onClick}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Header with Icon and Title */}
      <div className="flex items-start gap-4 mb-5">
        {icon && (
          <span className={cn(
            "flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
            isBucket ? "text-6xl" : "text-5xl"
          )}>
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-bold leading-tight text-foreground",
            isBucket ? "text-2xl" : "text-xl"
          )}>
            {label}
          </h3>
        </div>
        
        {/* Radial Progress Indicator */}
        <div className="flex-shrink-0 relative">
          <svg width="80" height="80" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">
              {Math.round(completionPercent)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Primary Stats - Always Visible */}
      <div className="flex gap-3 mb-4">
        <Badge variant="outline" className="text-base px-3 py-1">
          📚 {courseCount} {courseCount === 1 ? 'course' : 'courses'}
        </Badge>
        <Badge 
          variant={completionPercent === 100 ? 'default' : 'secondary'} 
          className="text-base px-3 py-1"
        >
          {creditsEarned} / {creditsRequired} credits
        </Badge>
      </div>
      
      {/* Secondary Info - Shows on Hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mb-3">
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      
      {/* Click CTA */}
      <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
        <span className="font-medium">Click to manage courses</span>
        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </div>
      
      {/* ReactFlow handles (invisible) */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
