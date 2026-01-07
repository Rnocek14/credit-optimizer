import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Clock, 
  DollarSign,
  Sparkles,
  Pin,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import type { NodeSelectedSummary } from '../types/nodeProgress';

export interface V5GraphNodeData extends Record<string, unknown> {
  courseId: string;
  title: string;
  moduleId: string;
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  workload_weekly_hours: number;
  cri_score: number;
  status: 'pinned' | 'auto-filled' | 'prereq';
  providerType?: 'university' | 'mooc' | 'bootcamp' | 'testing_center' | null;
  isInBasket: boolean;
  prereqCount?: number;
  unlocksCount?: number;
  selectedSummary?: NodeSelectedSummary; // Module-level progress
}

interface V5GraphNodeProps {
  data: V5GraphNodeData;
}

export function V5GraphNode({ data }: V5GraphNodeProps) {
  const {
    title,
    moduleId,
    credits,
    cost_usd,
    duration_weeks,
    workload_weekly_hours,
    cri_score,
    status,
    isInBasket,
    prereqCount = 0,
    selectedSummary,
  } = data;

  const getStatusColor = () => {
    if (!isInBasket) {
      return 'border-dashed border-muted bg-muted/5 opacity-75';
    }
    if (status === 'pinned') {
      return 'border-primary bg-primary/10 shadow-md';
    }
    return 'border-secondary bg-secondary/10 shadow-sm';
  };

  const getStatusIcon = () => {
    if (!isInBasket) {
      return <AlertCircle className="w-3 h-3 text-muted-foreground" />;
    }
    if (status === 'pinned') {
      return <Pin className="w-3 h-3 text-primary" />;
    }
    return <Sparkles className="w-3 h-3 text-secondary" />;
  };

  const getCRIColor = () => {
    if (cri_score >= 80) return 'text-green-600 dark:text-green-400';
    if (cri_score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  return (
    <div className="v5-graph-node relative">
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{
          background: 'var(--primary)',
          border: '2px solid var(--background)',
          width: 10,
          height: 10,
        }}
      />
      
      {/* Progress chip (top-right corner) */}
      {selectedSummary && (
        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
          <Badge 
            variant={
              selectedSummary.isComplete ? 'default' : 
              selectedSummary.isEmpty ? 'outline' : 
              'secondary'
            }
            className="text-xs px-2 py-0.5 shadow-sm"
          >
            {selectedSummary.isComplete && <CheckCircle className="w-3 h-3 mr-1 inline" />}
            {selectedSummary.credits}/{selectedSummary.creditsRequired} cr
          </Badge>
          
          {selectedSummary.templateSource && (
            <Badge 
              variant="outline" 
              className="text-xs px-1.5 py-0.5 shadow-sm" 
              title={`From template: ${selectedSummary.templateSource}`}
            >
              ✨
            </Badge>
          )}
        </div>
      )}
      
      <Card 
        className={cn(
          "w-64 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-lg hover:scale-105",
          getStatusColor(),
          selectedSummary?.isEmpty && "border-dashed opacity-75",
          selectedSummary?.isComplete && "border-primary border-2 shadow-lg",
        )}
      >
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <Badge 
                variant={isInBasket ? 'default' : 'outline'} 
                className="text-xs px-1.5 py-0"
              >
                {moduleId}
              </Badge>
            </div>
            {prereqCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {prereqCount} prereqs
              </Badge>
            )}
          </div>
          
          {/* Title */}
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">
            {title}
          </h3>
          
          {/* Metrics Row */}
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <BookOpen className="w-3 h-3" />
              <span>{credits} cr</span>
            </div>
            
            {duration_weeks && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{duration_weeks}w</span>
              </div>
            )}
            
            {cost_usd !== null && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>${cost_usd}</span>
              </div>
            )}
          </div>
          
          {/* CRI Score */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              CRI: <span className={`font-medium ${getCRIColor()}`}>{cri_score}</span>
            </span>
            {workload_weekly_hours > 0 && (
              <span className="text-muted-foreground">
                {workload_weekly_hours}h/wk
              </span>
            )}
          </div>
          
          {/* Prerequisite indicator */}
          {!isInBasket && (
            <div className="mt-2 pt-2 border-t border-dashed border-muted">
              <p className="text-xs text-muted-foreground italic">
                Unmet prerequisite
              </p>
            </div>
          )}
          
          {/* Secondary info line (when module has selections) */}
          {selectedSummary && !selectedSummary.isEmpty && (
            <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground flex justify-between">
              <span>${selectedSummary.cost}</span>
              <span>{selectedSummary.weeks}w</span>
              <span>CRI {Math.round(selectedSummary.avgCri)}</span>
            </div>
          )}
        </CardContent>
        
        {/* Progress bar (bottom of card) */}
        {selectedSummary && selectedSummary.credits > 0 && (
          <div className="px-3 pb-2">
            <Progress 
              value={Math.min(selectedSummary.progressPercent, 100)} 
              className="h-1"
            />
          </div>
        )}
      </Card>

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{
          background: 'var(--primary)',
          border: '2px solid var(--background)',
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
}
