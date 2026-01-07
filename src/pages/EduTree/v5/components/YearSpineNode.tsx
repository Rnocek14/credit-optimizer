import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronRight, ChevronDown, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { NodeSelectedSummary } from '../types/nodeProgress';

export interface YearSpineNodeData {
  label: string;
  year: number;
  isCollapsed: boolean;
  onClick?: () => void;
  creditsSummary?: {
    planned: number;
    required: number;
  };
  selectedSummary?: NodeSelectedSummary; // Year-level progress
  [key: string]: unknown;
}

interface YearSpineNodeProps {
  data: YearSpineNodeData;
  selected?: boolean;
}

export function YearSpineNode({ data, selected }: YearSpineNodeProps) {
  const { selectedSummary } = data;

  return (
    <div className="year-spine-node relative">
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{
          background: 'var(--primary)',
          border: '2px solid var(--background)',
          width: 10,
          height: 10,
        }}
      />

      <Card 
        className={cn(
          "px-6 py-4 rounded-lg border-2 transition-all duration-200",
          "bg-card hover:shadow-lg cursor-pointer",
          data.isCollapsed ? "opacity-60" : "opacity-100",
          selectedSummary?.isEmpty && "border-dashed opacity-70",
          selectedSummary?.isComplete && "border-primary shadow-md",
          !selectedSummary?.isEmpty && !selectedSummary?.isComplete && "border-secondary",
          selected && "ring-2 ring-primary ring-offset-2"
        )}
        onClick={() => {
          console.log('[YearSpineNode] Clicked:', data.label);
          data.onClick?.();
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-center gap-2 font-bold text-base hover:bg-primary/10"
          title="Click to browse year templates and modules"
        >
          {data.isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>Year {data.year}</span>
          {!data.isCollapsed && selectedSummary && !selectedSummary.isComplete && (
            <Badge variant="outline" className="text-xs ml-2">
              Templates Available
            </Badge>
          )}
        </Button>
        
        {/* Progress chip */}
        {!data.isCollapsed && selectedSummary && (
          <div className="mt-3 text-center space-y-2">
            <Badge 
              variant={selectedSummary.isComplete ? 'default' : selectedSummary.isEmpty ? 'outline' : 'secondary'}
              className="text-xs"
            >
              {selectedSummary.isComplete && <CheckCircle className="w-3 h-3 mr-1 inline" />}
              {selectedSummary.credits}/{selectedSummary.creditsRequired} cr
            </Badge>
            
            {!selectedSummary.isEmpty && (
              <div className="text-xs text-muted-foreground flex justify-center gap-3">
                <span>${selectedSummary.cost}</span>
                <span>{selectedSummary.weeks}w</span>
                <span>CRI {Math.round(selectedSummary.avgCri)}</span>
              </div>
            )}
            
            {/* Mini progress bar */}
            {selectedSummary.credits > 0 && (
              <Progress 
                value={Math.min(selectedSummary.progressPercent, 100)} 
                className="h-1 mt-2"
              />
            )}
          </div>
        )}
        
        {data.creditsSummary && !data.isCollapsed && !selectedSummary && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            {data.creditsSummary.planned} / {data.creditsSummary.required} credits planned
          </div>
        )}
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
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
