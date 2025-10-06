/**
 * EmptyYear Node - Ghost node for skipped academic phases
 * Shows deliberate gap when programs skip phases (e.g., IT skips Specialization)
 */

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ArrowRight, Clock, GraduationCap, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface EmptyYearNodeData {
  year: number;
  programId: string;
  reason: 'accelerated' | 'no-track' | 'direct-progression';
  nextYear?: number;
  programName?: string;
}

export const EmptyYearNode: React.FC<NodeProps> = ({ data }) => {
  const { year, programId, reason, nextYear, programName } = (data as unknown) as EmptyYearNodeData;
  
  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'accelerated': return 'Accelerated';
      case 'no-track': return 'No Track Year';
      case 'direct-progression': return 'Direct Progression';
      default: return 'Skip Year';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'accelerated': return <Clock className="w-4 h-4" />;
      case 'no-track': return <GraduationCap className="w-4 h-4" />;
      case 'direct-progression': return <ArrowRight className="w-4 h-4" />;
      default: return <ArrowRight className="w-4 h-4" />;
    }
  };

  const getMessage = () => {
    if (programId === 'bs_it' && year === 3) {
      return 'Skips Specialization → proceeds to Capstone';
    }
    return 'No required coursework for this phase';
  };

  const getSubMessage = () => {
    if (nextYear) {
      return `Continues to Phase ${nextYear}`;
    }
    return 'This program skips this phase';
  };

  const getTooltipMessage = () => {
    if (programId === 'bs_it' && year === 3) {
      return 'Accelerated path: this program skips Specialization and proceeds directly to Capstone';
    }
    return 'This program has an accelerated timeline that skips this academic phase';
  };

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Target handle for incoming edges */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-muted-foreground/60 border-2 border-background"
          style={{ left: -6 }}
        />

        <Card className="w-[280px] border-dashed border-muted-foreground/40 bg-muted/30 opacity-75 hover:opacity-90 transition-opacity duration-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              {getReasonIcon(reason)}
              <Badge variant="outline" className="text-xs border-dashed">
                Phase {year}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getReasonLabel(reason)}
              </Badge>
              
              {/* Tooltip info icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors">
                    <Info className="w-3 h-3 text-muted-foreground/60" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">{getTooltipMessage()}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {getMessage()}
              </div>
              <div className="text-xs text-muted-foreground/80">
                {getSubMessage()}
              </div>
            </div>

            {/* Continuation arrow visual */}
            <div className="flex items-center justify-center mt-3 text-muted-foreground/60">
              <div className="w-8 h-px bg-current opacity-50"></div>
              <ArrowRight className="w-3 h-3 mx-2" />
              <div className="w-8 h-px bg-current opacity-50"></div>
            </div>
          </CardContent>
        </Card>

        {/* Source handle for outgoing edges */}
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-muted-foreground/60 border-2 border-background"
          style={{ right: -6 }}
        />
      </div>
    </TooltipProvider>
  );
};