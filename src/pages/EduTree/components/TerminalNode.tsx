import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GraduationCap, Star } from 'lucide-react';
import { getTerminalHighlightClass } from '../utils/trackHighlighting';
import { BranchingHighlightState, getTerminalHighlightClass as getBranchingTerminalHighlightClass } from '../core/branchingHighlighting';

interface TerminalNodeData {
  label?: string;
  isEligible?: boolean;
  degreeType?: string;
  credits?: number;
  branchingHighlightState?: BranchingHighlightState;
}

export const TerminalNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const terminalData = data as TerminalNodeData & {
    displayTitle?: string;
    highlightedPrimaryNodes?: Set<string>;
    highlightedComparisonNodes?: Set<string>;
    isMultipathActive?: boolean;
  };
  const { label, isEligible = false, degreeType, credits, displayTitle, highlightedPrimaryNodes, highlightedComparisonNodes } = terminalData;
  
  // Determine highlight status - support single track highlighting
  const key = String(id);
  const inPrimary = !!highlightedPrimaryNodes?.has?.(key);
  const inCompare = !!highlightedComparisonNodes?.has?.(key);
  
  // Enhanced highlighting using branching state  
  const branchingState = terminalData.branchingHighlightState;
  
  let highlightClass = '';
  const isMultipathActive = terminalData.isMultipathActive;
  
  if (branchingState) {
    // Use new branching highlight system - it expects 2 params: nodeId and state
    highlightClass = getBranchingTerminalHighlightClass(id, branchingState);
  } else if (isMultipathActive && highlightedPrimaryNodes) {
    // Fallback to legacy system
    if (highlightedComparisonNodes) {
      // Dual track comparison mode
      if (inPrimary && inCompare) highlightClass = 'terminal--both';
      else if (inPrimary) highlightClass = 'terminal--primary';
      else if (inCompare) highlightClass = 'terminal--comparison';
      else highlightClass = 'terminal--dim'; 
    } else {
      // Single track mode
      highlightClass = inPrimary ? 'terminal--primary' : 'terminal--dim';
    }
  }

  // Debug logging for multipath highlighting
  if (process.env.NODE_ENV === 'development' && isMultipathActive) {
    console.log(`TerminalNode ${key}: inPrimary=${inPrimary}, inCompare=${inCompare}, class=${highlightClass}`);
  }

  return (
    <div
      className={`
        relative min-w-[200px] p-4 rounded-lg border-2 transition-all duration-200 terminal ${highlightClass}
        ${isEligible 
          ? 'bg-primary/10 border-primary shadow-lg shadow-primary/20' 
          : 'bg-secondary/50 border-secondary'
        }
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      data-testid="terminal-node"
      data-node-type="terminal"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      
      <div className="flex items-center gap-3">
        <div className={`
          p-2 rounded-full
          ${isEligible ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
        `}>
          {isEligible ? <Star className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {String(displayTitle || 'B.S. Software Engineering')}
          </h3>
          {degreeType && (
            <p className="text-sm text-muted-foreground">{String(degreeType)}</p>
          )}
          {credits && (
            <p className="text-xs text-muted-foreground mt-1">{String(credits)} credits</p>
          )}
        </div>
      </div>
      
      {isEligible && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
      )}
    </div>
  );
};