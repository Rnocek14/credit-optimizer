import React from 'react';
import { Node, Edge } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface TrackData {
  name: string;
  blockIds: string[];
  missingSlugs?: string[];
}

interface TrackValidatorProps {
  nodes: Node[];
  edges: Edge[];
  primaryTrack?: TrackData;
  comparisonTrack?: TrackData;
  isVisible: boolean;
}

export function TrackValidator({ 
  nodes, 
  edges, 
  primaryTrack, 
  comparisonTrack, 
  isVisible 
}: TrackValidatorProps) {
  if (!isVisible || (!primaryTrack && !comparisonTrack)) {
    return null;
  }

  const validateTrack = (track: TrackData) => {
    const nodeIdSet = new Set(nodes.map(n => String(n.id)));
    const missingNodes = track.blockIds.filter(id => !nodeIdSet.has(id));
    
    // Check for missing edges between consecutive blocks
    const missingEdges: string[] = [];
    for (let i = 0; i < track.blockIds.length - 1; i++) {
      const edgeId = `e-${track.blockIds[i]}-${track.blockIds[i + 1]}`;
      const hasEdge = edges.some(e => String(e.id) === edgeId);
      if (!hasEdge) {
        missingEdges.push(edgeId);
      }
    }

    return { missingNodes, missingEdges };
  };

  const primaryValidation = primaryTrack ? validateTrack(primaryTrack) : null;
  const comparisonValidation = comparisonTrack ? validateTrack(comparisonTrack) : null;

  // Check for terminal degree node (simplified to avoid typing issues)
  const hasTerminalNode = nodes.some(n => n.type === 'terminal' || n.type === 'terminalNode');

  const hasIssues = 
    (primaryValidation && (primaryValidation.missingNodes.length > 0 || primaryValidation.missingEdges.length > 0)) ||
    (comparisonValidation && (comparisonValidation.missingNodes.length > 0 || comparisonValidation.missingEdges.length > 0)) ||
    !hasTerminalNode;

  if (!hasIssues) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Track Validation Passed
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          Track Validation Issues
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        {primaryValidation && (
          <div>
            <strong>{primaryTrack?.name} Track:</strong>
            {primaryValidation.missingNodes.length > 0 && (
              <div className="ml-2 text-yellow-700">
                Missing nodes: {primaryValidation.missingNodes.join(', ')}
              </div>
            )}
            {primaryValidation.missingEdges.length > 0 && (
              <div className="ml-2 text-yellow-700">
                Missing edges: {primaryValidation.missingEdges.length}
              </div>
            )}
            {primaryTrack?.missingSlugs && primaryTrack.missingSlugs.length > 0 && (
              <div className="ml-2 text-yellow-700">
                Missing slugs: {primaryTrack.missingSlugs.join(', ')}
              </div>
            )}
          </div>
        )}
        
        {comparisonValidation && (
          <div>
            <strong>{comparisonTrack?.name} Track:</strong>
            {comparisonValidation.missingNodes.length > 0 && (
              <div className="ml-2 text-yellow-700">
                Missing nodes: {comparisonValidation.missingNodes.join(', ')}
              </div>
            )}
            {comparisonValidation.missingEdges.length > 0 && (
              <div className="ml-2 text-yellow-700">
                Missing edges: {comparisonValidation.missingEdges.length}
              </div>
            )}
          </div>
        )}
        
        {!hasTerminalNode && (
          <div className="text-yellow-700">
            Missing terminal node for degree completion
          </div>
        )}
      </div>
    </div>
  );
}

// Development audit function
export function runTrackAudits(nodes: Node[], edges: Edge[]) {
  if (import.meta.env.DEV) {
    console.log('[Track Audit]', {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes: [...new Set(nodes.map(n => n.type))],
      sampleNodeIds: nodes.slice(0, 5).map(n => n.id)
    });
  }
}